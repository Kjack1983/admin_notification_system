"use strict";
const config = require('../config');
const parameters = require('../parameters');
const OldMobileModel = require('../../models/mobile');
const FCM = require('fcm-push');
const fcm = new FCM(config.clientFcmServerKey);
const _ = require('lodash');
const async = require('async');
const getJSON = require('get-json');


module.exports  = (databaseTransform, usersManagement, messagingSettings) => {
	
	let messageContentTemplate =  {
		priority: 'high',
		collapse_key: 'Market Alert',
		dry_run: true,
		title: '',
		detail: '',
		notification: {
			title: '',
			body: ''
		},
		data: {
			screen: '1',
			pair: '',
			title: '',
			detail: ''
		},
	};
	
	const clearRegistrationsTrigger = (users, deleteInvalid) => {
		
		let mobiles = users
			.filter(user => user.system !== 'pushy')
			.map(user => user.token);
		
		console.log('Mobile Management: Clean mobile registration initialized [mobile registrations number]', mobiles.length);

		let iterationNumber = Math.ceil(mobiles.length / 1000);
		
		let success = 0, failures = 0;
		
		let failureTokens = [];
		let fcmCalls = [];
		
		for (let i = 0; i < iterationNumber; i++) {
			let message = Object.assign({}, messageContentTemplate);
			message.dry_run = true;
			message.registration_ids = mobiles.slice(i*1000, 1000*(i+1));
			fcmCalls.push(fcmSend.bind(null, message));
		}
		
		return new Promise(function(fullfill, reject){
			async.series(fcmCalls, function(err, res){
				if(err){
					reject(err);
					return;
				}
				var result = res.reduce((curr, next) => {
					if(!curr) return next;
					next.success = curr.success +	next.success;
					next.failures = curr.failures + next.failures;
					next.invalidTokens = curr.invalidTokens.concat(next.invalidTokens);
					return next;
				});
				result.invalidTokensLength = result.invalidTokens.length;
				fullfill(result);
				
			})
		})
	}

	const fcmSend = (message, callback) => {
		let result = {
			success: 0,
			failures: 0,
			invalidTokens: []
		};
		
		fcm.send(message, (err, response) => {
			if(err) {
				// or should i pass all the results?
				console.log('Error: ', err);
				callback(null, result);
				return
			}
			try{
				let responseObject = JSON.parse(response);
				result.success = responseObject.success;
				result.failures = responseObject.failure;
				if(responseObject.results && responseObject.results.length > 0){
					responseObject.results.forEach((responseMessage, i) => {
						if(responseMessage.error) {
							result.invalidTokens.push(message.registration_ids[i]);
						}
					})
				}
				callback(null, result);
				return
			}
			catch(err){
				console.log('Catching error', err);
				//callback(null, result);
			}
		})
	}
	
	
	const mobileConnect = data => {
		
		// Make sure userID is in correct format
		if(data[parameters.user.USER_ID] === 'null') {
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
			})
	
		if(!languageValid){
			data[parameters.user.LANGUAGE] = 'en';
		}
		// Get user object template	
		const userModel = usersManagement.getUserModel();
		
		const sql = usersManagement.getSqlConnection();
		
		let mobileConnectionDates = usersManagement.removeMobileFromUsers(data[parameters.messageChannels.TOKEN], data[parameters.messageChannels.DEVICE_ID], id);

		/*
		 * Build updated user data, from potential existin users object, user 
		 * template and receivied data
		 */
		let user = Object.assign({}, userModel, usersManagement.getUser(id));

		if(!user) return;
		
		// In case the user registration is new, we need to set userId
		user[parameters.messageChannels.TOKEN] = data[parameters.messageChannels.TOKEN];
		if(id !== user[parameters.user.USER_ID]){
			user[parameters.user.USER_ID] = data[parameters.user.USER_ID];
		}
		
		data[parameters.messageChannels.FIRST_CONNECTION_DATE] = mobileConnectionDates || new Date();
		
		data[parameters.messageChannels.LAST_CONNECTION_DATE] = new Date();
		

		if(!data[parameters.messageChannels.APP_VERSION_NUMBER]){
			data[parameters.messageChannels.APP_VERSION_NUMBER] = null;
		}
		
		if(!data[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD]) {
			data[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD] = 'fcm';
		}
		
		
		let mobileRegistrations = user[parameters.messageChannels.MOBILES];
		
		mobileRegistrations.push(data);
		
		usersManagement.setUsersData(user, id, true, true);
			
		return 1;
	}


	const transformMobileData = (data) => {
		
		console.log('Mobile Management: Initializing MongoDB mobile data transformation');
		
		OldMobileModel
			.find({}, {}, {timeout:false})
			.exec()
			.then(savedUsers => {
				var validUsers = 0;
				var duplicateTokens = 0;
				var duplicatDeviceIds = 0;
				var deviceIdObjects = {};
				var tokensObject = {};
				console.log('Mobile Management: Old data retrieved.', savedUsers.length)
			
				savedUsers.map(function(savedUser){
					if(savedUser.token){
						validUsers++;
						var token = savedUser.token;
						if(tokensObject[token]) {
							tokensObject[token]++;
							duplicateTokens++;
						}else{
							tokensObject[token] = 1;
						}

					}
				
					if(savedUser.deviceID){
						var deviceID = savedUser.deviceID;
						if(deviceIdObjects[deviceID]) {
							deviceIdObjects[deviceID]++;
							duplicatDeviceIds++;
						}else{
							deviceIdObjects[deviceID] = 1;
						}
					}
				})
				
				console.log('Mobile Management: Old data transformation step 1', savedUsers.length);

				savedUsers = savedUsers
					.filter(user => tokensObject[user.token] === 1)
					.filter(user => {
						if(!user.deviceID) return true;
						return deviceIdObjects[user.deviceID] === 1
					});
				//savedUsers = savedUsers.slice(0, 12000);
				//savedUsers = savedUsers.slice(0, 1100);
				console.log('Push Management: Old data trasnformation step 2', savedUsers.length);
			
				let invalidTokens = [];				
				
				clearRegistrationsTrigger(savedUsers, true).then(response => {
					invalidTokens = invalidTokens.concat(response.invalidTokens);
					console.log('Invalid tokens length', invalidTokens.length);

					savedUsers = savedUsers.filter(user => invalidTokens.indexOf(user.token) === -1);
					
					console.log('Mobile Management: Old data trasnformation step 3', savedUsers.length);
					
					let idMaps = {};

					savedUsers.map(savedUser => {
						let userData = {};
					
						userData[parameters.user.USER_ID] = savedUser[parameters.user.USER_ID];
						userData[parameters.user.CULTURE] = savedUser[parameters.user.CULTURE];
						userData[parameters.user.LANGUAGE] = savedUser[parameters.user.LANGUAGE];
						userData[parameters.messageChannels.TOKEN] = savedUser[parameters.messageChannels.TOKEN];
						userData[parameters.messageChannels.SYSTEM] = savedUser[parameters.messageChannels.SYSTEM];
						userData[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD] = savedUser[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD];
						userData[parameters.messageChannels.DEVICE_ID] = savedUser[parameters.messageChannels.DEVICE_ID];
						userData[parameters.messageChannels.APP_VERSION_NUMBER] =  savedUser[parameters.messageChannels.APP_VERSION_NUMBER] ? savedUser[parameters.messageChannels.APP_VERSION_NUMBER] : null;
						userData[parameters.user.MOBILE_PAIRS]  = savedUser.pairs; 
						
						/*if(savedUser.pairs.length){
							//console.log(userData[parameters.user.USER_ID] + ':' + savedUser.pairs);
							idMaps[userData[parameters.user.USER_ID]] = savedUser.pairs;
						}*/
						
						
						mobileConnect(userData);
					})
					/*Object.keys(idMaps).map(id => {
						console.log('Callign for id, his pairs array on production is fine');
						usersManagement.getUsersDataFromMssql(id);
					})*/
					console.log('Mobile Transformation completed');
				})


		})

			
	}

	/*
	 * Transforming mongodb mobile registration to the new structure. This should be one off action
	 * that is triggered when making transition between old and new server version. In the updated 
	 * server we store data in different format. In order not to lose old registration we need a way
	 * to get data stored in the mongodb using the old format and add it to the new system
	 *
	 */
	databaseTransform.addHttpInEvent({
		name: 'transformMobileData',
		handler: transformMobileData,
		data: [],
		method: 'get',
		distributed: true,
		url: '/devices/mobile/transform'
	});
	


}