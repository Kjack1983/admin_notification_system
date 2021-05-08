/*
 * Queue Management Module
 *
 * Used to manage all scheduled messages events.
 */
"use strict";
const Queue = require('bull');
const moment = require('moment');

module.exports = function () {
	let pub, sub;

	// Hold list of queues
	const queues = {};

	/*
	 * Queue management init function
	 * 
	 * Kicks off redis queue management. This happens on initialisation of the connections
	 * module. 
	 * 
	 * @param options object Holds redis connection
	 * @param events object Events module
	 * @return void
	 */
	const init = (options, events) => {

		if (!options || !options.redis) {
			return false;
		}

		if (options.redis.pub) {
			pub = options.redis.pub;
		}

		sub = options.redis.sub;

		// Get Queue events
		const redisQueueEvents = events.getEvents('redisQueue');

		// Get Queue in events
		const queueInEvents = redisQueueEvents.filter(event => event.direction === 'in');

		queueInEvents.forEach(event => {

			console.log(`SETTING QUEUE ${event.name}`);

			const redisQueue = new Queue(event.name, {
				createClient: sub
			});

			// Add queue processing
			// @note - handler needs to be promise, this
			// way we can handle failed jobs
			redisQueue.process((job) => {
				console.log(`IN QUEUE PROCESSING ${event.name}`, job.id);
				return event.handler(job);
			});

			// Clean completed / failed after 1 day
			// 
			// @note - will allow later retrieval for listing can change
			// amount of time to keep later...
			redisQueue.clean(moment.duration(1, 'day').asMilliseconds(), 'completed');
			redisQueue.clean(moment.duration(1, 'day').asMilliseconds(), 'failed');

			// Log clean event
			redisQueue.on('cleaned', function (jobs, type) {
				console.log('Cleaned %s %s jobs', jobs.length, type);
			});

			// Add queue to queues list
			queues[event.name] = redisQueue;
		});
	}

	const getQueue = (name) => queues[name];

	/**
	 * Fetch statuses and filter for lists with items.
	 *
	 * @param {object} redisQueue 
	 * return {array} status
	 */
	const fetchStatusList = async (redisQueue) => {
		return await redisQueue.getJobCounts().then(data => {
			return Object.entries(data).filter(([status, count]) => count > 0).map(([status, count]) => {
				return status;
			});
		});
	}

	/**
	 * rebuild job based on given properties.
	 * 
	 * @param {object} job 
	 * @param {array} keys 
	 */
	const buildJobByProp = (job = {}, keys = []) => {
		return Object.keys(job).filter(key => keys.includes(key)).reduce((acc, key) => {
			return {
				...acc,
				[key]: job[key]
			};
		}, {});
	}

	/**
	 * Fetch list of jobs.
	 *
	 * @param {string} name 
	 * @return {Promise} 
	 */
	const getQueueList = async (name) => {
		const redisQueue = getQueue(name);
		// Fetch statuses and filter for lists with items
		let statuses = await fetchStatusList(redisQueue);

		// Return job list with data for each status
		return await statuses.reduce(async (acc, status) => {

			let list = await acc;

			// Get jobs for status
			const jobs = await redisQueue.getJobs(status);

			// Reduce return data
			const data = Object.values(jobs).map(job => {

				// rebuild job and return only with specific properties.
				return buildJobByProp(job, ['id', 'opts', 'data', 'returnvalue', 'processedOn', 'finishedOn', 'failedReason']);
			});

			// return list.
			return {
				...list,
				[status]: data
			};

		}, Promise.resolve({}));
	}

	return {
		init,
		getQueue,
		fetchStatusList,
		getQueueList
	}
}