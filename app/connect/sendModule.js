"use strict";

// Require libs
const _ = require('lodash');
const R = require('ramda');
const moment = require('moment-timezone');
const async = require('async');
const Pushy = require('pushy');
const mongoose = require('mongoose');

// Base
const config = require('../config');
const parameters = require('../parameters');
const uidGenerator = require('../uidGenerator');

// Push
const { firebaseFormat, firebaseBatchSend, firebaseParseDeletable } = require('../../lib/firebase/firebase-client');
const { pushyFormat, pushyBatchSend, pushyParseDeletable } = require('../../lib/pushy/pushy-client');

// Db
const reportModels = require('../../models/sendReport');

// Init DB reporting
const SendReport = reportModels.SendReport;
const RecipientSnapshot = reportModels.RecipientSnapshot;

// Set UTC timezone and event date
moment().tz("UTC").format();
const setEventDate = () => moment.utc().format('lll');

// Set updatable variables
let publishToRedis;
let messagingSettings;

// Pushy options
let pushyOptions = {
    notification: {
        badge: 1,
        priority: 'high',
		collapse_key: 'Market Alert',
    },
};

/**
 * Preparing mobile pushy message
 *
 * @param {object} data Message data object.
 * @param {string} language target Language for message.
 * @return {object}
 */
const formatPushyMobileMessage = (data, language) => {

	const messages = data[parameters.admin.MESSAGES];
	const message = messages[parameters.messageChannels.MOBILES];

	if (message.title[language] === '' || message.text[language] === '') return {};

	pushyOptions.notification.collapse_key = message.title[language];
	
	return {
		title: message.title[language],
		message: message.text[language],
		data: {
			title: message.title[language],
			message: message.text[language],
			messageType: "2",
			messageData: message.action[language],
			pushType: message.pushType
		}	
	};
}

// Assign device token per language
const recipientToTokenList = (recipients) => {

	return recipients.reduce((result, device) => {

		const language = device[parameters.user.LANGUAGE];
		const token = device[parameters.messageChannels.TOKEN];

		if (language && token) {
			if (result[language]) {
				result[language].push(token);
			}
			else {
				result[language] = [token];
			}
		}

		return result;
	}, {});
};

/*
 * Making sure we receive data in the correct format
 *
 * var message = {
 *		push: {
 *			title: {
 *				en: '',
 *				ar: '',
 *				zh-hans: '',
 * 				pl: '' 	
 *			},
 *			text: {...},
 *			action: {...}
 *		},
 *		alert: {
 *			title: {...},
 *			text: {...},
 *			action: {...}
 *		},
 *		mobile: {
 *			title: {...},
 *			text: {...},
 *			action: {...}
 *		}
 *	};
 * 
 * This message comes directly from the admin panel. 
 */
const validateMessages = messages => {
	
	if (!messages.push) return false;
	if (!messages.alert) return false;
	if (!messages.mobile) return false;

	let validationSuccess = true;

	// Set languages
	let languages = messagingSettings.getLanguages();
	let browserLanguages = languages.browserLanguages.map(lang => lang.code);
	let mobileLanguages = languages.mobileLanguages.map(lang => lang.code);

	// Params which messages should contain
	let messageParams = ['title', 'text', 'action'];

	messageParams.map(param => {

		// Test Push Params
		if (!messages.push[param]) {
			validationSuccess = false;
			return;
		};

		// Test Push Languages
		Object.keys(messages.push[param]).map(key => {
			if (key && browserLanguages.indexOf(key) === -1) {
				validationSuccess = false;
			}
		});

		// Test Alert Params
		if (!messages.alert[param]) {
			validationSuccess = false;
			return;
		};

		// Test Alert Languages
		Object.keys(messages.alert[param]).map(key => {
			if (key && browserLanguages.indexOf(key) === -1) {
				validationSuccess = false;
			}
		});

		// Test Mobile Params
		if (!messages.mobile[param]) {
			validationSuccess = false;
			return;
		};

		// Test Mobile Languages
		Object.keys(messages.mobile[param]).map(key => {
			if(key && mobileLanguages.indexOf(key) === -1) {
				validationSuccess = false;
			}
		});
	})

	if (!validationSuccess) return false;

	return true;
}

