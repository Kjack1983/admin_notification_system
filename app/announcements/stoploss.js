"use strict";

const config = require('../config');
const parameters = require('../parameters');
const cron = require('node-cron');
const CronJob = require('cron').CronJob;
const request = require('request');

const _ = require('lodash');

const moment = require('moment');

module.exports = (announcements, usersManagement, messagingSettings, messageHandler) => {

	announcements.addHttpInEvent({
		name: 'stopLossTrigger',
		url: '/live/stoploss-trigger/',
		data: [
			'userId',
			'dealId',
			'fixedAmountOfPips',
			'cp',
			'currentRate',
			'dealStopLoss',
			'timeStamp'
		],
		handler: function (req, res, data) {

			// Set instrument lowercase hyphen separated
			let urlInstrument = (data.cp.slice(0, 3) + '-' + data.cp.slice(3)).toLowerCase();

			// Set languages and message placeholder
			let languages = messagingSettings.getLanguages();
			let messages = {
				push: { title: {}, text: {}, action: {} },
				alert: { title: {}, text: {}, action: {} },
				mobile: { title: {}, text: {}, action: {} }
			};

			// Set message content for browsers
			languages.browserLanguages.map(lang => lang.code).map(lang => {

				// Title
				messages.push.title[lang] = 'Stop-Loss Rate Warning';
				messages.alert.title[lang] = 'Stop-Loss Rate Warning';

				// Text
				messages.push.text[lang] = `Deal ID: ${data.dealId} is within ${data.fixedAmountOfPips} pips away from reaching your Stop-Loss Rate.`;
				messages.alert.text[lang] = `Deal ID: ${data.dealId} is within ${data.fixedAmountOfPips} pips away from reaching your Stop-Loss Rate.`;

				// Action
				messages.push.action[lang] = lang === 'en' ? `/trade/${urlInstrument}/#modify=${data.dealId}` : `/${lang}/trade/${urlInstrument}/#modify=${data.dealId}`;
				messages.alert.action[lang] = lang === 'en' ? `/trade/${urlInstrument}/#modify=${data.dealId}` : `/${lang}/trade/${urlInstrument}/#modify=${data.dealId}`;

			});

			// Set message content for mobiles
			languages.mobileLanguages.map(lang => lang.code).map(lang => {

				// Title
				messages.mobile.title[lang] = 'Stop-Loss Rate Warning';

				// Text
				messages.mobile.text[lang] = `Deal ID: ${data.dealId} is within ${data.fixedAmountOfPips} pips away from reaching your Stop-Loss Rate.`;

				// Action
				messages.mobile.action[lang] = { screen: '4' }

				// @todo what about pushType?
			});

			// Find targetted user
			const user = usersManagement.getUser(data.userId);

			// Exit on user not found
			if (_.isEmpty(user)) {
				return res.send('No user available to receive the message');
			}

			// Exit on user disabled stoploss notifications
			if (!user[parameters.user.STOPLOSS_ALERT_ALLOW]) {
				return res.send('User has disabled stoploss alert');
			}

			// Set filters for sending
			const filters = {
				selectedUsers: [data.userId],
				filtersEnabled: true, // @todo - can we remove filtersEnabled?
				mode: 'send',
			};

			// Fetch devices of the user
			// @todo - get device list without messages?
			const deviceList = usersManagement.usersFiltering.getUsersList({
				filters: filters,
				messages: messages,
			});

			let recipients = deviceList.userInfo;

			// Remove Alert and Push recipients matching current logic
			// @todo - test if we can send for alert / push users
			recipients.alerts = [];
			recipients.push = [];

			// Reduce messages per recipient device type / language
			messages = Object.keys(messages).reduce((acc, type) => {

				const sendType = (type === 'alert' ? 'alerts' : (type === 'mobile' ? 'mobiles' : type));

				const sendTypeLanguages = recipients[sendType].reduce((acc, curr) => {
					if (curr.language) {
						acc.push(curr.language);
					}
					return acc;
				}, []);

				acc[type] = Object.keys(messages[type]).reduce((acc, section) => {
					acc[section] = Object.keys(messages[type][section]).reduce((acc, lang) => {
						if (!!~sendTypeLanguages.indexOf(lang)) {
							acc[lang] = messages[type][section][lang];
						}
						else {
							acc[lang] = '';
						}
						return acc;
					}, {});
					return acc;
				}, {});

				return acc;

			}, {});

			messageHandler.send({
				filters: filters,
				messages: messages,
				[parameters.tracking.TRIGGER_TYPE]: 'StopLoss',
				[parameters.tracking.PUSH_SERVER_URL]: data.host,
			}, recipients, 'stoploss');

			res.send('Stoploss request received');
		},
		method: 'post'
	});
}
