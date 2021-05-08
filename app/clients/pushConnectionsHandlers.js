"use strict";

const parameters = require('../parameters');
const _ = require('lodash');
const UsersModel = require('../../models/user');
const OldMobileModel = require('../../models/mobile');
const OldPushModel = require('../../models/push');
const { logger } = require('../utils/winston.logger');

module.exports  = (clients, usersManagement, messagingSettings) => {

	const pushSubscribe  = data => {

		// From received data we get id, and user object 
		const id = usersManagement.getPushUserId(data);

		const userModel = usersManagement.getUserModel();
		const token = data[parameters.messageChannels.TOKEN];
		const machineHash = data[parameters.messageChannels.MACHINE_HASH];
		const language = data[parameters.user.LANGUAGE];

		// Remove any reference to the push registration from all other users
		usersManagement.removePushRegistrations(token, machineHash, id);
		
		let user = Object.assign({}, userModel, usersManagement.getUser(id));

		// Set user specific data
		user[parameters.user.USER_LOGGED_IN] = !!data[parameters.user.USER_ID];

		Object.keys(user)
			.forEach(key => {
				if(!(key in userModel)){
					delete user[key];
				}
			})
		
		let pushData = user[parameters.messageChannels.PUSH];
		
		// Add push data to the array
		let pushRegistration = {
			[parameters.messageChannels.MACHINE_HASH]: machineHash,
			[parameters.messageChannels.TOKEN]: token,
			[parameters.user.LANGUAGE]: language,
			[parameters.messageChannels.PUSH_ACTIVE]: !data[parameters.messageChannels.TAB_ACTIVE],
			[parameters.user.USER_ID]: user[parameters.user.USER_ID],
			[parameters.tracking.IP]: data[parameters.tracking.IP],
			[parameters.tracking.COUNTRY]: data[parameters.tracking.COUNTRY], 
			[parameters.tracking.COUNTRY_ISO_CODE]: data[parameters.tracking.COUNTRY_ISO_CODE], 
			[parameters.tracking.TIME_ZONE]: data[parameters.tracking.TIME_ZONE],
			[parameters.tracking.LATITUDE]: data[parameters.tracking.LATITUDE],
			[parameters.tracking.LONGITUDE]: data[parameters.tracking.LONGITUDE],
		}
		
		// Add new push registration to the array of push registrations fot the current user
		pushData.push(pushRegistration)
		
		// Update user object
		user[parameters.messageChannels.PUSH] = [...pushData];
		
		// Get and update browser's data
		let browserData = user[parameters.messageChannels.BROWSERS].filter(browser => browser[parameters.messageChannels.MACHINE_HASH] !== machineHash);
		
		// Update user's browser object
		browserData.push({
			[parameters.messageChannels.MACHINE_HASH]: machineHash,
			[parameters.user.LANGUAGE]: language,
			[parameters.messageChannels.PUSH_ENABLED]: true
		})
		
		// Update user
		user[parameters.messageChannels.BROWSERS] = [...browserData];
		
		const loginState = (!!data[parameters.user.USER_ID] ? 'logged-in' : 'logged-out');
		logger.info(`User Management: Push registration for ${loginState} user [${id}]`);
				
		usersManagement.setUsersData(user, id, false, true);

		// Logged out user
		if (!data[parameters.user.USER_ID]) {

			const loggedOutUser = usersManagement.getUser(machineHash);

			if (_.isEmpty(loggedOutUser)) return;

			loggedOutUser[parameters.messageChannels.TOKEN] = token;

			usersManagement.setUsersData(loggedOutUser, machineHash, false, false);
		}
	}
	
	const pushSubscribeTracker  = data => { 
		let pub = clients.getRedisConnection();

		const id = usersManagement.getUserId(data);
		
		let user = usersManagement.getUser(id)
		
		if(_.isEmpty(user)) return;

		pub.publish('tracking.push.register', JSON.stringify({
			[parameters.messageChannels.MACHINE_HASH]: data[parameters.messageChannels.MACHINE_HASH],
			[parameters.messageChannels.TOKEN]: data[parameters.messageChannels.TOKEN],
			[parameters.user.LANGUAGE]: data[parameters.user.LANGUAGE],
			[parameters.messageChannels.PUSH_ACTIVE]: user[parameters.user.MARKET_ALERT_ALLOW],
			[parameters.user.USER_ID]: data[parameters.user.USER_ID]
		}))
	}

	


	const pushUnsubscribe = data => {
		// Get id and user's object
		const id = usersManagement.getUserId(data);
		let user = usersManagement.getUser(id);
		
		// Get sockets and redis instances
		if(_.isEmpty(user)) return;
		
		// Remove current push from push registrations array
		let pushData = user[parameters.messageChannels.PUSH].filter(push => push[parameters.messageChannels.MACHINE_HASH] !== data[parameters.messageChannels.MACHINE_HASH]);
		
		// Update browser's registration object
		user[parameters.messageChannels.BROWSERS].map(browser => {
			if(browser[parameters.messageChannels.MACHINE_HASH] === data[parameters.messageChannels.MACHINE_HASH]){
				browser[parameters.messageChannels.PUSH_ENABLED] = false;
			}
		});
		
		// Update user's object
		user[parameters.messageChannels.PUSH] = [...pushData];
		
		logger.info(`User Management: Push disabled for user [${id}]`);
		usersManagement.setUsersData(user, id, false, true);
		
	}

	const pushUnsubscribeTracker = data => {
		let pub = clients.getRedisConnection();
		pub.publish('tracking.push.block', JSON.stringify(data))
	}
	
	return{
		pushSubscribe,
		pushSubscribeTracker,
		pushUnsubscribe
	}
}