/*
 * Getting the list or direct message notifications receivers
 *  
 *	recipients = {
 *		alerts: [array of user with sockets ],
 *		push: [array of push registrations],
 *		mobiles: [array of mobile registrations],
 *		pushyMobiles: [array of pushy mobile registrations],
 *		iosMobiles: [array of ios mobile registrations],
 * 		androidMobiles: [array of android mobile registrations]		
 *	}
 */
const validateRecipients = recipients => {
	if (!recipients) return false;
	if (!recipients.alerts) return false;
	if (!recipients.push) return false;
	if (!recipients.pushyMobiles) return false;
	if (!recipients.iosMobiles) return false;
	if (!recipients.androidMobiles) return false;
	return true;
};

/**
 * Preparing the alert message 
 *
 * @param {object} data Message data object.
 * @param {string} language target Language for message.
 * @return {object}
 */
const formatAlertMessage = (data, language) => {

	const { messages, ...params } = data;
	const message = messages[parameters.messageChannels.ALERT];

	if (message.text[language] === '') return {};

	return {
		message: message.text[language],
		url: message.action[language],
		title: message.title[language] || '',
		...params
	};
};

/**
 * Send Socket Notification
 *
 * Takes notification messages object and delivers via
 * web socket.
 *
 * @param {object} notifications Notification message data.
 * @param {array} recipients Array of recipient objects to use.
 * @return {void}
 */
const sendSocketNotification = (notification, recipients = []) => {

	const socketMessages = notification.messages[parameters.messageChannels.ALERT];

	Object.keys(socketMessages.text).map(language => {

		const message = formatAlertMessage(notification, language);

		if (Object.keys(message).length) {

			recipients.map(user => {

				// @todo - check user language before send

				const id = usersManagement.getUserId(user);

				if (id) {

					publishToRedis('sendSocketMessage', {
						room: language + '-' + id,
						eventName: 'client-notification',
						data: message,
						action: message.url
					});
				}
			});
		}
	});
};

/**
 * Send Push Notifications
 *
 * Takes notification messages object, recipients, type and sender
 * and forwards to relevant sending service.
 *
 * @param {object} notification Formatted notification data.
 * @param {object} recipients Recipients to receive notification (tokens per language).
 * @param {string} type Push type (push|ios|android).
 * @param {string} sender Sending service to use, default firebase.
 * @return {Promise<object>} Result object from sending service.
 */
const sendPushNotification = (notification, recipients, type, sender = 'firebase') => {
	return new Promise((resolve, reject) => {

		// Exit if missing messages
		if (!notification || !notification.messages) {
			reject('Messaging Error: Missing messages object.');
			return;
		}

		// Exit if missing recipients
		if (!recipients || recipients.length === 0) {
			reject('Messaging Error: Missing recipients object.');
			return;
		}

		// Exit if missing type
		if (!type) {
			reject('Messaging Error: Missing type parameter.');
			return;
		}

		// Exit if invalid messages
		if (!validateMessages(notification.messages)) {
			reject('Messaging Error: Invalid messages object.');
			return;
		}

		const messageType = (type === 'push' ? 'push' : 'mobile');

		let messageContent = {};
		let messageTokens = {};

		// Assign message content and add language key for tokens
		Object.keys(notification.messages[messageType].text).map(language => {
			if (recipients[language] && recipients[language].length) {

				let message = {};

				if (sender === 'firebase') {
					message = firebaseFormat(notification, language, type);
				}
				else if (sender === 'pushy') {
					message = pushyFormat(notification, language);
				}

				if (Object.keys(message).length) {
					messageContent[language] = message;
					messageTokens[language] = recipients[language];
				}
			}
		});

		// Exit if message building injects no sendable content
		if (!Object.keys(messageContent).length) {
			reject('Messaging Error: Notification content empty');
			return;
		}

		// Set info for batch send
		const messageInfo = {
			type: type,
			messageID: notification.triggerID,
			messageType: messageType,
			messages: {
				alert: notification.messages.alert,
				push: notification.messages.push,
				mobile: notification.messages.mobile
			}
		};

		// Batch send via firebase
		if (sender === 'firebase') {
			firebaseBatchSend(messageContent, messageTokens, 500, messageInfo).then(report => {

				// Remove Invalid Tokens
				removeInvalid(report.invalid, report.info.messageType);

				// Resolve with report
				resolve(report);

			}).catch(err => {
				reject(`Messaging Error: Failed sending for ${type} via Firebase`, err);
			});
		}

		// Batch send via pushy
		else if (sender === 'pushy') {
			pushyBatchSend(messageContent, messageTokens, 500, messageInfo).then(report => {

				// Remove Invalid Tokens
				removeInvalid(report.invalid, report.info.messageType, 'pushy');

				// Resolve with report
				resolve(report);

			}).catch(err => {
				reject(`Messaging Error: Failed sending for ${type} via Pushy`, err);
			});
		}
	});
};

