"use strict";
const config = require('../config');
const parameters = require('../parameters');
const OldPushModel = require('../../models/push');
const FCM = require('fcm-push');
const fcm = new FCM(config.clientFcmServerKey);
const _ = require('lodash');
const async = require('async');
const getJSON = require('get-json');
const fs  = require('fs');
const path = require('path');

module.exports  = (databaseTransform, usersManagement,messagingSettings) => {

	let messageContentTemplate =  {
		priority: 'high',
		collapse_key: 'Market Alert',
		dry_run: true,
		title: '',
		detail: '',
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



	const pushSubscribe  = data => {
		// From received data we get id, and user object 
		const id = usersManagement.getUserId(data);
		const userModel = usersManagement.getUserModel();
		const machineHash = data[parameters.messageChannels.MACHINE_HASH];
		const language = data[parameters.user.LANGUAGE];
		const token = data[parameters.messageChannels.TOKEN];
		
		usersManagement.removePushRegistrations(token, machineHash, id);
		
		let user = Object.assign({}, userModel, usersManagement.getUser(id), data);
		
		user[parameters.user.PAIRS] = usersManagement.generateUserPairs(user);

		Object.keys(user)
			.forEach(key => {
				if(!(key in userModel)){
					delete user[key];
				}
			})
		
		
		
		// Get push data array	
		
		let pushData = user[parameters.messageChannels.PUSH];
		
		// Add push data to the array
		let pushRegistration = {
			[parameters.messageChannels.MACHINE_HASH]: machineHash,
			[parameters.messageChannels.TOKEN]: token,
			[parameters.user.LANGUAGE]: language,
			[parameters.messageChannels.PUSH_ACTIVE]: user[parameters.user.MARKET_ALERT_ALLOW],
			[parameters.user.USER_ID]: data[parameters.user.USER_ID]

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
		
		// Update user's socket information
		usersManagement.setUsersData(user, id, false, true);
		
	}
	
	
	const transformPushData = (data) => {
		console.log('Push Management: Received push MongoDB transformation request.');
		
		
		const getJSON = require('get-json');
		fs.readFile('./production-push.json', 'utf8', (err, response) => {
		//getJSON('https://notify.easymarkets.com/api/fetch/push', (err, response) => {
			if(err){
				console.log('Push Management: There was a problem while retrieving the old data.', err);
				return;
			}
			response = JSON.parse(response);
			
			console.log('Push Management: Old data retrieved.', Object.keys(response).length)
			let savedUsers = Object.keys(response)
				.filter(key => response[key].token)
				.map(key => response[key]);
			console.log('Push Management: Old data transformation step 1.', savedUsers.length);
			var validUsers = 0;
			var duplicateTokens = 0;
			var tokensObject = {};
			
			savedUsers.map( savedUser => {
				var token = savedUser.token;
				if(tokensObject[token]) {
					tokensObject[token]++;
					duplicateTokens++;
				}else{
					tokensObject[token] = 1;
				}

			})
			savedUsers = savedUsers
				.filter(user => tokensObject[user.token] === 1)
			
			console.log('Push Management: Old data trasnformation step 2', savedUsers.length);
			
			let invalidTokens = [];				
			
			clearRegistrationsTrigger(savedUsers, true).then(response => {
				invalidTokens = invalidTokens.concat(response.invalidTokens);
				console.log('Invalid tokens length', invalidTokens.length);

				savedUsers = savedUsers.filter(user => invalidTokens.indexOf(user.token) === -1);
				savedUsers.map(savedUser => {
					let userData = {};
					userData[parameters.messageChannels.TOKEN] = savedUser[parameters.messageChannels.TOKEN];
					userData[parameters.user.LANGUAGE] = savedUser[parameters.user.LANGUAGE];
					userData[parameters.user.USER_ID] = savedUser[parameters.user.USER_ID];
					userData[parameters.user.PAIRS] = savedUser[parameters.user.PAIRS];
					userData[parameters.messageChannels.TOKEN] = savedUser[parameters.messageChannels.TOKEN];
					userData[parameters.messageChannels.MACHINE_HASH] = savedUser[parameters.messageChannels.MACHINE_HASH];
					userData[parameters.messageChannels.TAB_ACTIVE] = false;
					
					pushSubscribe(userData);
				})		
				console.log('Push Management: Old data trasnformation step 3', savedUsers.length);
			})

		})
	}

	databaseTransform.addHttpInEvent({
		name: 'transformPushData',
		handler: transformPushData,
		data: [],
		method: 'get',
		distributed: true,
		url: '/devices/push/transform'
	});


}