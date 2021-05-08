"use strict";
const parameters = require('../parameters');

module.exports  = (clients, usersManagement, messagingSettings, messageHandler) => {

	// Api method for retrieving users list
	/*clients.addHttpInEvent({
		name: 'getLoggedInUsers',
		url: '/api/fetch/users',
		handler: function(req, res) {
			const users = usersManagement.getUsers();
			const loggedInUsers = Object.keys(users)
				.map(id => users[id])
				.filter(user => user[parameters.user.USER_ID]);
			res.send(loggedInUsers);
		},
		method: 'get'
	})*/
	
	// Api methods for retrieving list of logged out users
	clients.addHttpInEvent({
		name: 'getLoggedOutUsers',
		url: '/api/fetch/visitors',
		handler: function(req, res) {
			const users = usersManagement.getUsers();
			const loggedOutUsers = Object.keys(users)
				.map(id => users[id])
				.filter(user => !user[parameters.user.USER_ID]);
			res.send(loggedOutUsers);
		},
		method: 'get'
	})
	

	// Api method for retrieving a list of users with push notifications enabled
	clients.addHttpInEvent({
		name: 'getBrowserPushUsers',
		url: '/api/fetch/push',
		handler: function(req, res) {
			const users = usersManagement.getUsers();
			const pushUsers = Object.keys(users)
				.map(id => users[id])
				.filter(user => user[parameters.messageChannels.PUSH].length);
			res.send(pushUsers);
		},
		method: 'get'
	})
	
	// Api method for retrieving a list of mobile app users
	clients.addHttpInEvent({
		name: 'getMobileUsers',
		url: '/api/fetch/mobiles',
		handler: function(req, res) {
			const users = usersManagement.getUsers();
			const mobileUsers = Object.keys(users)
				.map(id => users[id])
				.filter(user => user[parameters.messageChannels.MOBILES].length);
			res.send(mobileUsers);
		},
		method: 'get'
	})
	
	clients.addHttpInEvent({
		name: 'getAllUsers',
		url: '/api/fetch/users',
		handler: function(req, res) {
			res.send(usersManagement.getUsers());
		},
		method: 'get'
	})

	clients.addHttpInEvent({
		name: 'csvStats',
		url: '/api/fetch/csv/stats',
		handler: function(req, res) {
			res.send(usersManagement.getCsvStats(req.body.users));
		},
		method: 'post',
	});

	clients.addHttpInEvent({
		name: 'userStats',
		url: '/api/fetch/stats',
		handler: function(req, res) {
			res.send(usersManagement.getUserStats());
		},
		method: 'get',
	});

	clients.addHttpInEvent({
		name: 'mongoStats',
		url: '/api/fetch/stats/mongo',
		handler: function(req, res) {
			usersManagement.getMongoStats().then(d => {

				res.send(d);
			})
		},
		method: 'get',
	});


	clients.addHttpInEvent({
		name: 'mssqlTest',
		url: '/api/fetch/mssql/:id',
		handler: function(req, res){
			let userId = req.params.id;
			usersManagement.getUsersDataFromMssql(userId)
				.then(data => {
					res.send(data);
				})
		},
		method: 'get'
	})

	clients.addHttpInEvent({
		name: 'mongodbTest',
		url: '/api/fetch/mongo/:id',
		handler: function(req, res){
			let userId = req.params.id;
			usersManagement.getUsersDataFromMongo(userId)
				.then(data => {
					res.send(data);
				})
				
		},
		method: 'get'
	})


	clients.addHttpInEvent({
		name: 'userInfo',
		url: '/api/fetch/user/:id',
		handler: function(req, res){
			let userId = req.params.id;
			res.send(usersManagement.getUser(userId));
		},
		method: 'get'
	})

	
	clients.addHttpInEvent({
		name: 'dataDuplicates',
		url: '/api/fetch/users/duplicates',
		handler: function(req, res){
			let duplicates = {
				mobileTokens: {},
				mobileDeviceId: {},
				browserTokens: {},
				browserMachineHash: {}
			};

			let users = usersManagement.getUsers();

			Object.keys(users)
				.map(id => users[id])
				.map(user => {
					user[parameters.messageChannels.MOBILES].map(mobile => {
						let token = mobile[parameters.messageChannels.TOKEN];
						let deviceId = mobile[parameters.messageChannels.DEVICE_ID];

						if(duplicates.mobileTokens[token]){
							duplicates.mobileTokens[token]++;
						}else{
							duplicates.mobileTokens[token] = 1;
						}

						if(duplicates.mobileDeviceId[deviceId] && deviceId){

							duplicates.mobileDeviceId[deviceId]++;
						}else{
							duplicates.mobileDeviceId[deviceId] = 1;
						}
					})

					user[parameters.messageChannels.PUSH].map(push => {
						if(duplicates.browserTokens[push[parameters.messageChannels.TOKEN]]){
							duplicates.browserTokens[push[parameters.messageChannels.TOKEN]]++;
						}else{
							duplicates.browserTokens[push[parameters.messageChannels.TOKEN]] = 1;
						}

						if(duplicates.browserMachineHash[push[parameters.messageChannels.MACHINE_HASH]]){
							duplicates.browserMachineHash[push[parameters.messageChannels.MACHINE_HASH]]++;
						}else{
							duplicates.browserMachineHash[push[parameters.messageChannels.MACHINE_HASH]] = 1;
						}
					})
				})

			let result = {
				mobileTokenDuplicates: [],
				mobileDeviceDuplicates: [],
				browserTokenDuplicates: [],
				browserMachineHashDuplicates: [],
			};
			
			result.totalDuplicatesNumber = 0;
			result.totalMobileDuplicatesNumber = 0;
			result.totalPushDuplicatesNumber = 0;

			Object.keys(duplicates.mobileTokens)
				.map(token => {
					if(duplicates.mobileTokens[token] > 1){
						result.mobileTokenDuplicates.push(token);
						result.totalMobileDuplicatesNumber++;
					}
				});

			Object.keys(duplicates.mobileDeviceId)
				.map(deviceId => {
					if(duplicates.mobileDeviceId[deviceId] > 1){
						result.mobileDeviceDuplicates.push(deviceId);
						result.totalMobileDuplicatesNumber++;
					}
				});
			
			Object.keys(duplicates.browserTokens)
				.map(browserToken => {
					if(duplicates.browserTokens[browserToken] > 1){
						result.browserTokenDuplicates.push(browserToken);
						result.totalPushDuplicatesNumber++;
					}
				});

			Object.keys(duplicates.browserMachineHash)
				.map(browserMachineHash => {
					if(duplicates.browserMachineHash[browserMachineHash] > 1){
						result.browserMachineHashDuplicates.push(browserMachineHash);
						result.totalPushDuplicatesNumber++;
					}
				});
			
			result.totalDuplicatesNumber = result.totalMobileDuplicatesNumber + result.totalPushDuplicatesNumber;
			res.send(result);
		},
		method: 'get'
	});


	clients.addHttpInEvent({
		name: 'dataDuplicatesMongo',
		url: '/api/fetch/mongodb/duplicates',
		handler: function(req, res){
			let duplicates = {
				mobileTokens: {},
				mobileDeviceId: {},
				browserTokens: {},
				browserMachineHash: {}
			};
			
			usersManagement.getMongoUserList()
				.then(users => {
					console.log('We got users', users.length);

					users.map(user => {
						user[parameters.messageChannels.MOBILES].map(mobile => {
							let token = mobile[parameters.messageChannels.TOKEN];
							let deviceId = mobile[parameters.messageChannels.DEVICE_ID];

							if(duplicates.mobileTokens[token]){
								duplicates.mobileTokens[token]++;
							}else{
								duplicates.mobileTokens[token] = 1;
							}

							if(duplicates.mobileDeviceId[deviceId] && deviceId){

								duplicates.mobileDeviceId[deviceId]++;
							}else{
								duplicates.mobileDeviceId[deviceId] = 1;
							}
						})

						user[parameters.messageChannels.PUSH].map(push => {
							if(duplicates.browserTokens[push[parameters.messageChannels.TOKEN]]){
								duplicates.browserTokens[push[parameters.messageChannels.TOKEN]]++;
							}else{
								duplicates.browserTokens[push[parameters.messageChannels.TOKEN]] = 1;
							}

							if(duplicates.browserMachineHash[push[parameters.messageChannels.MACHINE_HASH]]){
								duplicates.browserMachineHash[push[parameters.messageChannels.MACHINE_HASH]]++;
							}else{
								duplicates.browserMachineHash[push[parameters.messageChannels.MACHINE_HASH]] = 1;
							}
						})
					})
				
					let result = {
						mobileTokenDuplicates: [],
						mobileDeviceDuplicates: [],
						browserTokenDuplicates: [],
						browserMachineHashDuplicates: [],
					};
					let responseData = {};

					responseData.totalDuplicatesNumber = 0;
					responseData.totalMobileDuplicatesNumber = 0;
					responseData.totalPushDuplicatesNumber = 0;

					Object.keys(duplicates.mobileTokens)
						.map(token => {
							if(duplicates.mobileTokens[token] > 1){
								result.mobileTokenDuplicates.push(token);
								responseData.totalMobileDuplicatesNumber++;
							}
						});

					Object.keys(duplicates.mobileDeviceId)
						.map(deviceId => {
							if(duplicates.mobileDeviceId[deviceId] > 1){
								result.mobileDeviceDuplicates.push(deviceId);
								responseData.totalMobileDuplicatesNumber++;
							}
						});
					
					Object.keys(duplicates.browserTokens)
						.map(browserToken => {
							if(duplicates.browserTokens[browserToken] > 1){
								result.browserTokenDuplicates.push(browserToken);
								responseData.totalMobileDuplicatesNumber++;
							}
						});

					Object.keys(duplicates.browserMachineHash)
						.map(browserMachineHash => {
							if(duplicates.browserMachineHash[browserMachineHash] > 1){
								result.browserMachineHashDuplicates.push(browserMachineHash);
								responseData.totalMobileDuplicatesNumber++;
							}
						});
					
					responseData.totalDuplicatesNumber = responseData.totalMobileDuplicatesNumber + responseData.totalPushDuplicatesNumber;
					res.send(responseData);
				})

				
			
		},
		method: 'get'
	});



	clients.addHttpInEvent({
		name: 'pushUserList',
		url: '/api/fetch/push/users',
		handler: function(req, res){
			let users = usersManagement.getUsers();
			
			let numberOfPush = 0;
			let result = {
				numberOfPush: 0,
				en: 0
			}
			Object.keys(users)
				.map(id => {
					let user = users[id];
					
					user[parameters.messageChannels.PUSH].map(push => {
						if(push.token) {
							result.numberOfPush++;
							if(push.language === 'en'){
								result.en++;
							}
						}
					})				
				})
			res.send(result);
		},
		method: 'get'
	})

	clients.addHttpInEvent({
		name: 'deleteMobileDevice',
		url: '/api/mobile/delete/:token',
		handler: function(req, res){
			
			let token = req.params.token;
			if(!token) return res.send('no token');

			usersManagement.deleteMobileDevice(token);

			res.send('ok');
		},
		method: 'get'
	})

	clients.addHttpInEvent({
		name: 'deleteUser',
		url: '/api/delete/user',
		handler: function(data) {
			const id = data.userId;
			usersManagement.deleteUser(id);
		},
		method: 'post',
		distributed: true
	})

	
	clients.addHttpInEvent({
		name: 'removeInvalidMobiles',
		url: '/api/mobiles/clean',
		handler: function(data){
			
			console.log('Ivalid mobiles cleanup: Request received');
			let mobileTokens = usersManagement.getAllMobileTokens();
			console.log('Ivalid mobiles cleanup: Tokens list retreived');
			
			messageHandler.drySend(mobileTokens).then(data => {
				console.log('Ivalid mobiles cleanup: List of invalid tokens retreived');
				data.invalidTokens.map(token => {
					usersManagement.deleteMobileApp(token);
				})
				console.log('Ivalid mobiles cleanup: Invalid tokens removed');

			})
			.catch(err => {
				console.log(err);
			})
			
			//res.send('Ivalid mobiles cleanup: Request received');
		},
		method: 'get',
		distributed: true
	});

	/**
	 * Internal Token Clean
	 *
	 * Redis event called after send request to clean invalid
	 * tokens held in the system.
	 *
	 * @note No re-checking is done here, tokens passed are deleted.
	 */
	clients.addRedisInEvent({
		name: 'removeTokens',
		data: [
			'tokens',
			'type'
		],
		handler: (data) => {

			const { type, tokens } = data;

			if (type && tokens.length) {
				if (usersManagement.cleanTokens(tokens, type)) {
					clients.publishRedis('broadcastUserStats', {
						event: 'cleanTokensUpdate'
					});
				}
			}
		}
	});

	/*clients.addHttpInEvent({
		name: 'testMssqlCalls',
		url: '/api/test/mssql',
		handler: function(req, res){
			usersManagement.testMssqlCalls();
			
			res.send('Mssql test request received');
		},
		method: 'get'
	})
*/


}