/**
 * Remove invalid tokens from the system
 *
 * This will identify invalid tokens from a sent message
 * and trigger a distributed call to delete devices.
 *
 * @param {object} tokens Token/Error object to parse for deletable tokens.
 * @param {string} type Token type to send with remove tokens call.
 * @param {string} sender Sending service parse tokens with, default firebase.
 * @return {void}
 */
const removeInvalid = (tokens, type = 'mobile', sender = 'firebase') => {

	if (tokens && Object.keys(tokens).length) {

		let deletableTokens = [];

		// Find deletable tokens for firebase
		if (sender === 'firebase') {
			deletableTokens = firebaseParseDeletable(tokens);
		}
		// Find deletable tokens for firebase
		else if (sender === 'pushy') {
			deletableTokens = pushyParseDeletable(tokens);
		}

		if (deletableTokens.length) {

			// Split deletables to groups before sending via redis
			const splitDeletables = R.splitEvery(500, deletableTokens).map(group => {
				return (callback) => {

					const tokens = [...group];

					// Call clean tokens over redis
					publishToRedis('removeTokens', {
						tokens: tokens,
						type: type
					});

					callback(null, tokens);

					return null;
				}
			});

			// Send all in series ignoring errors with reflect
			async.series(async.reflectAll(splitDeletables), (err, result) => {

				if (err) {
					console.error('Messaging Error: Send tokens to clean', err);
				}

				if (result.length) {

					const deleteTokensTotal = result.reduce((total, curr) => {
						return total + curr.length;
					}, 0);

					//console.info(`Messaging: Sent delete request for ${deleteTokensTotal} invalid tokens`);
				}
			});
		}
	}
};

/*
 * SendModule sends direct messages to all available devices, and to all 
 * the users provided in the recipients list. It is the responsibility of whoever is calling
 * the module to preapare the list and messages in the correct format. 
 *
 * Messages are organized by message type (alert, mobile, push), and for each message 
 * type we provide title, text and action. Action holds screen number and any other 
 * parameters that is needed by the app. 
 *
 * Recipients list provides list of users for each message type, and for each mobile
 * delivery method. 
 */
