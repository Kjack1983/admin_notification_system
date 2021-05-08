"use strict";

// Require libs
const async = require('async');
const FirebaseAdmin = require('firebase-admin');

// Require settings
const parameters = require('../../app/parameters');

// Require utils
const PushUtils = require('../utils/push-utils')();

// Init Firebase messaging
const serviceAccount = require('../../client-service-account.json');

const Firebase = FirebaseAdmin.initializeApp({
	credential: FirebaseAdmin.credential.cert(serviceAccount),
}, 'clientFirebase');

const Notifications = Firebase.messaging();

/**
 * Deletable error codes
 *
 * @link https://firebase.google.com/docs/cloud-messaging/send-message#admin
 *
 * 1. "messaging/invalid-registration-token" - Token has bad format.
 * 2. "messaging/registration-token-not-registered" - Expired Token.
 */
const deletableErrors = [
	"messaging/invalid-registration-token",
	"messaging/registration-token-not-registered",
];

/**
 * Format Firebase Messages
 *
 * Format messages to send via firebase.
 *
 * @link https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#resource:-message
 *
 * Needed for all:
 * - message.title
 * - message.text
 * - message.action
 * - triggerType (collapse key / topic)
 *
 * Needed for browser push:
 * - triggerID
 * - pushServerUrl
 *
 * @param {object} data Notification message data.
 * @param {string} language Language of notification message.
 * @param {string} type Target device type (android|ios|push).
 * @return {object} result Formatted message to send.
 */
const format = (data, language, type) => {

	let messageType = parameters.messageChannels.MOBILES;

	if (type === parameters.messageChannels.PUSH) {
		messageType = parameters.messageChannels.PUSH;
	}

	const messages = data[parameters.admin.MESSAGES];
	const message = messages[messageType];

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
		pushServerUrl
	} = data;

	// Default data / notification to send to all types
	let result = {};
	
	// Android specific
	// @link https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#androidconfig
	if (type === 'android') {

		result.data = {
			"title": message.title[language],
			"message": message.text[language],
			"pushType": triggerType,
			"messageData": JSON.stringify(message.action[language]).replace('/\"/g', '\\"'),
		};

		result.android = {
			"priority": "high",
			"collapseKey": triggerType,
		};
	}

	// iOS specific
	// @link https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#apnsconfig
	else if (type === 'ios') {

		result.apns = {
			// @link https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CommunicatingwithAPNs.html#//apple_ref/doc/uid/TP40008194-CH11-SW1
			"headers": {
				"apns-priority": "10",
				"apns-push-type": "alert",
				"apns-collapse-id": triggerType,
				"apns-topic": "com.easyforex.trading",
			},
			// @link https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html#//apple_ref/doc/uid/TP40008194-CH17-SW1
			"payload": {
				"aps": {
					"alert": {
						"title": message.title[language],
						"body": message.text[language],
					},
					"sound": "default",
				},
				"title": message.title[language],
				"message": message.text[language],
				"messageData": JSON.stringify(message.action[language]).replace('/\"/g', '\\"'),
			}
		};
	}

	// Web push specific
	// @link https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#webpushconfig
	else if (type === 'push') {

		result.data = {
			"title": message.title[language],
			"detail": message.text[language],
			"pushUrl": message.action[language],
			"triggerID": triggerID,
			"triggerType": triggerType,
			"pushServerUrl": pushServerUrl,
		};

		result.webpush = {
			// Headers
			// @link https://tools.ietf.org/html/rfc8030#section-5
			"headers": {
				"Urgency": "high",
				"Topic": triggerType
			},
		};
	}

	return result;
};

/**
 * Send
 *
 * Function for sending the message using firebase. We are sending messages
 * in batches. This means we provide array of user ids instead of sending 
 * them to individual users. 
 * 
 * Used with async module, that is used to call multiple async calls at 
 * once, and then wait for all of them to finish.
 *
 * @param {object} data Formatted message data to send and message info.
 * @param {boolean} dryRun Send as dry run via firebase.
 * @param {function} callback Callback function for async lib.
 * @return {void}
 */
const send = (message, info, dryRun = false, callback) => {

	let result = {
		success: 0,
		failures: 0,
		total: 0,
		valid: [],
		invalid: {},
		info: info
	};

	// Multicast Message (500 token limit)
	Notifications.sendMulticast(message, dryRun).then((response) => {

		// Handle single fail message for all tokens
		// @note - keeping the below, need to see if valid we could get single response for all...
		/*
		if (err && typeof err === 'string' && !Object.keys(responseObject).length) {

			responseObject.success = 0;
			responseObject.failure = message.registration_ids.length;

			responseObject.results = Object.values(message.registration_ids.reduce((acc, curr, index) => {
				acc[index] = {error: err};
				return acc;
			}, {}));
		}
		*/

		result.success = response.successCount;
		result.failures = response.failureCount;
		result.total = result.success + result.failures;

		if (response.responses.length) {

			response.responses.forEach((responseData, i) => {

				if (responseData.success) {
					result.valid.push(message.tokens[i]);
				}
				else {

					let errorType = 'unknown-error';

					if (responseData.error) {

						const errorJson = responseData.error.toJSON();

						if (errorJson && errorJson.code) {
							errorType = errorJson.code;
						}
					}

					//console.log('ERROR', errorType);

					result.invalid[message.tokens[i]] = errorType;
				}
			});
		}

		//console.log(`FireBase: Success/Fail [${result.success}/${result.failures}] of Total [${result.total}]`);

		callback(null, result);

	}).catch((err) => {

		// @todo - find a case which cause root fail to handle logic
		console.error('FireBase Error:', err.message);
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
					reject('Firebase Error: Could not send message to users', err);
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

				console.log('Firebase: Sent to %s %s users [success %s] [failures %s]', report.total, report.info.type, report.success, report.failures);

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
	return PushUtils.parseDeletableTokens(tokens, deletableErrors, 'Firebase');
};

module.exports = {
	firebaseFormat: format,
	firebaseSend: send,
	firebaseBatchSend: batchSend,
	firebaseParseDeletable: parseDeletableTokens
};
