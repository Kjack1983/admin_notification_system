"use strict";

const parameters = require('../parameters');
const _ = require('lodash');


module.exports  = (clients, usersManagement, messagingSettings) => {
	
	const pushConnectionsHandlers = require('./pushConnectionsHandlers')(clients, usersManagement, messagingSettings);

	// Push notification subscription
	clients.addSocketInEvent({
		name: 'pushSubscribe',
		data: [
			parameters.messageChannels.TOKEN,
			parameters.user.USER_ID,
			parameters.messageChannels.MACHINE_HASH,
			parameters.messageChannels.TAB_ACTIVE,
		],
		handler: pushConnectionsHandlers.pushSubscribe,
		distributed: true,
		tracking: pushConnectionsHandlers.pushSubscribeTracker
	})

	// Push notification removing subscription
	clients.addSocketInEvent({
		name: 'pushUnsubscribe',
		data: [
			parameters.user.USER_ID,
			parameters.messageChannels.MACHINE_HASH
		],
		handler: pushConnectionsHandlers.pushUnsubscribe,
		distributed: true,
		tracking: pushConnectionsHandlers.pushUnsubscribeTracker
	})

}