module.exports = (connect, usersManagement, _messagingSettings) => {

	// Set external redis conection
	publishToRedis = connect.publishRedis;

	// Set external messaging settings
	messagingSettings = _messagingSettings;

	/**
	 * Save a send report to mongo
	 *
	 * Do this on local DB first, then switch to external for report (cache servers)
	 */
	const saveSendReport = (notification = {}, recipientList = {}, type = 'unknown') => {
		return new Promise((resolve, reject) => {

			let startTime = Date.now();

			const messageId = notification.triggerID;
			const user = notification.adminUsername || 'auto';

			const {mode, ...filters} = notification.filters;
			const recipients = {
				alert: [...recipientList.alerts],
				push: [...recipientList.push],
				mobile: [...recipientList.mobiles]
			};

			const reportData = new SendReport({
				_id: new mongoose.Types.ObjectId(),
				messageId: messageId,
				username: user,
				time: notification.triggerRecievedTime,
				type: type,
				messages: notification.messages,
				filters: filters,
				recipients: [],
			});

			reportData.save().then(report => {

				let totalRecipients = Object.keys(recipients).reduce((acc, curr) => {
					return acc + recipients[curr].length;
				}, 0);

				let recipientGroups = [];
				let recipientGroup = [];

				Object.keys(recipients).forEach(type => {
					recipients[type].forEach(recipient => {

						// Insert recipient to group
						recipientGroup.push({
							reportId: report._id,
							messageId: messageId,
							type: type,
							status: {
								state: 'pending',
								error: null,
							},
							interactions: [],
							data: recipient,
						});

						// Insert group to groups
						if (recipientGroup.length === 1000) {
							recipientGroups.push([...recipientGroup]);
							recipientGroup = [];
						}
					});
				});

				// Insert last group to groups
				if (recipientGroup.length > 0) {
					recipientGroups.push([...recipientGroup]);
					recipientGroup = [];
				}

				// Async save recipient groups
				async.series(recipientGroups.map(group => {
					return (callback) => {
						RecipientSnapshot.collection.insertMany([...group]).then(result => {
							callback(null, result);
						}).catch(err => {
							callback(err);
						});
					};
				}), (err, result) => {

					if (err) {
						reject({
							id: messageId,
							error: err
						});
						return;
					}

					let totalTime = (Date.now() - startTime) / 1000;

					resolve({
						id: messageId,
						total: totalRecipients,
						time: totalTime,
						report: report
					});
				});

			}).catch(err => {
				reject({
					id: messageId,
					error: err
				});
			});
		});
	};

	const getReportStats = (messageID, messages) => {
		return new Promise((resolve, reject) => {

			let states = {};

			Object.keys(messages).forEach(stateType => {
				let curr = messages[stateType];
				if (curr.text) {
					Object.keys(curr.text).forEach(lang => {
						if (curr.text[lang]) {
							states[stateType] = Object.values(parameters.state).reduce((acc, curr) => {
								acc[curr] = 0;
								return acc;
							}, {});
						}
					});
				}
			});

			RecipientSnapshot.find({
				messageId: messageID
			}, {
				type: true,
				status: true,
				interactions: true,
			}).lean().cursor().on('data', (recipient) => {

				const type = recipient.type;
				const state = recipient.status.state;

				// Aggregate recipient states
				if (type && states.hasOwnProperty(type)) {
					states[type][state] = (states[type][state] + 1);
				}

			}).on('end', () => {
				resolve(states);
			}).on('error', (err) => {
				reject(err);
			});
		});
	};

	const updateSendReport = (info, validTokens, invalidTokens) => {
		return new Promise((resolve, reject) => {

			const { messageID, messageType, type, messages } = info;

			if (!messageID) {
				reject(new Error('Missing messageID'));
				return null;
			}

			let startTime = Date.now();
			let totalTime;

			getReportStats(messageID, messages).then(states => {

				let io = connect.getSocketsConnection();

				let sentRecipients = R.splitEvery(1000, validTokens).map(group => {
					return (callback) => {

						const tokens = [...group];
						const tokenAmount = tokens.length;
						const type = messageType;

						RecipientSnapshot.collection.updateMany({
							messageId: messageID,
							'data.token': {
								$in: tokens
							}
						}, {
							$set: {
								'status.state': parameters.state.SENT,
							}
						}).then(result => {

							states[type][parameters.state.PENDING] -= tokenAmount;
							states[type][parameters.state.SENT] += tokenAmount;

							io.emit('updateRecipientStats', {data: {
								reportId: messageID,
								states: states
							}});

							callback(null, result);
						}).catch(err => {
							callback(err);
						});

						return null;
					}
				});

				let failRecipients = R.splitEvery(1000, invalidTokens).map(group => {
					return (callback) => {

						const tokens = [...group];
						const tokenAmount = tokens.length;
						const type = messageType;

						RecipientSnapshot.collection.updateMany({
							messageId: messageID,
							'data.token': {
								$in: tokens
							}
						}, {
							$set: {
								'status.state': parameters.state.FAIL,
							}
						}).then(result => {

							states[type][parameters.state.PENDING] -= tokenAmount;
							states[type][parameters.state.FAIL] += tokenAmount;

							io.emit('updateRecipientStats', {data: {
								reportId: messageID,
								states: states
							}});

							callback(null, result);
						}).catch(err => {
							callback(err);
						});

						return null;
					}
				});

				async.series([
					...sentRecipients,
					...failRecipients
				], (err, result) => {

					if (err) {
						reject({
							id: messageID,
							error: err
						});
						return;
					}

					totalTime = (Date.now() - startTime) / 1000;

					resolve({
						id: messageID,
						type: type,
						total: (validTokens.length + invalidTokens.length),
						time: totalTime
					});
				});

			}).catch(err => {
				reject({
					id: messageID,
					error: err
				});
			});
		});
	};

	/**
	 * Send Push Notification and Update Report
	 *
	 * Simple proxy through to Send Push Notification with
	 * the addition of updating the send report after send.
	 *
	 * @param {object} notification Formatted notification data.
	 * @param {object} recipients Recipients to receive notification (tokens per language).
	 * @param {string} type Push type (push|ios|android).
	 * @param {string} sender Sending service to use, default firebase.
	 * @return {Promise<object>} Result object from sending service.
	 */
	const sendPushWithReport = (notification, recipients, type, sender = 'firebase') => {
		sendPushNotification(notification, recipients, type, sender).then(report => {

			// @todo - handle rejection in catch...
			updateSendReport(report.info, report.valid, Object.keys(report.invalid)).then(result => {

				console.log(`Reporting: Send Report updated for ${result.total} ${result.type} recipients in ${result.time} seconds [${result.id}]`);

			}).catch(err => {

				console.error(`Reporting Error: Failed to update Send Report`, err);

			});

		}).catch(error => {

			console.error(error);

		});
	};

	const send = (notification, recipients, origin = 'unknown') => {

		// @todo - maybe return promise with message report id

		if (!notification.triggerType) {
			console.error('Messaging Error: Missing Trigger Type');
			return false;
		}

		if (!notification.messages || !validateMessages(notification.messages)) {
			console.error('Messaging Error: There was a problem with provided notification format');
			return false;
		}

		if (!validateRecipients(recipients)) {
			console.error('Messaging Error: There was a problem with provided recipients format');
			return false;
		}

		// Assign trigger time / id and message time
		notification.triggerRecievedTime = new Date();
		notification.triggerID = uidGenerator();
		notification.messageTime = setEventDate() + ' GMT';

		//console.log(`Send Notification: Origin: ${origin}`);
		//console.log(notification.messages);
		//console.log(recipients);

		// Switch to saveSendReport above
		saveSendReport(notification, recipients, origin).then(result => {
			
			console.log(`Reporting: Send Report added for ${result.total} recipients in ${result.time} seconds [${result.id}]`);

			// Send Browser Alert (Socket)
			if (recipients.alerts.length) {

				const socketData = {
					triggerID: notification.triggerID,
					triggerType: notification.triggerType,
					messageTime: notification.messageTime,
				};

				sendSocketNotification({messages: notification.messages, ...socketData}, recipients.alerts);
			}

			// Send Browser Push (Firebase)
			if (recipients.push.length) {
				sendPushWithReport(notification, recipientToTokenList(recipients.push), 'push');
			}

			// Send Mobile iOS (Firebase)
			if (recipients.iosMobiles.length) {
				sendPushWithReport(notification, recipientToTokenList(recipients.iosMobiles), 'ios');
			}

			// Send Mobile Android (Firebase)
			if (recipients.androidMobiles.length) {
				sendPushWithReport(notification, recipientToTokenList(recipients.androidMobiles), 'android');
			}

			// Send Mobile Android (Pushy)
			if (recipients.pushyMobiles.length) {
				sendPushWithReport(notification, recipientToTokenList(recipients.pushyMobiles), 'android', 'pushy');
			}

		}).catch(err => {

			console.error(`Reporting Error: Failed to add Send Report [${notification.triggerID}]`, err);

		});
	}

	const drySend = (mobiles) => {
		console.error('Dry Send not currently supported');
		/*
		let messageContentTemplate =  {
			priority: 'high',
			collapse_key: 'Market Alert',
			dry_run: true,
			title: '',
			detail: '',
			notification: {
				title: '',
				body: ''
			},
			data: {
				screen: '1',
				pair: '',
				title: '',
				detail: ''
			},
		};
		
		let iterationNumber = Math.ceil(mobiles.length / 1000);
		let success = 0, failures = 0;
		let failureTokens = [];
		let fcmCalls = [];
		
		for (let i = 0; i < iterationNumber; i++) {
			let message = Object.assign({}, messageContentTemplate);
			message.dry_run = true;
			message.registration_ids = mobiles.slice(i*1000, 1000*(i+1));
			fcmCalls.push(fcmSend.bind(null, message));
		}
		let result;

		return new Promise(function(fullfill, reject){
			async.series(fcmCalls, function(err, res){
				if(err){
					reject(err);
					return;
				}
				if(res.length > 0){
					result = res.reduce((curr, next) => {
						if(!curr) return next;
						next.success = curr.success +	next.success;
						next.failures = curr.failures + next.failures;
						next.invalidTokens = curr.invalidTokens.concat(next.invalidTokens);
						return next;
					});
				}else{
					result = {
						success: 0,
						failures: 0,
						invalidTokens:[],
						invalidTokensLength: 0
					}
				}
				
				result.invalidTokensLength = result.invalidTokens.length;
						
				fullfill(result);
			})
		})
		*/
	}

	return {
		send,
		drySend,
		sendPushNotification
	}
}
