"use strict";
const parameters = require('../parameters');
const _ = require('lodash');
const fs = require('fs');
const UsersModel = require('../../models/user');

const { logger } = require('../utils/winston.logger');

let mobileCallsLogs = [];

/*
 * Event handlers are exposed so that we can reuse handlers when there 
 * is a need for it and to be able to unit test each handler. 
 */
module.exports  = (clients, usersManagement, messagingSettings) => {
	/*
	 * Mobile App Connect method, called when user opens the app, or when the user logs in.
	 * If user is loged in, it searches for the user's registration in the system
	 * and updates it with mobile app info. If no user is found the new user is created
	 * and added to the users registrations object. 
	 *
	 * Step by step actions: 
	 * - Get user id based on the data we received. If user is logged out, we will 
	 * use mobile token as id. If user is logged in we use userID
	 * - Remove previous instances of mobile registration. This goes through all the
	 * registrations searches for devices with same token or deviceID, and deletes them. 
	 * - Create or update users object by adding mobile device data
	 * - Connect mssql to get stores marketAlertAllow and mobileParis
	 * - Update mongoDB
	 * - Send data over redis to all instances to update users object
	 *
	 */
	const mobileConnect = data => {

		let mobileCallData = _.cloneDeep(data);
		mobileCallData.call = 'mobileConnect';

		if (mobileCallsLogs.length < 20) {
			mobileCallsLogs.push(mobileCallData);
		} else {
			mobileCallsLogs.pop();
			mobileCallsLogs.unshift(mobileCallData);
		}

		// Make sure userID is in correct format
		if (data[parameters.user.USER_ID] === 'null') {
			data[parameters.user.USER_ID] = null;
		}

		// Get the id value for current user. Depending on user status it might
		// be userID, token or machineHash
		let id = usersManagement.getMobileUserId(data);
		
		// Make sure language is valid. If not set to default -> en
		let languageValid = false;
		let languages = messagingSettings.getLanguages();

		languages.mobileLanguages
			.map(lang => lang.code)
			.map(lang => {
				if(lang === data[parameters.user.LANGUAGE]){
					languageValid = true;
				}
			});
		
		if (!languageValid) {
			data[parameters.user.LANGUAGE] = 'en';
		}

		// Get user object template	
		const userModel = usersManagement.getUserModel();
		
		const sql = usersManagement.getSqlConnection();
		
		// Remove all references to the current mobile device
		let mobileConnectionDates = usersManagement.removeMobileFromUsers(data[parameters.messageChannels.TOKEN], data[parameters.messageChannels.DEVICE_ID], id);
		
		/*
		 * Build updated user data, from potential existing users object, 
		 * user template and receivied data
		 */
		let user = Object.assign({}, userModel, usersManagement.getUser(id));

		if (!user) return;
		
		// In case the user registration is new, we need to set userId
		user[parameters.messageChannels.TOKEN] = data[parameters.messageChannels.TOKEN];
		
		if (id !== user[parameters.user.USER_ID]) {
			user[parameters.user.USER_ID] = data[parameters.user.USER_ID];
		}
		
		data[parameters.messageChannels.FIRST_CONNECTION_DATE] = mobileConnectionDates || new Date();
		data[parameters.messageChannels.LAST_CONNECTION_DATE] = new Date();
		
		if (!data[parameters.messageChannels.APP_VERSION_NUMBER]) {
			data[parameters.messageChannels.APP_VERSION_NUMBER] = null;
		}
		
		if (!data[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD]) {
			data[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD] = 'fcm';
		}
		
		let mobileRegistrations = user[parameters.messageChannels.MOBILES];

		mobileRegistrations.push(data);

		logger.info(`User Management: Mobile User [${id}] connect`, data);
		usersManagement.setUsersData(user, id, !!data[parameters.user.USER_ID], true);
	}
	
	/*
	 * Mobile logout handler
	 * 
	 * Action steps: 
	 * - Get the user of the device. 
	 * - Get the device data and update it
	 * - Update the users object
	 *
	 */
	const mobileLogout = data => {

		let mobileCallData = _.cloneDeep(data);
		mobileCallData.call = 'mobileLogout';

		if (mobileCallsLogs.length < 20) {
			mobileCallsLogs.push(mobileCallData);
		} else {
			mobileCallsLogs.pop();
			mobileCallsLogs.unshift(mobileCallData);
		}
		
		let id = usersManagement.getMobileUserId(data);
		
		let mobileData;
		
		// Get user
		let user = usersManagement.getUser(id);
		
		if(_.isEmpty(user)) return;
		
		// Get mobile object
		let mobileObject = usersManagement.getMobileObject(user, data[parameters.messageChannels.TOKEN]);
		
		if(_.isEmpty(mobileObject)) return;

		// Update userId
		mobileObject[parameters.user.USER_ID] = null;

		logger.info(`Mobile Management: Mobile app [userID: ${id}] logout`, data);
		usersManagement.setUsersData(user, id, false, true);
	}

	const mobileTokenUpdate = data => {

		// Grap new/old token references
		const oldToken = data[parameters.messageChannels.OLD_TOKEN];
		const newToken = data[parameters.messageChannels.NEW_TOKEN];
		
		// Get old user mobile registration
		let oldUser = usersManagement.getMobileUser(oldToken);
		
		if (_.isEmpty(oldUser)) return;

		// Depending if the user is logged in get the id
		let oldId = oldUser[parameters.user.USER_ID] ? oldUser[parameters.user.USER_ID] : oldToken;
		let newId = oldUser[parameters.user.USER_ID] ? oldUser[parameters.user.USER_ID] : newToken;

		usersManagement.setUsersData({}, oldId, false, true);
		
		let newUser = _.cloneDeep(oldUser);
		
		let mobileObject = usersManagement.getMobileObject(newUser, oldToken);
		
		if (mobileObject) {
			mobileObject[parameters.messageChannels.TOKEN] = newToken;
		} 

		logger.info(`Mobile Management: Updating mobile app token [old token, new token][${data[parameters.messageChannels.OLD_TOKEN]}, ${data[parameters.messageChannels.OLD_TOKEN]}]`);

		usersManagement.setUsersData(newUser, newId, false, true);
	}
	
	const mobileDelete = data => {

		let mobileCallData = _.cloneDeep(data);
		mobileCallData.call = 'mobileDelete';

		if (mobileCallsLogs.length < 20) {
			mobileCallsLogs.push(mobileCallData);
		} else {
			mobileCallsLogs.pop();
			mobileCallsLogs.unshift(mobileCallData);
		}

		// Mobile registration function
		const token = data[parameters.messageChannels.TOKEN];
		
		let user = usersManagement.getMobileUser(token);
		
		if (_.isEmpty(user)) return;

		user[parameters.messageChannels.MOBILES] = user[parameters.messageChannels.MOBILES].filter(mobile => mobile[parameters.messageChannels.TOKEN] !== token);

		logger.info(`Mobile Management: Deleting mobile app registration for token [${data[parameters.messageChannels.TOKEN]}]`);
		usersManagement.setUsersData(user, usersManagement.getMobileUserId(user), false, true);
	}
	
	const mobileCallsTest = (req, res) => {
		res.send(mobileCallsLogs);
	}

	return {
		mobileConnect,
		mobileLogout,
		mobileTokenUpdate,
		mobileDelete,
		mobileCallsTest
	}
}
