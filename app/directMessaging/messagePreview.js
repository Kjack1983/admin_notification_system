"use strict";

/**
 * Unused until time to update to use new firebase 
 * module.
 *

const config = require('../config');
const parameters = require('../parameters');
const _ = require('lodash');
const uidGenerator = require('../uidGenerator');
const moment = require('moment-timezone');

// @todo - replace all instances of fcm-push... grep for more.
const FCM = require('fcm-push');
const adminFcm = new FCM(config.adminFcmServerKey);
const clientFcm = new FCM(config.clientFcmServerKey);
const Pushy = require('pushy');
const pushyAPI = new Pushy(config.pushyApiKey);


moment().tz("UTC").format();

const setEventDate = () => moment.utc().format('lll');


const clientMessageValidation = (data) => {
	if(!data.body) {
		return {
			error: 'Bad request format'
		}
	}
	var requestData = data.body;
	
	if(!requestData[parameters.admin.FILTERS]) {
		return {
			error: 'Filters are not defined'
		}
	};

	if(!requestData[parameters.messageChannels.PUSH]) {
		return {
			error: 'Bad data format recieved.'
		}
	}
	
	if(!requestData[parameters.messageChannels.ALERT]) {
		return {
			error: 'Bad data format recieved.'
		}
	}
	
	Object.keys(requestData.push.title).forEach(lang => {
		if(requestData[parameters.messageChannels.PUSH].text[lang] !== ''){
			
			requestData[parameters.messageChannels.PUSH].text[lang] = requestData[parameters.messageChannels.PUSH].text[lang] + '\n' + setEventDate() + ' GMT';
		}
	});
	
	requestData.triggerType = 'client message';
	requestData.triggerRecievedTime = new Date();
	requestData.messageTime =  setEventDate() + ' GMT';
	requestData.triggerID = uidGenerator();
	
	return requestData;
}

const formatAlertMessage = (message, language) => {
	return {
		message: message[parameters.messageChannels.ALERT].text[language],
        url: message[parameters.messageChannels.ALERT].action[language],
        title: message[parameters.messageChannels.ALERT].title[language],
        triggerID: message.triggerID,
        messageTime: message.messageTime
	}
}

const formatPushMessage = (message, language, user, push) => {
	
	let result = {
		collapse_key: 'Client Message',
		data: {
			title: message[parameters.messageChannels.PUSH].title[language],
			detail: message[parameters.messageChannels.PUSH].text[language],
			pushUrl: message[parameters.messageChannels.PUSH].action[language],
			triggerID: message.triggerID,
			messageType: 'Client Message',
			pushServerUrl: message.pushServerUrl,
		}
	}
	if(user) {
		result.data[parameters.messageChannels.TOKEN] = push[parameters.messageChannels.TOKEN];
		result.to = push[parameters.messageChannels.TOKEN];
	}
	if(push) {
		result.data[parameters.messageChannels.MACHINE_HASH] = push[parameters.messageChannels.MACHINE_HASH];

	}
	return result;
}


module.exports = (directMessaging, usersManagement, adminManagement, messagingSettings) => {
	
	directMessaging.addHttpInEvent({
		name: 'messagePreview',
		data: [
			parameters.admin.FILTERS,
			parameters.messageChannels.PUSH,
			parameters.messageChannels.ALERT
		],
		handler: function(req, res, data) {
			res.send('Preview request received successfully');
			let message = clientMessageValidation(req);
			
			if('error' in message) {
				res.send(message.error);
			}
			message.pushServerUrl = 'https://' + req.get('host');
			
			const socketId = message.socketId;

			const adminUser = adminManagement.getUser(socketId);

			if(!adminUser) return;
			let io = directMessaging.getSocketsConnection();
			let pub = directMessaging.getRedisConnection();
			
			let languages = messagingSettings.getLanguages();
			
			languages.browserLanguages
				.map(lang => lang.code)
				.map(language => {
					if(message[parameters.messageChannels.ALERT].text[language]){
						var socketMessage = formatAlertMessage(message, language);
						// This should go to redis
						// Publish user's data over redis
						pub.publish('sendSocketMessage', JSON.stringify({
							room: socketId,
							eventName: 'clientNotificationPreview',
							data: socketMessage
						}));

						//io.sockets.in(message.adminUsername).emit('clientNotificationPreview', socketMessage);
					}

					if(adminUser[parameters.messageChannels.TOKEN] && message[parameters.messageChannels.PUSH].text[language]){
						var notificationMessage = formatPushMessage(message, language);
						notificationMessage.to = adminUser[parameters.messageChannels.TOKEN];
						
						adminFcm.send(notificationMessage, function(err, response){
						    if (err) {
						    	console.log(`FCM-Sending message to browser: [${adminUser[parameters.messageChannels.TOKEN]}]`.red + ` Error: ${err}`);
						    	return;
						    }
						});
					}
				})
		},
		method: 'post',
		url: '/live/client-trigger/preview'
		
	})

	directMessaging.addHttpInEvent({
		name: 'mobileDirectMessageTest',
		method: 'post',
		url: '/live/client-trigger/test',
		data: [
			parameters.messageChannels.TOKEN,
			parameters.directMessaging.TITLE,
			parameters.directMessaging.MESSAGE,
			parameters.directMessaging.DATA,
		],
		handler: function(req, res, data) {
			res.send('Direct message request received');
			
			const token = data[parameters.messageChannels.TOKEN];
			const user = usersManagement.getMobileUser(token);
			const mobileRegistration = usersManagement.getMobileObject(user, token);

			const deliveryType = mobileRegistration[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD];
			
			let message = {};

			if(deliveryType === 'pushy'){
				var options = {
				    notification: {
				        badge: 1,
				        priority: 'high',
						collapse_key: data.title,
				    },
				};

				let pushyTokens = {};

				message = {
					message: data.message,
					title: data.title,
					data: data.data
				};
				
				message.data.title = data.title;
			 	message.data.message = data.message;
				
				pushyAPI.sendPushNotification(message, [token], options, function(err, id) {
					if(err) {
						console.log(`Direct Messaging: Pushy Error. There was an error while trying to send a message to [${token}]`, err);
						return;
					}
					console.log(`Direct Messaging: Sending message to [${token}] using pushy`);
				});
			}else{
				message = {
					priority: 'high',
					to: token,
					collapse_key: data.title,
					title: data.title,
					body: data.message,
					data: data.data
				}

				if(mobileRegistration[parameters.messageChannels.SYSTEM] === 'ios') {
					message.notification = {
						title: data.title,
						body: data.message
					}

				}
				message.data.title = data.title;
			 	message.data.message = data.message;
			 	console.log(message);

			 	clientFcm.send(message, function(err, response){
				    if (err) {
				    	console.log(`Direct Messaging: FCM-Sending message to  mobile: [${token}]`, err);
				    	return;
				    }
				    console.log(`Direct Messaging: FCM-Sending message to  mobile: [${token}]`, response);  
				});

			}

		}
	})
}
*/
