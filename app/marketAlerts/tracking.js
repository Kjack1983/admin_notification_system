"use strict";
const parameters = require('../parameters');

module.exports  = (marketAlerts, usersManagement, messagingSettings) => {
	
	// Api methods for retrieving stats about users
	marketAlerts.addHttpInEvent({
		name: 'pushDelivered',
		data: [
			//parameters.messageChannels.MACHINE_HASH,
			parameters.tracking.TRIGGER_ID,
			parameters.tracking.TRIGGER_TYPE,
			parameters.tracking.NOTIFICATION_RECEIVED,
			parameters.tracking.PUSH_ID
		],
		handler: function(req, res, data) {
			let pub = marketAlerts.getRedisConnection();
			
			pub.publish('tracking.pushDelivered', JSON.stringify({
				userID:  data[parameters.user.USER_ID] || 'null',
				machineHash: data[parameters.messageChannels.MACHINE_HASH],
				userLoggedIn: data[parameters.user.USER_ID] || false,
				triggerID: data[parameters.tracking.TRIGGER_ID],
				triggerType: data[parameters.tracking.TRIGGER_TYPE],
				notificationRecieved: data[parameters.tracking.NOTIFICATION_RECEIVED],
				pushID: data[parameters.tracking.PUSH_ID]
			}));
			res.send('ok');

		},
		method: 'post',
		url: '/api/track/push/delivered'
	})
	
	marketAlerts.addHttpInEvent({
		name: 'pushClicked',
		data: [
			//parameters.messageChannels.MACHINE_HASH,
			parameters.tracking.TRIGGER_ID,
			parameters.tracking.TRIGGER_TYPE,
			parameters.tracking.PUSH_ID,
			parameters.tracking.ACTION_TIME
		],
		handler: function(req, res, data) {
			let pub = marketAlerts.getRedisConnection();
			
			pub.publish('tracking.pushClicked', JSON.stringify({
				userID:  data[parameters.user.USER_ID] || 'null',
				machineHash: data[parameters.messageChannels.MACHINE_HASH],
				userLoggedIn: data[parameters.user.USER_ID] || false,
				triggerID: data[parameters.tracking.TRIGGER_ID],
				triggerType: data[parameters.tracking.TRIGGER_TYPE],
				notificationRecieved: data[parameters.tracking.NOTIFICATION_RECEIVED],
				pushID: data[parameters.tracking.PUSH_ID],
				action: 'clicked',
				actionTime: new Date()
			}));

			res.send('ok')
		},
		method: 'post',
		url: '/api/track/push/clicked'
	})
	
	marketAlerts.addHttpInEvent({
		name: 'pushClosed',
		data: [
			//parameters.messageChannels.MACHINE_HASH,
			parameters.tracking.TRIGGER_ID,
			parameters.tracking.TRIGGER_TYPE,
			parameters.tracking.ACTION_TIME,
			parameters.tracking.PUSH_ID
		],
		handler: function(req, res, data) {
			let pub = marketAlerts.getRedisConnection();
			
			pub.publish('tracking.pushClosed', JSON.stringify({
				userID:  data[parameters.user.USER_ID] || 'null',
				machineHash: data[parameters.messageChannels.MACHINE_HASH],
				userLoggedIn: data[parameters.user.USER_ID] || false,
				triggerID: data[parameters.tracking.TRIGGER_ID],
				triggerType: data[parameters.tracking.TRIGGER_TYPE],
				notificationRecieved: data[parameters.tracking.NOTIFICATION_RECEIVED],
				pushID: data[parameters.tracking.PUSH_ID],
				action: 'closed',
				actionTime: new Date()
			}));

			res.send('ok');
			
		},
		method: 'post',
		url: '/api/track/push/closed'
	})

	marketAlerts.addSocketInEvent({
		name: 'notificationDelivered', 
		data: [ parameters.messageChannels.SOCKET_ID ], 
		handler: function(data){
			let pub = marketAlerts.getRedisConnection();
			
			data.notificationInfoRecieved = new Date();
			pub.publish('tracking.notificationDelivered', JSON.stringify(data));
		}
	});
	
	marketAlerts.addSocketInEvent({
		name: 'notificationAction', 
		data: [	parameters.messageChannels.SOCKET_ID ], 
		handler: function(data){
			let pub = marketAlerts.getRedisConnection();
			pub.publish('tracking.notificationAction', JSON.stringify(data));
			
		}
	});

	marketAlerts.addSocketInEvent({
		name: 'notificationVisible', 
		data: [ parameters.messageChannels.SOCKET_ID ], 
		handler: function(data){
			let pub = marketAlerts.getRedisConnection();
			pub.publish('tracking.notificationVisible', JSON.stringify(data));
		}
	});

}