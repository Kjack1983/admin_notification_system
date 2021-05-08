"use strict";

const parameters = require('../parameters');
const moment = require('moment');

/**
 * Validate client notification data
 *
 * Ensure correct format of messages before attemting
 * to send notification.
 *
 * @param {object} data Data containing notification filters and message.
 * @return {object}
 */
const clientMessageValidation = (data) => {

	// Test filters
	if (!data[parameters.admin.FILTERS]) {
		return {
			error: 'Filters are not defined'
		}
	};

	// Test messages
	if (!data[parameters.admin.MESSAGES]) {
		return {
			error: 'Messages are not defined'
		}
	};

	let messageData = data[parameters.admin.MESSAGES];

	// Test alert messages
	if (!messageData[parameters.messageChannels.ALERT]) {
		return {
			error: 'Bad data format recieved.'
		}
	}

	// Test push messages
	if (!messageData[parameters.messageChannels.PUSH]) {
		return {
			error: 'Bad data format recieved.'
		}
	}

	// Test mobile messages
	if (!messageData[parameters.messageChannels.MOBILES]) {
		return {
			error: 'Bad data format recieved.'
		}
	}

	// @todo move to constant / setting
	const defaultInstrument = 'gbp-usd';

	/**
	 * Alert: Inject action if not provided
	 */
	Object.keys(messageData[parameters.messageChannels.ALERT].text).map(lang => {
		if (messageData[parameters.messageChannels.ALERT].text[lang] !== '' && messageData[parameters.messageChannels.ALERT].action[lang] === '') {
			messageData[parameters.messageChannels.ALERT].action[lang] = (lang === 'en' ? '/eu/trade/' : '/eu/' + lang + '/trade/') + defaultInstrument + '/';
		}
	});

	/**
	 * Push: Inject action if not provided
	 */
	Object.keys(messageData[parameters.messageChannels.PUSH].text).map(lang => {
		if (messageData[parameters.messageChannels.PUSH].text[lang] !== '' && messageData[parameters.messageChannels.PUSH].action[lang] === '') {
			messageData[parameters.messageChannels.PUSH].action[lang] = (lang === 'en' ? '/eu/trade/' : '/eu/' + lang + '/trade/') + defaultInstrument + '/';
		}
	});

	// Combine and return
	return { ...data, ...{ messages: messageData } };
}

/**
 * Direct message format:
 * 
 *  "title": "Message title",
 *	"message": "Message",
 *	"data": {
 *		"messageType": "2",
 *		"messageData": {
 *			"screen": "1",
 *			"param": 42
 *		}
 *	}
 */

