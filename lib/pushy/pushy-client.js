"use strict";

// Require libs
const async = require('async');
const Pushy = require('pushy');

// Require settings
const config = require('../../app/config');
const parameters = require('../../app/parameters');

// Require utils
const PushUtils = require('../utils/push-utils')();

// Init Pushy messaging
const pushyAPI = new Pushy(config.pushyApiKey);

/**
 * Deletable error codes
 *
 * @link https://pushy.me/docs/api/notification-status
 *
 * @todo - investigate how we can identify pushy deletable errors
 */
const deletableErrors = [
];

/**
 * Format Pushy Messages
 *
 * Format messages to send via pushy.
 *
 * @param {object} data Notification message data.
 * @param {string} language Language of notification message.
 * @param {string} type Target device type (android|ios|push).
 * @return {object} result Formatted message to send.
 */
const format = (data, language, type = parameters.messageChannels.MOBILES) => {

	const messages = data[parameters.admin.MESSAGES];
	const message = messages[type];

	// Exit if no content
	if (message.title[language] === '' || message.text[language] === '') return {};

	// Transform webview to expected cwvUrl
	if (message.action[language].webview) {
		message.action[language] = PushUtils.parseAndReplaceWebviewAction(message.action[language], language);
	}

	// Extract trigger / time from data
	const {
		triggerID,
		triggerType,
	} = data;

	// Default data / notification to send to all types
	let result = {};

	result.message = {
		"title": message.title[language],
		"message": message.text[language],
		"pushType": triggerType,
		"messageData": JSON.stringify(message.action[language]).replace('/\"/g', '\\"'),
	};

	result.options = {
		notification: {
			badge: 1,
			priority: 'high',
			collapse_key: triggerType,
		},
	};

	return result;
};

/**
 * Send
 *
 * Send for pushy messages, no batching supported so
 * individual messages sent.
 *
 * @link https://pushy.me/docs/api/send-notifications
 * @link https://pushy.me/docs/api/notification-status
 *
 * @todo - check pushy for batch send options.
 * @todo - check pushy for dry run options.
 *
 * @param {object} data Formatted message to send via pushy.
 * @param {object} info Message information not sent to pushy.
 * @param {boolean} dryRun Send as dry run via pushy.
 * @param {function} callback Callback function for async lib.
 * @return {void}
 */
const send = (data, info, dryRun = false, callback) => {

	let result = {
		success: 0,
		failures: 0,
		total: 0,
		valid: [],
		invalid: {},
		info: info
	};

	// Extract parts
	const { message, tokens, options } = data;

	pushyAPI.sendPushNotification(message, tokens, options).then((id) => {

		// @note - Only returns id in case of success
		// @todo - Check if we can see the notification status, link in docblock

		result.success = tokens.length;
		result.total = tokens.length;
		result.valid = tokens;

		//console.log(`Pushy: Success/Fail [${result.success}/${result.failures}] of Total [${result.total}]`);

		callback(null, result);

	}).catch((err) => {

		result.failures = tokens.length;
		result.total = tokens.length;

		// @todo - find a case which cause root fail to handle logic
		console.error('Pushy Error:', err);
		callback(null, result);

	});

	return null;
};

const batchSend = (content, tokens, limit = 500, info = {}) => {
	return new Promise((resolve, reject) => {

		// Set report data
		let report = {
			success: 0,
			failures: 0,
			total: 0,
			valid: [],
			invalid: {},
			info: info
		};

		// Calls array for batch sending
		let calls = [];

		// Create batches and prepare send calls
		Object.keys(content).forEach(language => {
			if (tokens[language] && tokens[language].length) {

				// Calculate number of batches for specific language
				const iterations = Math.ceil(tokens[language].length / limit);

				// For each batch create send call that is used by async
				for (let i = 0; i < iterations; i++){

					let message = Object.assign({}, content[language]);

					// Set message tokens
					message.tokens = tokens[language].slice(i * limit, limit * ( i + 1));

					// Inject language to info object
					info.language = language;

					//console.log(type + ' message', message);

					// @todo - move this up to allow setting during request
					const dryRun = false;

					// Add send call
					calls.push(send.bind(null, message, info, dryRun));
				}
			}
		});
		
		// Sending the browser push using async call
		if (calls.length) {

			async.series(calls, function(err, res) {

				if (err) {
					reject('Pushy Error: Could not send message to users', err);
					return;
				}

				if (res.length > 0) {
					report = res.reduce((curr, next) => {
						if (!curr) return next;
						next.success = curr.success + next.success;
						next.failures = curr.failures + next.failures;
						next.total = curr.total + next.total;
						next.valid = curr.valid.concat(next.valid);
						next.invalid = { ...curr.invalid, ...next.invalid };
						next.info = curr.info;
						return next;
					});
				}

				console.log('Pushy: Sent to %s %s users [success %s] [failures %s]', report.total, report.info.type, report.success, report.failures);

				resolve(report);
			})
		}
		else {
			resolve(report);
		}
	});
};

/**
 * Parse Deletable Tokens
 *
 * Proxy to Push Utils parse deletable errors setting deletable
 * errors together with sender for logging.
 *
 * @params {object} tokens Key/Value Token and associated error to check.
 * @return {array} result Tokens which can be deleted.
 */
const parseDeletableTokens = (tokens) => {
	return PushUtils.parseDeletableTokens(tokens, deletableErrors, 'Pushy');
};

module.exports = {
	pushyFormat: format,
	pushySend: send,
	pushyBatchSend: batchSend,
	pushyParseDeletable: parseDeletableTokens
};

