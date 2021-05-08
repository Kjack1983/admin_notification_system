"use strict";

// Require libs 
const _ = require('lodash');

// Base
const config = require('../config');
const parameters = require('../parameters');
const uidGenerator = require('../uidGenerator');

// Push
const { firebaseFormat, firebaseBatchSend } = require('../../lib/firebase/firebase-client');
const { pushyFormat, pushyBatchSend } = require('../../lib/pushy/pushy-client');

// Market alert config
const { getTitle, getText, getType } = require('./config');

// Utility function that sets correct event data format
// @todo - can this be changed to moment?
const setEventDate = date =>  {
	return date.split(' ').map(item => {
		if (item.indexOf('-') > -1) {
			return item.split('-').reverse().join('/');
		}
		return item;
	}).join(' ');
};

// Set instrument to correct format
const setInstrument = data => {
	return `${data[parameters.marketAlerts.BASE_CURR]}/${data[parameters.marketAlerts.NON_BASE_CURR]}`.toUpperCase();
};

/**
 * Template
 *
 * Replaces key / value object data in template text. Template
 * placeholders take the format %%key%% to be replaced by the
 * associated data value.
 *
 * @param {string} text Template text to search and replace.
 * @param {object} data Key / value object to use.
 * @return {string}
 */
const template = (text = '', data = {}) => {
	return Object.keys(data).reduce((acc, curr) => {
		return acc.replace(`%%${curr}%%`, data[curr]);
	}, text);
};

/**
 * Browser Action
 *
 * Returns url path for browser notifications (html / native)
 *
 * @param {string} instrument Instrument to change to trade url pair.
 * @param {string} language Language for url path.
 * @return {string}
 */
const browserAction = (instrument = 'GBP/USD', language = 'en') => {

	const base = (language === 'en' ? '' : '/' + language) + '/trade';
	const pair = instrument.replace('/', '-').toLowerCase();

	return `${base}/${pair}/`;
};

/**
 * Create Notification
 *
 * Transforms market alert data to same format notification
 * messages as direct notification.
 *
 * @param {object} data Market alert data object.
 * @param {array} languages Array of language objects in the system.
 * @return {object} result Notification object.
 */
const createNotification = (data, languages) => {

	let result = {
		messages: {
			alert: {
				title: {},
				text: {},
				action: {}
			},
			push: {
				title: {},
				text: {},
				action: {}
			},
			mobile: {
				title: {},
				text: {},
				action: {}
			}
		}
	};

	if (languages.length) {

		languages.forEach(language => {

			const title = getTitle(language.code);
			const htmlTemplate = getText(data.event, language.code, 'html');
			const nativeTemplate = getText(data.event, language.code, 'native');

			// Add Alert and Push for browsers
			if (['browser', 'all'].includes(language.domain)) {

				// Html (socket) based notifications
				if (htmlTemplate) {
					result.messages.alert.title[language.code] = title;
					result.messages.alert.text[language.code] = template(htmlTemplate, data);
					result.messages.alert.action[language.code] = browserAction(data.instrument, language.code);
				}

				// Native push based notifications
				if (nativeTemplate) {
					result.messages.push.title[language.code] = title;
					result.messages.push.text[language.code] = template(nativeTemplate, data);
					result.messages.push.action[language.code] = browserAction(data.instrument);
				}
			}

			// Add mobile for mobile devices
			if (nativeTemplate && ['mobile', 'all'].includes(language.domain)) {
				result.messages.mobile.title[language.code] = title;
				result.messages.mobile.text[language.code] = template(nativeTemplate, data);
				result.messages.mobile.action[language.code] = {
					screen: '1',
					pair: data.instrument
				};
			}
		});
	}

	return result;
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
		...{
			message: message.text[language],
			url: message.action[language],
			title: message.title[language] || '',
		},
		...params
	};
};

const sendSocketNotification = (notification, pub) => {

	// Send browser socket market alert
	const socketMessages = notification.messages[parameters.messageChannels.ALERT];

	Object.keys(socketMessages.text).map(language => {

		const message = formatAlertMessage(notification, language);
		
		if (Object.keys(message).length) {

			// Socket messages are sent on receiving redis event, since each server
			// has to handle its own socket connections. 
			let room = language + '-' + parameters.user.INSTRUMENT + '-' + notification.instrument;

			pub.publish('sendSocketMessage', JSON.stringify({
				room: room,
				eventName: 'market-notification',
				data: message,
				action: message.url
			}));
		}
	});
};