module.exports = (directMessaging, usersManagement, adminManagement, messagingSettings, messageHandler) => {

	// Set Scheduling Queue
	directMessaging.addRedisQueue({
		name: 'schedulingQueue',
		// @note - Handler needs to return promise to handle failures
		handler: async (job) => {
			let { id, data } = job;

			let {title, timezone, datetime } = data.scheduleData;

			console.log(`Processing Scheduled Notification: ${title}`);

			// Validate message format
			let message = clientMessageValidation({ ...data.notificationData });

			// Exit on invalid format
			if ('error' in message) {
				throw new Error(`Scheduled Notification Error: ${message.error}`);
			}

			// Get message recipients
			const recipients = usersManagement.usersFiltering.getUsersList(message);

			// Inject type and server url
			message = {
				...message,
				[parameters.tracking.TRIGGER_TYPE]: 'Announcements',
				[parameters.tracking.PUSH_SERVER_URL]: data.host,
			};

			// Send notification
			messageHandler.send(message, recipients.userInfo, 'scheduled');
		}
	});

	/**
	 * Removes job from the queue whether is 
	 * (completed, delayed or active).
	 * 
	 * @param JOB_ID
	 */
	directMessaging.addHttpInEvent({
		name: 'scheduledRemove',
		data: [
			parameters.schedule.JOB_ID
		],
		handler: async (req, res, data) => {

			if (!req.body) {
				res.send('Bad request format');
				return false;
			}

			console.log('------SCHEDULE REMOVE------------');

			const redisQueue = directMessaging.getRedisQueue('schedulingQueue');

			const job = await redisQueue.getJob(data.ID);

			if (job) {

				// Remove from the queue
				job.remove();

				// return response.
				return res.status(200).json({
					status: "success",
					message: `jobID: ${data.ID} was successfully removed.`
				});

			} else {
				return res.status(404).send('No job id found');
			}

		},
		method: 'post',
		url: '/live/schedule-remove'
	});

	/**
	 * Fetch Scheduled list of messages queue
	 */
	directMessaging.addHttpInEvent({
		name: 'scheduledList',
		handler: async (req, res, data) => {

			if (!req.body) {
				res.send('Bad request format');
				return false;
			}

			// Fetch statuses and filter for lists with items (fetching both delayed and completed).
			let jobs = await directMessaging.getQueueJobList('schedulingQueue');

			// Return jobs.
			return res.status(200).json(jobs);
		},
		method: 'post',
		url: '/live/schedule-list'
	});

	/**
	 * Calculate remaining between admin and current time
	 *
	 * @param {string} datetime
	 * @return {void}
	 */
	const calcScheduleDelay = (datetime) => {
		const scheduledDate = moment(datetime).utc();
		const currentDate = moment().utc();
		return scheduledDate.diff(currentDate);
	}

	/**
	 * Create a scheduled cron job.
	 *
	 * @param {object} parameters.schedule.SCHEDULE_MESSAGE
	 * @param {object} parameters.admin.FILTERS
	 * @param {object} parameters.admin.MESSAGES
	 */
	directMessaging.addHttpInEvent({
		name: 'scheduledSend',
		data: [
			parameters.schedule.SCHEDULE_MESSAGE,
			parameters.admin.FILTERS,
			parameters.admin.MESSAGES
		],
		handler: async (req, res, data) => {

			if (!req.body) {
				res.send('Bad request format');
				return false;
			}

			// destructure username to attach to the queue job.
			let { host, adminUsername, scheduled: { datetime }  } = data;

			// calculate remaining time.
			const delay = calcScheduleDelay(datetime);

			if (delay > 0) {
				const options = {
					delay: delay,
					attempts: 1
				};

				const redisQueue = directMessaging.getRedisQueue('schedulingQueue');

				// Add message to redis queue.
				redisQueue.add({
					scheduleData: data.scheduled,
					host,
					username: adminUsername,
					notificationData: {
						[parameters.admin.MESSAGES]: req.body[parameters.admin.MESSAGES], 
						[parameters.admin.FILTERS]: req.body[parameters.admin.FILTERS], 
					}
				}, options).then(job => {

					return res.status(200).json({
						status: 'success',
						message: `new job was added to the queue seccessfully jobID: ${job.id}`
					});

				}).catch(err => {
					return res.status(500).json({
						status: 'failed',
						error: err
					});
				});

			} else {
				return res.status(400).json({
					status: 'failed',
					message: 'Please provide a valid time'
				})
			}
		},
		method: 'post',
		url: '/live/schedule-trigger'
	});

	directMessaging.addHttpInEvent({
		name: 'messageSend',
		data: [
			parameters.admin.FILTERS,
			parameters.admin.MESSAGES
		],
		handler: function (req, res, data) {

			if (!req.body) {
				res.send('Bad request format');
				return false;
			}

			// Validate message format
			let message = clientMessageValidation({ ...req.body });

			// Exit on invalid format
			if ('error' in message) {
				res.send(message.error);
			}

			// Get message recipients
			const recipients = usersManagement.usersFiltering.getUsersList(message);

			// Inject type and server url
			message = {
				...message,
				[parameters.tracking.TRIGGER_TYPE]: 'Announcements',
				[parameters.tracking.PUSH_SERVER_URL]: data.host,
			};

			// Send notification
			messageHandler.send(message, recipients.userInfo, 'direct');

			res.send('ok');
		},
		method: 'post',
		url: '/live/client-trigger'
	});
}