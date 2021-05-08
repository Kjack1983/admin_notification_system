/*
 * Browser socket connections handlers
 */
"use strict";
const parameters = require('../parameters');
const _ = require('lodash');

module.exports = (clients, usersManagement, messagingSettings) => {
	const browserConnectionsHandlers = require('./browserConnectionsHandlers')(clients, usersManagement, messagingSettings);
	
	clients.addSocketInEvent({
		name: 'initializeBrowser', 
		data: [parameters.messageChannels.SOCKET_ID], 
		handler: function(){},
		distributed: false,
	});

	/*
	 * Browser connect event. 
	 * 
	 * Triggered whenever socket connection is established
	 * It updates user's registration with socketId and with 
	 * various user data retreived from the client on page load. Usualy connect
	 * event is initiated just after the page is loaded, which means the information
	 * passed to the server is the most up to date information related to the given 
	 * user. 
	 */
	clients.addSocketInEvent({
		name: 'connectBrowser', 
		data: [
			parameters.messageChannels.MACHINE_HASH,
			parameters.user.USER_ID,
			parameters.user.TEST_ENABLED,
			parameters.user.MARKET_ALERT_ALLOW,
			parameters.user.LANGUAGE,
			parameters.user.PAIRS,
			parameters.messageChannels.SOCKET_ID,
			parameters.messageChannels.TAB_ACTIVE,
			parameters.tracking.USER_AGENT, 
			parameters.tracking.IP, 
			parameters.tracking.COUNTRY, 
			parameters.tracking.COUNTRY_ISO_CODE, 
			parameters.tracking.TIME_ZONE
		], 
		handler: browserConnectionsHandlers.connectBrowser,
		distributed: true,
		tracking: browserConnectionsHandlers.connectBrowserTracker
	});


	// Closing socket connection
	clients.addSocketInEvent({
		name: 'disconnect', 
		data: [parameters.messageChannels.SOCKET_ID], 
		handler: browserConnectionsHandlers.disconnect,
		distributed: true
	});


	/*
	 * Tab visibility change handler. 
	 * Event that manages user's connections as they navigate from and back to the page. When 
	 * the user is active on the EM platform socket based alert should be displayed. If the user is 
	 * not on the platform we should show push notification.
	 *
	 */
	clients.addSocketInEvent({
		name: 'tabVisibilityChange',
		data: [
			parameters.user.USER_ID,
			parameters.messageChannels.MACHINE_HASH,
			parameters.messageChannels.TAB_ACTIVE,
		],
		handler: browserConnectionsHandlers.tabVisibilityChange,
		distributed: true
	})

	/*
	 * Updating Market Alert's subscription
	 */
	clients.addSocketInEvent({
		name: 'updateMarketAlertsSubscription',
		data: [
			parameters.user.USER_ID,
			parameters.user.MARKET_ALERT_ALLOW
		],
		handler: browserConnectionsHandlers.updateMarketAlertsSubscription,
		distributed: true
	})
	
	/*
	 * Instrument update handler. Initiated when user selects/unselects favorite instrument
	 * in the tradezone. 
	 */
	clients.addSocketInEvent({
		name: 'instrumentUpdate',
		data: [
			parameters.user.USER_ID,
			parameters.user.INSTRUMENT,
			parameters.user.INSTRUMENT_STATUS
		],
		handler: browserConnectionsHandlers.instrumentUpdate,
		distributed: true
	})
	
	/*
	 * Helper event that measures socket latency and sends this information to the tracking
	 * module. 
	 */
	clients.addSocketInEvent({
		name: 'setMachineInfo',
		data: [
			parameters.messageChannels.MACHINE_HASH, 
			parameters.tracking.IP, 
			parameters.tracking.COUNTRY, 
			parameters.tracking.COUNTRY_ISO_CODE, 
			parameters.tracking.TIME_ZONE, 
		],
		handler: browserConnectionsHandlers.setMachineInfo,
	})
}