module.exports = (marketAlerts, usersManagement, messagingSettings, messageHandler) => {

	/**
	 * Market Alert Trigger
	 *
	 * Recieves data from HTTP requests and reformats to alert 
	 * notification.
	 *
	 * @param {object}  req HTTP Request Object
	 * @param {object}  res HTTP Response Object
	 * @param {object}  data Data provided in the HTTP Request Object
	 * @param {integer} data.row_id Unique id from DB entry
	 * @param {integer} data.event_id Unique id for alert event
	 * @param {string}  data.event_date Time rate captured for given instrument
	 * @param {string}  data.last_event_date Previous time rate captured for given instrument
	 * @param {string}  data.base_curr Instrument Base Currency
	 * @param {string}  data.non_base_curr Instrument Non Base Currency
	 * @param {float}   data.new_value New market value of given instrument
	 * @param {float}   data.old_value Old market value of given instrument
	 * @param {float}   data.difference Diff between old and new rates (Relevant for hour event (type 1 & 2))
	 * @param {integer} data.event_type_id Event type id, mapped in config eventList
	 * @param {string}  data.event_description Event type description
	 */
	const marketAlertTriggerHandler = (req, res, data) => {

		res.send('Market Alert data received successfully');

		// Check for test trigger
		// @todo - check if still used
		const testTrigger = data[parameters.user.TEST_ENABLED] ? true : false;

		// Set system languages
		const languages = messagingSettings.getLanguages();

		// Set alert instrument from data
		const instrument = setInstrument(data);

		// Generate unique trigger id
		const uid = uidGenerator();

		// Set params for market alert message
		let params = {
			event: parseInt(data[parameters.marketAlerts.EVENT_TYPE_ID], 10),
			instrument: setInstrument(data),
			price: Math.round(data[parameters.marketAlerts.NEW_VALUE] * 10000) / 10000,
			date: setEventDate(data[parameters.marketAlerts.EVENT_DATE])
		};

		// Add message diff for event types 1 & 2
		if ([1, 2].includes(params.event)) {
			if (data[parameters.marketAlerts.NEW_VALUE] > data[parameters.marketAlerts.OLD_VALUE]) {
				params.diff = `+${data[parameters.marketAlerts.DIFFERENCE]}%`;
			}
			else {
				params.diff = `-${data[parameters.marketAlerts.DIFFERENCE]}%`;
			}
		}

		// Set notification messages
		const notification = createNotification(params, languages.languages);

		// Fetch recipient tokens
		const recipients = usersManagement.getMarketAlertReceivers(instrument, testTrigger);

		// Socket data
		const socketData = {
			type: getType(params.event),
			instrument: instrument,
			[parameters.tracking.TRIGGER_ID]: uid,
			[parameters.tracking.TRIGGER_TYPE]: parameters.tracking.MARKET_ALERT,
		};

		// Send Browser Sockets (Redis)
		if (!testTrigger) {
			sendSocketNotification({ ...notification, ...socketData}, marketAlerts.getRedisConnection());
		}

		const pushData = {
			[parameters.tracking.TRIGGER_ID]: uid,
			[parameters.tracking.TRIGGER_TYPE]: parameters.tracking.MARKET_ALERT,
			[parameters.tracking.PUSH_SERVER_URL]: data.host,
		};

		// Send Browser Push (Firebase)
		if (Object.values(recipients.push).reduce((total, curr) => { return total + curr.length; }, 0)) {
			messageHandler.sendPushNotification({ ...notification, ...pushData}, recipients.push, 'push');
		}

		// Send Mobile iOS (Firebase)
		if (Object.values(recipients.fcmIosMobile).reduce((total, curr) => { return total + curr.length; }, 0)) {
			messageHandler.sendPushNotification({...notification, ...pushData}, recipients.fcmIosMobile, 'ios');
		}

		// Send Mobile Android (Firebase)
		if (Object.values(recipients.fcmAndroidMobile).reduce((total, curr) => { return total + curr.length; }, 0)) {
			messageHandler.sendPushNotification({...notification, ...pushData}, recipients.fcmAndroidMobile, 'android');
		}

		// Send Mobile Android (Pushy)
		if (Object.values(recipients.pushyMobile).reduce((total, curr) => { return total + curr.length; }, 0)) {
			messageHandler.sendPushNotification({...notification, ...pushData}, recipients.pushyMobile, 'android', 'pushy');
		}
	}

	marketAlerts.addHttpInEvent({
		name: 'marketAlertTrigger',
		data: [
			parameters.marketAlerts.ROW_ID,
			parameters.marketAlerts.EVENT_ID,
			parameters.marketAlerts.EVENT_DATE,
			parameters.marketAlerts.BASE_CURR,
			parameters.marketAlerts.NON_BASE_CURR,
			parameters.marketAlerts.EVENT_TYPE_ID,
			parameters.marketAlerts.NEW_VALUE,
			parameters.marketAlerts.OLD_VALUE,
			parameters.marketAlerts.LAST_EVENT_DATE,
			parameters.marketAlerts.DIFFERENCE,
			parameters.marketAlerts.EVENT_DESCRIPTION
		],
		handler: marketAlertTriggerHandler,
		method: 'post',
		url: '/live/market-trigger'
	})

	marketAlerts.addHttpInEvent({
		name: 'marketAlertTriggerTest',
		data: [
			parameters.marketAlerts.ROW_ID,
			parameters.marketAlerts.EVENT_ID,
			parameters.marketAlerts.EVENT_DATE,
			parameters.marketAlerts.BASE_CURR,
			parameters.marketAlerts.NON_BASE_CURR,
			parameters.marketAlerts.EVENT_TYPE_ID,
			parameters.marketAlerts.NEW_VALUE,
			parameters.marketAlerts.OLD_VALUE,
			parameters.marketAlerts.LAST_EVENT_DATE,
			parameters.marketAlerts.DIFFERENCE,
			parameters.marketAlerts.EVENT_DESCRIPTION
		],
		handler: function(req, res, data) {
			data[parameters.user.TEST_ENABLED] = true;
			marketAlertTriggerHandler(req, res, data);
		},
		method: 'post',
		url: '/live/market-trigger/test'
	})

}

