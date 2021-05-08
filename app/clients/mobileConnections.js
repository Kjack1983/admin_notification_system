/*
 * Group of events providing http rest api endpoints used by mobile app. 
 */

"use strict";

const parameters = require('../parameters');
const _ = require('lodash');
const fs = require('fs');


module.exports  = (clients, usersManagement,messagingSettings) => {

	const mobileConnectionsHandler = require('./mobileConnectionsHandlers')(clients, usersManagement, messagingSettings);

	/**
	 * Connect method, called when user opens the app, or when the user logs in.
	 */
	clients.addHttpInEvent({
		name: 'mobileConnect',
		data: [
			parameters.user.USER_ID,
			parameters.user.LANGUAGE,
			parameters.user.CULTURE,
			parameters.messageChannels.TOKEN,
			parameters.messageChannels.SYSTEM
		],
		handler: mobileConnectionsHandler.mobileConnect,
		method: 'post',
		url: '/devices/mobile/connect',
		distributed: true
	});

	/**
	 * Mobile logout handler
	 * 
	 * Action steps: 
	 * - Get the user of the device. 
	 * - Get the device data and update it
	 * - Update the users object
	 */
	clients.addHttpInEvent({
		name: 'mobileLogout',
		data: [
			parameters.messageChannels.TOKEN
			//parameters.user.USER_ID,
		],
		handler: mobileConnectionsHandler.mobileLogout,
		method: 'post',
		url: '/devices/mobile/logout',
		distributed: true
	});

	clients.addHttpInEvent({
		name: 'mobileTokenUpdate',
		data: [
			parameters.messageChannels.OLD_TOKEN,
			parameters.messageChannels.NEW_TOKEN,
		],
		handler: mobileConnectionsHandler.mobileTokenUpdate,
		method: 'post',
		url: '/devices/mobile/update',
		distributed: true
	});

	clients.addHttpInEvent({
		name: 'mobileDelete',
		data: [ parameters.messageChannels.TOKEN ],
		handler: mobileConnectionsHandler.mobileDelete,
		method: 'post',
		url: '/devices/mobile/delete',
		distributed: true
	});

	clients.addHttpInEvent({
		name: 'mobileCallsTest',
		data: [],
		handler: mobileConnectionsHandler.mobileCallsTest,
		method: 'get',
		url: '/api/fetch/mobile/calls'
	});
}
