"use strict";
/*
 * getArrayDifference
 * getSocket
 * getUserModel
 * getSqlConnection
 * mssqlUpdateNeeded
 * 
 * getUserId
 * getMobileUserId
 * getPushUserId
 * getUser
 * getUsers
 * getMobileUser
 * getSocketUser
 *
 * getBrowserObject
 * getSocketObject
 * getPushObject
 * getMobileObject
 * 
 * getCsvStats
 * getUserStats
 * getUsersStats
 * getMongoStats
 * getMongoUserList
 * 
 * getUsersDataFromMssql
 * getUsersDataFromMongo
 * removeMobileDuplicatesFromDbRecord
 * getUsersDatabaseRecords
 *
 * init
 *
 * setUsersData
 
 * deleteMongoDbRecord
 * updateUserMongoDbRecord
 * mssqlUpdate
 * 
 * removePushRegistrations
 * removeMobileFromUsers
 * 
 * setInstrumentFormat
 * joinRooms
 * generateUserPairs
 * getMarketAlertReceivers
 * 
 */
const parameters = require('../parameters');
const globalPairs = require('../config').globalPairs;
let io;
const log = require('single-line-log').stdout;
const UsersModel = require('../../models/user');
const async = require('async');
const _ = require('lodash');
const config = require('../config');
let sql = require('mssql');
let mssqlPool;
const fs = require('fs');
const mongoose = require('mongoose');
const getJSON = require('get-json');
const mongoDbDataProcessing = require('./mongoDbDataProcessing');
const serverInitialization = require('./serverInitialization');
const marketAlertsConfig = require('../config');
const dbName = marketAlertsConfig.db.name;
const connectionString = marketAlertsConfig.db.connection + dbName;
const Redis = require('ioredis');

mongoose.Promise = require('bluebird');
mongoose.connect(connectionString, {useMongoClient: true});

module.exports = function(messagingSettings){
	let users = {};
	
	// Lookup maps for easier access to devices
	let socketToUser = {};
	let pushToUser = {};
	let browserToUser = {};
	let mobileToUser = {};
	let mobileDeviceIdToUser = {};
	let userToDevices = {};


	const socketConnection = {
		[parameters.messageChannels.SOCKET_ID]: '',
		[parameters.messageChannels.SOCKET_ACTIVE]: '',
		[parameters.user.LANGUAGE]: '',
		[parameters.messageChannels.MACHINE_HASH]: '',
		[parameters.tracking.USER_AGENT]: '', 
		[parameters.tracking.IP]: '', 
		[parameters.tracking.COUNTRY]: '', 
		[parameters.tracking.COUNTRY_ISO_CODE]: '', 
		[parameters.tracking.TIME_ZONE]: '',
		[parameters.tracking.LATITUDE]: '',
		[parameters.tracking.LONGITUDE]: ''
	};

	const browser = {
		[parameters.messageChannels.MACHINE_HASH]: '',
		[parameters.messageChannels.TOKEN]: '',
		[parameters.user.LANGUAGE]: '',
		[parameters.messageChannels.PUSH_ENABLED]: false,
		[parameters.user.TEST_ENABLED]: false,
		[parameters.messageChannels.PUSH_ACTIVE]: false,
		[parameters.tracking.USER_AGENT]: '', 
		[parameters.tracking.IP]: '', 
		[parameters.tracking.COUNTRY]: '', 
		[parameters.tracking.COUNTRY_ISO_CODE]: '', 
		[parameters.tracking.TIME_ZONE]: '',
		[parameters.tracking.LATITUDE]: '',
		[parameters.tracking.LONGITUDE]: ''
	}

	const push = {
		[parameters.messageChannels.MACHINE_HASH]: '',
		[parameters.messageChannels.TOKEN]: '',
		[parameters.user.LANGUAGE]: '',
		[parameters.messageChannels.PUSH_ACTIVE]: false,
		[parameters.tracking.USER_AGENT]: '', 
		[parameters.tracking.IP]: '', 
		[parameters.tracking.COUNTRY]: '', 
		[parameters.tracking.COUNTRY_ISO_CODE]: '', 
		[parameters.tracking.TIME_ZONE]: '',
		[parameters.tracking.LATITUDE]: '',
		[parameters.tracking.LONGITUDE]: ''
	}

	const mobile = {
		[parameters.messageChannels.TOKEN]: '',
		[parameters.user.LANGUAGE]: '',
		[parameters.user.USER_ID]: null,
		[parameters.messageChannels.SYSTEM]: '',
		[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD]: '',
		[parameters.messageChannels.FIRST_CONNECTION_DATE]: '',
		[parameters.messageChannels.LAST_CONNECTION_DATE]: '',
		[parameters.messageChannels.LAST_CONNECTION_DATE]: '',
		[parameters.messageChannels.APP_VERSION_NUMBER]: '',
		[parameters.messageChannels.ANNOUNCEMENTS]: '',
		[parameters.tracking.IP]: '', 
		[parameters.tracking.COUNTRY]: '', 
		[parameters.tracking.COUNTRY_ISO_CODE]: '', 
		[parameters.tracking.TIME_ZONE]: '',
		[parameters.tracking.LATITUDE]: '',
		[parameters.tracking.LONGITUDE]: ''

	}

	const userModel = {
		[parameters.user.USER_ID]: null,
		[parameters.user.MONGO_ID]: null,
		[parameters.messageChannels.MACHINE_HASH]: '',
		[parameters.messageChannels.TOKEN]: '',
		[parameters.user.USER_LOGGED_IN]: false,
		[parameters.user.PAIRS]: [],
		[parameters.user.MOBILE_PAIRS]: [],
		[parameters.user.ANNOUNCEMENTS]: [],
		[parameters.user.TEST_ENABLED]: false,
		[parameters.user.MARKET_ALERT_ALLOW]: true,
		[parameters.user.STOPLOSS_ALERT_ALLOW]: true,
		[parameters.user.DIRECT_MESSAGE_ALLOW]: true,
		[parameters.user.CULTURE]: 'eu',
		[parameters.user.ACCOUNT_BASE_CURRENCY]: null,
		[parameters.user.ALLOW_DEPOSIT]: null,
		[parameters.user.ALLOW_WITHDRAWAL]: null,
		[parameters.user.ALLOWED_CANCELLATION]: null,
		[parameters.user.COUNTRY_NAME]: null,
		[parameters.user.COUNTRY_ID]: null,
		[parameters.user.DEFAULT_PORTAL]: null,
		[parameters.user.DEMO_EXPIRATION_DAYS]: null,
		[parameters.user.HAS_CREDIT_CARD]: null,
		[parameters.user.HAS_MT4_ACCOUNT]: null,
		[parameters.user.IS_ACTIVE]: null,
		[parameters.user.IS_ACCOUNT_CLOSED]: null,
		[parameters.user.WITHDRAWAL_AVAILABLE]: null,
		[parameters.messageChannels.PUSH]: [],
		[parameters.messageChannels.SOCKETS]: [],
		[parameters.messageChannels.BROWSERS]: [],
		[parameters.messageChannels.MOBILES]: [],
	}

	const segmentation = require('./segmentation')();
	const usersFiltering = require('./turboFiltering')(users, segmentation);

	/*
	 * Utility functions
	 */
	
	/*
	 * Helper function that returns elements from target array that are 
	 * not present in source. 
	 * 
	 * The function is used to determine rooms that need to be joined/left by sockets
	 *
	 * @param array target
	 * @param array source
	 * @return array
	 */
	const getArrayDifference = (target, source, io) => {
		return target.filter(t => source.indexOf(t) === -1);
	}
	
	/*
	 * Facade to getting the socket instace from socketId
	 *
	 * @param string socketId
	 * @param object io socketio instance
	 * @return object socket instance
	 *
	 */
	const getSocket = (socketId, io) => io.sockets.connected[socketId];
	
	// Pass user's object template
	const getUserModel = () => _.cloneDeep(userModel);
	
	// Pass the sql connection if available
	const getSqlConnection = () => {
		if (sql.error) return null;
		return sql;
	};
	
	// Helper function used to decide if the user need mssql information
	const mssqlUpdateNeeded = user => {
		
		if(!user) return false;
		
		if(!user[parameters.user.USER_ID]) return false;
		
		if(user[parameters.messageChannels.MOBILES].length === 0) return false;

		return true;
	}

	/*
	 * Helper methods
	 */
	
	
	/* 
	 * Helper function to get user identifier. 
	 * 
	 * It checks if there is userId in data object and returns it if there 
	 * (Logged in users). If userId is null return machineHash (Logged out users).
	 *
	 * @param object data. Users data
	 * @return string id. 
	 */
	const getUserId = data => {
		return data[parameters.user.USER_ID] || data[parameters.messageChannels.MACHINE_HASH] || data[parameters.messageChannels.TOKEN];
	}

	/**
	 * Get Mobile user id
	 *
	 * Mobile devices stay attached to logged in user when logged out
	 * to persist the ability to target specific users.  This means user id should
	 * be returned if logged in, user id should be returned if logged out but
	 * has previously logged in (mobileToUser) and fallback to machine hash / token
	 * if never logged in (getUserId).
	 *
	 * @param {object} data Users data to check
	 * @return {integer|string}
	 */
	const getMobileUserId = data => {
		// Check to see if we already have a user with provided device
		if (!data[parameters.user.USER_ID] && mobileToUser[data[parameters.messageChannels.TOKEN]]) {
			return mobileToUser[data[parameters.messageChannels.TOKEN]];
		} else {
			return getUserId(data);
		}
	}

	/**
	 * Get Push user id
	 *
	 * Browser push stay attached to logged in user when logged out
	 * to persist the ability to target specific users.  This means user id should
	 * be returned if logged in, user id should be returned if logged out but
	 * has previously logged in (pushToUser) and fallback to machine hash / token
	 * if never logged in (getUserId).
	 *
	 * @param {object} data Users data to check
	 * @return {integer|string}
	 */
	const getPushUserId = data => {
		// Check to see if we already have a user with provided push token
		if (!data[parameters.user.USER_ID] && pushToUser[data[parameters.messageChannels.TOKEN]]) {
			return pushToUser[data[parameters.messageChannels.TOKEN]];
		} else {
			return getUserId(data);
		}
	}

	
	// Get user based on id
	const getUser = id => {
		if(!id || !users[id]) return {};
		return _.cloneDeep(users[id]);
	}

	const getUsers = () => users;
	
	// Get user from mobile token
	const getMobileUser = token => {
		
		if(!mobileToUser[token]) return {};
		
		let id = mobileToUser[token];
			
		if(!users[id]) return {};

		return _.cloneDeep(users[id]);

	}

	/*
	 * Helper function that searches users to lookup users based on 
	 * socketId
	 * 
	 * @param string socketId
	 * @return object users' data
	 *
	 */
	const getSocketUser = (socketId) => {
		if(!socketId || !socketToUser[socketId]) return {};
		
		let id = socketToUser[socketId];

		if(!users[id]) return {};

		return _.cloneDeep(users[id]);

	}


	/*
	 * Helper function that gives access to the browser object 
	 * within users' data
	 * 
	 * @param string id user's id
	 * @param string machineHash machine identifier
	 * @return object browser's data object
	 *
	 */
	const getBrowserObject = (usersData, machineHash) => {
		if(!usersData || _.isEmpty(usersData)) return {};
		let browserObject = usersData[parameters.messageChannels.BROWSERS].filter(machine => machine[parameters.messageChannels.MACHINE_HASH] === machineHash);
		return browserObject.length > 0 ? browserObject[0] : {} 
	}
	
	/*
	 * Helper functions to get socket/push/browser object from users object. It is
	 * used when we need to modify object record when updating user's data
	 * 
	 * @param string users id
	 * @param string socketId/machineHash/token
	 * @return object socket/push/mobile registration object
	 *
	 */
	const getSocketObject = (usersData, socketId) => {
		if(!usersData || _.isEmpty(usersData)) return {};
		let socketObject = usersData[parameters.messageChannels.SOCKETS].filter(socket => socket[parameters.messageChannels.SOCKET_ID] === socketId);
		return socketObject.length > 0 ? socketObject[0] : {}
	}

	const getPushObject = (usersData, machineHash) => {
		if(!usersData || _.isEmpty(usersData)) return {};
		let pushObject = usersData[parameters.messageChannels.PUSH].filter(machine => machine[parameters.messageChannels.MACHINE_HASH] === machineHash);
		return pushObject.length > 0 ? pushObject[0] : {};
	}

	const getMobileObject = (usersData, token) => {
		if(!usersData || _.isEmpty(usersData)) return {};
		let mobileObject = usersData[parameters.messageChannels.MOBILES].filter(mobile => mobile[parameters.messageChannels.TOKEN] === token);
		return mobileObject.length ? mobileObject[0] : {}
	}


	const getCsvStats = importedUsers => {

		let totalNumber = importedUsers.length;
		let totalAvailable = importedUsers.filter(id => users[id]).length;
		let totalUnavailable = importedUsers.filter(id => !users[id]).length;
		let totalActive = 0;

		importedUsers.filter(key => users[key])
			.map(id => users[id])
			.map(user => {
				if(user[parameters.messageChannels.SOCKETS].length > 0){
					totalActive++;
				}
			})
		
		let totalMobile = 0;
		let totalMobileDirectMessagesEnabled = 0;
		
		importedUsers.filter(id => users[id])
			.map(id => users[id])
			.map(usersData => {
				totalMobile = totalMobile + usersData[parameters.messageChannels.MOBILES].length;
				usersData[parameters.messageChannels.MOBILES].map(mobile => {
					if(mobile[parameters.messageChannels.APP_VERSION_NUMBER]){
						totalMobileDirectMessagesEnabled++;
					}
				})
			})

		return {
			totalNumber,
			totalAvailable,
			totalUnavailable,
			totalActive,
			totalMobile,
			totalMobileDirectMessagesEnabled
		}
	}

	const getUserStats = (customUserList) => {
		let userList = [];
		if(customUserList) {
			userList = customUserList;
		}else{
			userList = Object.keys(users).map(id => users[id]);
		}

		let individualUsers = userList.length;
		let loggedInUsers = userList
				.filter(usersData => usersData[parameters.user.USER_ID]).length;
		let loggedOutUsers = individualUsers - loggedInUsers;
		let mobileApps = 0;
		let browserPush = 0;
		let sockets = 0;
		let mobileAppsWithMarketAlerts = 0;
		let mobileAppsWithDirectMessages = 0;

		userList
			.map(usersData => {
				mobileApps = mobileApps + usersData[parameters.messageChannels.MOBILES].length
				browserPush = browserPush + usersData[parameters.messageChannels.PUSH].length;
				sockets = sockets + usersData[parameters.messageChannels.SOCKETS].length;
				
				if(usersData[parameters.user.MOBILE_PAIRS].length && usersData[parameters.user.MARKET_ALERT_ALLOW]){
					mobileAppsWithMarketAlerts = mobileAppsWithMarketAlerts + usersData[parameters.messageChannels.MOBILES].length
				}

				if(usersData[parameters.user.DIRECT_MESSAGE_ALLOW]){
					usersData[parameters.messageChannels.MOBILES].map(mobile => {
						if(mobile[parameters.messageChannels.APP_VERSION_NUMBER]){
							mobileAppsWithDirectMessages++;
						} 
					})
				}

			});
			
		return {
			individualUsers,
			loggedInUsers,
			loggedOutUsers,
			mobileApps,
			mobileAppsWithMarketAlerts,
			mobileAppsWithDirectMessages,
			browserPush,
			sockets
		}
	}
	
	/*
	 * Get current users stats
	 */
	const getUsersStats = (customUserList) => {
		return new Promise(resolve => {

			let totalUsers  = 0, 
				loggedInUsers = 0, 
				loggedOutUsers = 0,
				mobileUsers = 0,
				pushUsers = 0,
				socketUsers = 0;
			let userList = [];
			if(customUserList) {
				userList = customUserList;
			}else{
				userList = Object.keys(users).map(id => users[id]);
			}
			userList
				.map(user => {
					// Check if there is way to receive the direct message
					let direcMessageAvailable = false;
					
					if(user[parameters.messageChannels.PUSH].length) {
						user[parameters.messageChannels.PUSH].map(push => {
							if(push[parameters.messageChannels.PUSH_ACTIVE]) {
								direcMessageAvailable = true;
								pushUsers++;
							}
						})
					}

					if(user[parameters.messageChannels.SOCKETS].length) {
						user[parameters.messageChannels.SOCKETS].map(socket => {
							if(socket[parameters.messageChannels.SOCKET_ACTIVE]) {
								direcMessageAvailable = true;
								socketUsers++;
							}
						})
					}


					if(user[parameters.messageChannels.MOBILES].length && user[parameters.user.DIRECT_MESSAGE_ALLOW]){
						user[parameters.messageChannels.MOBILES].map(mobile => {
							if(mobile[parameters.messageChannels.APP_VERSION_NUMBER]){
								direcMessageAvailable = true;
								mobileUsers++;
							}
						})
					}

					if(direcMessageAvailable){
						totalUsers++;
						if(user[parameters.user.USER_ID]) {
							loggedInUsers++;
						}else{
							loggedOutUsers++;
						}
					}	
				})

			var results = {
				totalUsers,
				loggedInUsers,
				loggedOutUsers,
				mobileUsers,
				pushUsers,
				socketUsers
			};
			userList = [];
			resolve(results);
		})
	}
	
	const getMongoStats = () => {
		return getMongoUserList()
			.then(savedUsers => {
				savedUsers = savedUsers.map(u => {
					// Parse and store user's object from mongodb
					let savedUsersData = Object.assign({},u);
					// Delete keys added by mongodb, we dont need them in our user's object
					Object.keys(savedUsersData)
						.forEach(key => {
							if(!(key in userModel)){
								delete savedUsersData[key]
							}
					});

					return savedUsersData;
				})

				return getUserStats(savedUsers);
			})
			.catch(err => err)	
			
	}

	const getMongoUserList = () => {
		let data = [];
		
		return new Promise((resolve, reject) => {
			UsersModel.aggregate([]).cursor({ batchSize: 500, async: true})
				.exec((err, cursor) => {
					cursor.each((err, user) => {
						if(err) return reject(err)

						if(!user) {
							delete mongoose.models['UsersModel'];
							delete mongoose.connection.collections['Users'];
							return resolve(data);
						}
						Object.keys(user)
							.forEach(key => {
								if(!(key in userModel)){
									delete user[key]
								}
						});
						data.push(user);			
					})
					
				})
		})
	}	
	
	const getUsersDataFromMssql = id => {
		
		if(!id) return;

		let queryString = "EXEC pim.usp_user_details_get " + id;
		
		let response = {
			[parameters.user.MARKET_ALERT_ALLOW]: true,
			[parameters.user.STOPLOSS_ALERT_ALLOW]: true,
			[parameters.user.MOBILE_PAIRS]: [],
			[parameters.user.DIRECT_MESSAGE_ALLOW]: true,
			valid: true
		};

		return new Promise((fullfill, reject) => {
			if(sql.error) {
				response.valid = false;
				fullfill(response)
				return;
			}

			new sql.Request(mssqlPool).query(queryString)
					.then(function(data) {
						if(data && data.recordset && data.recordset.length > 0){
						    response[parameters.user.MARKET_ALERT_ALLOW] = !!data.recordset[0].MarketAlertAllow;

						    response[parameters.user.STOPLOSS_ALERT_ALLOW] = !!data.recordset[0].GetStopLossAlerts;

						    response[parameters.user.DIRECT_MESSAGE_ALLOW] = !!data.recordset[0].GetDirectMessages;
							
							if(data.recordset[0].InstrumentNotifications){
						    	response[parameters.user.MOBILE_PAIRS] = data.recordset[0].InstrumentNotifications
							    	.split(',')
							    	.map(pair => {
								    	if(pair.length === 6){
									    	return pair.slice(0,3) + '/' + pair.slice(3, 6);
								    	}
								    	return '';
							    	})
							    	.filter(pair => pair);
							    	
				            }
							fullfill(response);
							return;
						}
						response.valid = false;
						fullfill(response);
					})
				    .catch(err => {
						console.log(`There was an error while retreiving users [${id}] data from the mssql database`, err.message);
						response.valid = false;
						fullfill(response);
					});

		})
	}
	
	// Api function that shows user's data stored in mongodb
	const getUsersDataFromMongo = id => {
		
		if(!id) return;

		let user = getUser(id);
		
		return UsersModel
			.findOne({ [parameters.user.MONGO_ID]: user[parameters.user.MONGO_ID] })
			.exec()
			.then(res => {
				return res;
			})
			.catch(err => {
				return {};
				console.log('Users Management: getUsersDataFromMongo mongodb error', err.message);
			})
	}
	
	
	// Function used to add mongodb data to the system. Called on module init.
	const getUsersDatabaseRecords = () => {

		if(!config.loadDataFromDatabase) return;
		
		return getMongoUserList()
			.then(savedUsers => {
				
				// Prepare the 
				let usersList = savedUsers.map(dbUserData => {
					// Parse and store user's object from mongodb
					let usersData = Object.assign({}, dbUserData);
					
					// Delete keys added by mongodb, we dont need them in our user's object
					Object.keys(usersData)
						.forEach(key => {
							if(!(key in userModel)){
								delete usersData[key]
							}
					})
					return usersData;
				});
				
				

				let mobileUpdateList = mongoDbDataProcessing.clearMobiles(usersList);
				
				let browserUpdateList = mongoDbDataProcessing.clearBrowsers(usersList);

				mobileUpdateList = mobileUpdateList.filter(id => browserUpdateList.indexOf(id) === -1);
				
				let updateList = [...mobileUpdateList, ...browserUpdateList];
				


				updateList.map(userIndex => {
					let user = usersList[userIndex];
					updateUserMongoDbRecord(user);
				});
				
				usersList = usersList.filter(user => user[parameters.messageChannels.MOBILES].length || user[parameters.messageChannels.PUSH].length);

				usersList.map(user => {
					
					let id = getUserId(user);
					
					user[parameters.user.TEST_ENABLED] = false;
					
					user[parameters.messageChannels.SOCKETS] = [];
					
					user[parameters.messageChannels.MOBILES] = user[parameters.messageChannels.MOBILES].map(mobile => {
						if(mobile[parameters.messageChannels.FIRST_CONNECTION_DATE]){
							mobile[parameters.messageChannels.FIRST_CONNECTION_DATE] = new Date(mobile[parameters.messageChannels.FIRST_CONNECTION_DATE])
						}
						if(mobile[parameters.messageChannels.LAST_CONNECTION_DATE]){
							mobile[parameters.messageChannels.LAST_CONNECTION_DATE] = new Date(mobile[parameters.messageChannels.LAST_CONNECTION_DATE])
						}
						return mobile;	
					})
					
					user[parameters.messageChannels.PUSH] = user[parameters.messageChannels.PUSH].map(push => {
						push[parameters.messageChannels.PUSH_ACTIVE] = true;
						return push;
					});
					

					// Add retrieved user
					setUsersData(user, id, mssqlUpdateNeeded(user), false, true);

				});
				 
				return 'ok';

			})
			.catch(err => {
				console.log('User Management: getUsersDatabaseRecords mongodb error', err.message);
			})	
		
	}
	const updateMongoDataRecord = (usersData) => {
		if (!usersData) return;
		
		let id = usersData[parameters.user.MONGO_ID];
		
		if(usersData[parameters.messageChannels.PUSH].length === 0 && usersData[parameters.messageChannels.MOBILES].length === 0){
			return UsersModel
				.find({ [parameters.user.MONGO_ID]: id }, {})
				.remove()
				.exec()
		}else{
			return UsersModel
				.findOneAndUpdate({ [parameters.user.MONGO_ID]: id }, usersData, { upsert: true, new: true, timeout:false })
				.exec()
		}
	}
	/*
	 * Server start procedure: 
	 * 
	 * 1. Load data from mongodb
	 * 2. Run duplicates detection
	 * 3. Remove duplicates from mongodb
	 * 4. Detect dirty tokens
	 * 5. Remove dirty tokens from mongodb. 
	 * 6. Add data to memory
	 * 7. Request data from mssql
	 * 8. Update mongodb with mssql data
	 * 
	 */
	const serverStartProcedure = () => {
		return new Promise((resolve, reject) => {
			
			if(!config.loadDataFromDatabase) {
				resolve('ok');
				return;
			}

			// Step 1. Retreive data from mongo
			getMongoUserList().then(savedUsers => {
		
				console.log(`${savedUsers.length} retreived from Mongodb`);
				// Step 2. Run duplicates detection
				let mobileUpdateList = mongoDbDataProcessing.clearMobiles(savedUsers);
				
				let browserUpdateList = mongoDbDataProcessing.clearBrowsers(savedUsers);

				mobileUpdateList = mobileUpdateList.filter(id => browserUpdateList.indexOf(id) === -1);

				let duplicateIndexes = [...mobileUpdateList, ...browserUpdateList];

				let duplicateUserList = duplicateIndexes.map(i => savedUsers[i]);
					
				let validUsers = savedUsers.filter(user => user.mobile.length > 0 || user.push.length > 0);
				
				console.log(`Duplicates Detection Completed. Starting mongodb updates for ${duplicateUserList.length}\n`);
				// Step 3. Removing duplicates from mongodb
				return new Promise((resolve, reject) => {
					async.eachSeries(duplicateUserList, (user, done) => {
						updateMongoDataRecord(user)
							.then(() => done())
							.catch(err => {})
					}, (err, res) => {
						if(err) return reject('err');
						console.log('Removing Duplicates From Mongodb Completed\n');
						resolve(validUsers);
					})
				})
			}).then(userList => {
				// Step 6. Add data to memory
				console.log(`Adding ${userList.length} to the memory\n`) 
				userList.map(user => {
					let id = getUserId(user);
					
					user[parameters.user.TEST_ENABLED] = false;
					
					user[parameters.messageChannels.SOCKETS] = [];
					
					user[parameters.messageChannels.MOBILES] = user[parameters.messageChannels.MOBILES].map(mobile => {
						if(mobile[parameters.messageChannels.FIRST_CONNECTION_DATE]){
							mobile[parameters.messageChannels.FIRST_CONNECTION_DATE] = new Date(mobile[parameters.messageChannels.FIRST_CONNECTION_DATE])
						}
						if(mobile[parameters.messageChannels.LAST_CONNECTION_DATE]){
							mobile[parameters.messageChannels.LAST_CONNECTION_DATE] = new Date(mobile[parameters.messageChannels.LAST_CONNECTION_DATE])
						}
						return mobile;	
					})
					
					user[parameters.messageChannels.PUSH] = user[parameters.messageChannels.PUSH].map(push => {
						push[parameters.messageChannels.PUSH_ACTIVE] = true;
						return push;
					});
					// Add retrieved user
					setUsersData(user, id, false, false, true);
					
				})
				console.log('Users objects created in memory\n');
				resolve('Start receiving calls');
				return userList;
			})
			/*.then(userList => {
				// Step 7. Requesting data from mssql 
				
				let loggedInUsers = userList.filter(user => user.userID);
				console.log(`Starting Mssql requests for ${loggedInUsers.length} users\n`);

				let userNumber = 0;
				let totalUsersNumber = userList.length;
				loggedInUsers.map(user => {
					mssqlUpdate(user, true)
				})
				return;	
			})*/
			.catch(err => {
				console.log('Initialization Error, ', err.message)
			})
		
		})
	}
	/*
	 * API function that gives access to the users object 
	 */
	
	/*
	 * Init function kicked off on server start
	 */
	const init = () => {
		sql.error = true;
		mssqlPool =  new sql.ConnectionPool(config.mssql.hostMcObj);
		return mssqlPool.connect()
			.then(() => {
				sql.error = false;
				
				console.log(`Users Management: MSSQL database [${config.mssql.hostMc}] connection established`.green);
				
				return serverStartProcedure();
			})
			.catch((err) => {
				sql.error = true;
				
				console.log(`Users Management: There was an error connecting to the MSSQL database: ${config.mssql.hostMc} `.red + err.message);
				return serverStartProcedure();
				//return getUsersDatabaseRecords();
			});

    
	}

	
	
	/*
	 * Updating users data. 
	 * 
	 * It updates users record in memory and updates database record in mongodb
	 * Before saving data it checks if data has mobile apps, if so
	 * it calls mssql and updates the record and database with receivied
	 * parameters.
	 * @param data object. Users object we want to add to the system
	 * @param id String. User id of the new object.
	 * @param requestMssqlData Boolean. Flag that indicates whether we need to request data from mssql
	 * @param updateMongoRecord Boolean. Flag that indicates whether we need to save data to mongodb 
	 * 
	 */
	const setUsersData = (data, id, requestMssqlData, updateMongoRecord, init) => {
		
			if (!id) {
				return;
			}
			
			if(_.isEmpty(data)){
				delete users[id]
				return;
			}

			// If no device connection present in the request, remove the user
			if(
				data[parameters.messageChannels.MOBILES].length === 0 && 
				data[parameters.messageChannels.PUSH].length === 0 && 
				data[parameters.messageChannels.SOCKETS].length === 0
			){
				
				if(users[id] && !init){
					let userMongoId = users[id][parameters.user.MONGO_ID];
					delete users[id];
					deleteMongoDbRecord(userMongoId);
				}
				return;
			}
				// Here i should also delete the user from the mongodb
			// Set the lookup map data
			data[parameters.messageChannels.MOBILES].map(mobile => {
				let token = mobile[parameters.messageChannels.TOKEN];
				let deviceId = mobile[parameters.messageChannels.DEVICE_ID];
				mobileToUser[token] = id;
				if(deviceId && deviceId !== 'null' && deviceId !== 'undefined'){
					mobileDeviceIdToUser[deviceId] = id;
				}
			})

			data[parameters.messageChannels.PUSH].map(push => {
				pushToUser[push[parameters.messageChannels.TOKEN]] = id;
				browserToUser[push[parameters.messageChannels.MACHINE_HASH]] = id;
			})
			
			data[parameters.messageChannels.SOCKETS].map(socket => {
				socketToUser[socket[parameters.messageChannels.SOCKET_ID]] = id;
			})
			
			if(!data[parameters.user.MONGO_ID]){
				data[parameters.user.MONGO_ID] = mongoose.Types.ObjectId();
			}
			
			if(!init) {
				users[id] = _.cloneDeep(data);
			}else{
				users[id] = data;
			}

			let usersData = getUser(id);
			
			if(!requestMssqlData && updateMongoRecord){
				updateUserMongoDbRecord(usersData);
			}

			if(requestMssqlData){
				mssqlUpdate(usersData, updateMongoRecord);
			}

			return;
	}
	
	// Helper function that deletes user from the database. 
	/*
	 * Helper function that deletes the user from the database
	 * 
	 * @param param string. Parameter that is used as id for the user (userId, token, machineHash)
	 * @param value string. Parameter value
	 * @return void
	 */
	const deleteMongoDbRecord = (id) => {
		if(!id) return;
		
		return UsersModel
			.find({ [parameters.user.MONGO_ID]: id }, {})
			.remove()
			.exec()
			.catch(err => {
				console.log('Users Management: deleteMongoDbRecord mongodb error', err);
			})
		
	}

	/*
	 * Helper method that updates user mongoDb record for the provided user. 
	 * Before saving data it checks whether user should be added to the database. If not
	 * it will delete the user from the database 
	 */
	const updateUserMongoDbRecord = (usersData) => {
		if (!usersData) {
			return;
		}
		
		let id = usersData[parameters.user.MONGO_ID];

		if(usersData[parameters.messageChannels.PUSH].length === 0 && usersData[parameters.messageChannels.MOBILES].length === 0){
				return UsersModel
					.find({ [parameters.user.MONGO_ID]: id }, {})
					.remove()
					.exec()
					.catch(err => {
						console.log('Users Management: updateUserMongoDbRecord mongodb error', err);
					})
			}else{
				return UsersModel
					.findOneAndUpdate({ [parameters.user.MONGO_ID]: id }, usersData, { upsert: true, new: true, timeout:false })
					.exec()
					.catch(err => {
						console.log('Users Management: updateUserMongoDbRecord mongodb error', err);
					})
			}
	}
	
	/*
	 * Requesting info about the user from mssql. Called when setting data
	 * in setUsersData function. 
	 *
	 * 
	 */
	const mssqlUpdate = (user, mongoUpdate) => {
		
		if(!user) {
			return;
		}
		
		let id = user[parameters.user.USER_ID];
		
		if(!id) {
			if(mongoUpdate){
				updateUserMongoDbRecord(user);
			}
			return null;
		}

		getUsersDataFromMssql(id)
			.then((response) => {
				
				if(!response.valid) {
					if(mongoUpdate){
						updateUserMongoDbRecord(users[id]);
					}
					return null;
				}
				
				// Once we get the response we get the user object from the memory
				let usersData = getUser(id);
				
				if(_.isEmpty(usersData))  return null;

				let dataChanged = false;

				if(usersData[parameters.user.MARKET_ALERT_ALLOW] !== response[parameters.user.MARKET_ALERT_ALLOW]){
					dataChanged = true;
				}

				if(usersData[parameters.user.STOPLOSS_ALERT_ALLOW] !== response[parameters.user.STOPLOSS_ALERT_ALLOW]){
					dataChanged = true;
				}

				if(usersData[parameters.user.DIRECT_MESSAGE_ALLOW] !== response[parameters.user.DIRECT_MESSAGE_ALLOW]){
					dataChanged = true;
				}

				if(
					response[parameters.user.MOBILE_PAIRS] && 
					!dataChanged && (
						usersData[parameters.user.MOBILE_PAIRS].sort().join(',') !== response[parameters.user.MOBILE_PAIRS].sort().join(',')
					)
				){
					dataChanged = true;
				}

				// Only update the user if there is a change
				if(dataChanged){
					
					usersData[parameters.user.MARKET_ALERT_ALLOW] = response[parameters.user.MARKET_ALERT_ALLOW];

					usersData[parameters.user.STOPLOSS_ALERT_ALLOW] = response[parameters.user.STOPLOSS_ALERT_ALLOW];
					
					usersData[parameters.user.MOBILE_PAIRS] = response[parameters.user.MOBILE_PAIRS];
					
					usersData[parameters.user.DIRECT_MESSAGE_ALLOW] = response[parameters.user.DIRECT_MESSAGE_ALLOW];
					
					users[id] = _.cloneDeep(usersData);
					
					mongoUpdate = true;
				}
				
				if(mongoUpdate){
					updateUserMongoDbRecord(users[id])

				}

				 return (dataChanged ? id : null)

			})
			.catch(err => {
				console.log(`Users Management: There was a problem while trying to retrieve the data from mssql database for user: ${id}`, err.message);
				if(mongoUpdate){
					updateUserMongoDbRecord(user);
				}
				 return null;
			})
	}
	
	/*
	 * Removing duplicate push registration on push register event
	 *
	 * The goal is to avoid having duplicate machine hash or duplicate token parameters. Duplicate
	 * token parameters are important because they may lead to mulitple push notifications.
	 * 
	 */
	const removePushRegistrations = (token, machineHash, requestUserId) => {
		
		if(!token) return;
		
		// Get the id of the user that has the browser with the same token as the new user
		let t_userId = pushToUser[token];
		
		// Data of the user with duplicate token
		let t_usersData;

		// Make sure the id is defined and that the user with this id exists.	
		if(t_userId && users[t_userId]){

			t_usersData = users[t_userId];

			// Remove the push registration that has the same token as the new user. 
			t_usersData[parameters.messageChannels.PUSH] = t_usersData[parameters.messageChannels.PUSH]
				.filter(push => push[parameters.messageChannels.TOKEN] !== token);
			
			// Make sure we don't update the new user. We will update his state later. This function is called 
			// when push is registered to the system. After calling this function setUsersData for the 
			// new registration will be called. No need to call it here. And in the meantime we removed 
			// any duplicate token from the user. 		
			if(requestUserId !== t_userId){
				// Update user that had the same token only if its not the same user as the new user.
				setUsersData(t_usersData, t_userId, false, true);
			}
		}	
		
		// Do the same check for machine hash as for the token
		if(!machineHash) return;
		// Get the id of the user that has the browser with same machine hash
		let m_userId = browserToUser[machineHash];
		// Make sure id and user exist
		if(m_userId && users[m_userId]){
			let m_usersData = users[m_userId];
			m_usersData[parameters.messageChannels.PUSH] = m_usersData[parameters.messageChannels.PUSH]
				.filter(push => push[parameters.messageChannels.MACHINE_HASH] !== machineHash);

			if(requestUserId !== m_userId){
				setUsersData(m_usersData, m_userId, false, true);
			}
		} 
	
	}

	/*
	 * Handling user id updates, deviceId or token changes on mobile devices
	 * 
	 * When users connects with a mobile to our system, we need to make sure
	 * that there are no duplicates in the system. Duplicate in this case is 
	 * any device with same token or deviceId. 
	 * 
	 * Duplication of token can lead to multiple messages being delivered.
	 *
	 * Duplication of deviceId is probably not yet a problem since deviceId 
	 * is currently not being used in any of the modules. The parameter is provided 
	 * by android devices only. However we want to use this parameter id duplication checks
	 * as it might be used later. 
	 * 
	 * The function is called only on mobile connect method.
	 *
	 *  The function performs following steps: 
	 * 		- Checking the token duplicates by accessing the mobileToUser lookup map. If there is a user
	 * 		  with provided token, remove the device from the user's mobiles array. When removing the duplicate
	 *  	  we need to save first connection date. 	
	 * 		- Check the device id duplicates if the provided app has one. The process is same as for token
	 *	      if duplicate device id is found, make sure to save the oldest first connection date, and pass
	 * 		  it to the new device.
	 *		- Finnaly we need to update users that got their mobile arrays updates. However we will do this only 
	 * 		  these users are not the ones that requested the check. These will be updated from the mobile connect 
	 *		  function. This is why we need to pass requestId parameter and compare it to detected duplicate device
	 *
	 * @param token string. Device token
	 * @param deviceId string. Device id
	 * @param requestId string. The id of the connecting device. 
	 */
	const removeMobileFromUsers = (token, deviceId, requestId) => {
		// If no duplicate found firstConnectionDate is now
		let mobileConnectionDates = new Date();

		// Get the id of user with duplicate token
		let t_userId = mobileToUser[token];

		// Get duplicate users data
		let t_usersData;
		
		// Check if duplicat exists
		if(t_userId && users[t_userId]){

			t_usersData = users[t_userId];
			
			// Iterate trough duplicate mobiles array and filter out the device with provided token
			t_usersData[parameters.messageChannels.MOBILES] = t_usersData[parameters.messageChannels.MOBILES]
				.filter(mobile => {
					if(mobile[parameters.messageChannels.TOKEN] === token){
						// Store first connection date
						if(mobile[parameters.messageChannels.FIRST_CONNECTION_DATE]){
							mobileConnectionDates = mobileConnectionDates < mobile[parameters.messageChannels.FIRST_CONNECTION_DATE] ? mobileConnectionDates : mobile[parameters.messageChannels.FIRST_CONNECTION_DATE];
						}
						// If duplicate remove this device
						return false;
					}
					// If not duplicate leave it
					return true
				})

			// Check if duplicate user is not the one receiving the mobile connect call
			if(requestId !== t_userId){
				// When check for token is completed update modified users
				setUsersData(t_usersData, t_userId, false, true);
			}
			
		}

		// If no deviceId finish the check
		if(!deviceId) return mobileConnectionDates;
			
		// Get the deviceId duplicate user and check if it exists
		let d_userId = mobileDeviceIdToUser[deviceId];
		
		if(!d_userId) return mobileConnectionDates;
		
		if(!users[d_userId]) return mobileConnectionDates;

		let d_usersData = users[d_userId];
		
		// Filter out duplicate mobie from user's mobile array
		d_usersData[parameters.messageChannels.MOBILES] = d_usersData[parameters.messageChannels.MOBILES].filter(mobile => {
				if(mobile[parameters.messageChannels.DEVICE_ID] === deviceId){
					// Make sure the first connection data is correct
					if(mobile[parameters.messageChannels.FIRST_CONNECTION_DATE]){
						mobileConnectionDates = mobileConnectionDates < mobile[parameters.messageChannels.FIRST_CONNECTION_DATE] ? mobileConnectionDates : mobile[parameters.messageChannels.FIRST_CONNECTION_DATE];
					}
					return false;
				}
				return true
			})

		// Update the user if not the same as the user that requested the check
		if(requestId !== d_userId){
			setUsersData(d_usersData, d_userId, false, true);
		}
		
		return mobileConnectionDates;
	}


	
	// Market Alerts methods
	
	/*
	 * Helper function that sets correct pair format. It is used as a room for sockets
	 * on different languages. 
	 * 
	 * @param object socket
	 * @param string instrument
	 * @return array Array of rooms that socket needs to join for a given pair
	 *
	 */
	const setInstrumentFormat = (socket, instrument) => {
		let rooms = [];
		if(instrument.indexOf(parameters.user.INSTRUMENT) > -1) {
			rooms.push(socket[parameters.user.LANGUAGE] + '-' + instrument);
			if(socket[parameters.user.TEST_ENABLED]) {
				rooms.push(parameters.general.TEST + '-' + socket[parameters.user.LANGUAGE] + '-' + instrument)
			}
		}else{
			rooms.push(instrument);
		}	
		return rooms;
	}
	
	/*
	 * Adding socket to given rooms
	 * 
	 * Used to join rooms, when registering sockets, user status changes or tab visibility changes
	 * 
	 * @param object socket. Socket instance
	 * @param array rooms. Rooms to join
	 * @return void
	 */
	 const joinRooms = (socket, rooms) => {
		if(!socket || !rooms) return;
		
		let recievedRooms = [];
		let join = [];
		let leave = [];
		
		// Transform rooms array to correct format
		rooms.forEach(room => {
			recievedRooms = recievedRooms.concat(setInstrumentFormat(socket, room));
		})
		
		const currentRooms = [...Object.keys(socket.rooms)];
		
		join = getArrayDifference(recievedRooms, currentRooms);
		leave = getArrayDifference(currentRooms, recievedRooms);
		
		join.forEach(room => {
			// Prevent China based socket from joining BTC room
			if(room.indexOf('BTC') && socket[parameters.tracking.COUNTRY] === 'china'){
				return;
			}
			socket.join(room);
		});
		
		leave.forEach(room => {
			socket.leave(room);
		});
			
	 }

	/*
	 * Helper function that generates instrument pairs based on user's data
	 *
	 * It checks if user is logged in or out, marketAlertAllow flag, testEnabled flag
	 * and personal favorites, and returns array of pairs relevant to the user. 
	 *
	 * @param object user's data
	 * @return array Instrument pairs. 
	 */ 
	const generateUserPairs = (data) => {
		let pairs = [];
		const userLoggedIn = data[parameters.user.USER_LOGGED_IN];
		const language = data[parameters.user.LANGUAGE];
		const culture = data[parameters.user.CULTURE];
		const usersPairs = data[parameters.user.PAIRS];
		const machineHash = data[parameters.messageChannels.MACHINE_HASH];
		const userId = data[parameters.user.USER_ID];
		const marketAlertAllow = data[parameters.user.MARKET_ALERT_ALLOW];
		const testEnabled = data[parameters.user.TEST_ENABLED];

		// If user is logged out add machine hast to pairs, to be able to 
		// target logged out users
		if(!userLoggedIn){
			pairs.push(language + '-' + machineHash);
		}else{
			// Add user id, to be able to target users
			pairs.push(language + '-' + userId);
		}
		// If market alerts are not allowed 
		if(!marketAlertAllow) return pairs;
		
		// Add global pairs
		globalPairs.forEach(pair => {
			pairs.push(parameters.user.INSTRUMENT + '-' + pair);
		});
		
		// For logged out users its enough
		if(!userLoggedIn) return pairs;

		// Add language 
		pairs.push(language);
		
		pairs.push(language + '-' + culture)
		
		usersPairs.forEach(pair => {
			if (pair.indexOf(parameters.user.INSTRUMENT + '-') === 0) {
				if(pairs.indexOf(pair) === -1){
					pairs.push(pair);
				}
			}
		})

		return pairs;
	}
	
	
	/*
	 * Get market alert receives based on the instrument. 
	 * 
	 * Runs when market alert trigger is received. The result is receivers object that separate receivers
	 * based on device type, delivery method and language. 
	 *
	 */
	const getMarketAlertReceivers = (instrument, testCall) => {
		
		// Initialize receivers object
		let receivers = {
			push: {},
			fcmIosMobile: {},
			fcmAndroidMobile: {},
			pushyMobile: {}
		}
		
		// Initialize language based information
		let languages = messagingSettings.getLanguages();

		languages.browserLanguages
			.map(lang => lang.code)
			.map(language => {
				receivers.push[language] = [];
			});
		
		let browserLanguageCodes = languages.browserLanguages.map(lang => lang.code);
		
		languages.mobileLanguages
			.map(lang => lang.code)
			.map(language => {
				receivers.fcmIosMobile[language] = [];
				receivers.fcmAndroidMobile[language] = [];
				receivers.pushyMobile[language] = [];
			})
		
		let mobileLanguageCodes = languages.mobileLanguages.map(lang => lang.code);


		// Go through the user registrations and populate receivers object
		Object.keys(users)
			.map(id => users[id])
			.filter(usersData => usersData[parameters.user.MARKET_ALERT_ALLOW])
			// Filter out users we know should not receive the alert
			.forEach(usersData => {
				// Add browser push tokens if received instrument is in the pairs array
				if(usersData[parameters.user.PAIRS].indexOf((parameters.user.INSTRUMENT + '-'+ instrument)) > -1) {
					usersData[parameters.messageChannels.PUSH].map(pushRegistration => {
						if(pushRegistration[parameters.messageChannels.PUSH_ACTIVE] && pushRegistration[parameters.user.LANGUAGE]){
							
							if(browserLanguageCodes.indexOf(pushRegistration[parameters.user.LANGUAGE]) === -1) {
								return;
							}

							if(testCall && usersData[parameters.user.TEST_ENABLED]){
									receivers.push[pushRegistration[parameters.user.LANGUAGE]].push(pushRegistration[parameters.messageChannels.TOKEN]);
							}
							
							if(pushRegistration[parameters.tracking.COUNTRY] === 'china' && instrument.toLowerCase().indexOf('btc') !== -1){
								return;
							}

							if(!testCall){
								receivers.push[pushRegistration[parameters.user.LANGUAGE]].push(pushRegistration[parameters.messageChannels.TOKEN]);							
							}
						}
					})
				}
				
				// If instrument is not in the pairs and mobile pairs do not exist the user is left out
				if(!usersData[parameters.user.MOBILE_PAIRS] || usersData[parameters.user.MOBILE_PAIRS].indexOf(instrument) === -1){
					return 
				}

				

				
				// Distribute mobile tokens according to language and delivery method			
				usersData[parameters.messageChannels.MOBILES].map(mobileRegistration => {
					
					if(mobileRegistration[parameters.tracking.COUNTRY] === 'china' && instrument.toLowerCase().indexOf('btc') !== -1){
						return;
					}

					if(mobileRegistration[parameters.user.LANGUAGE] && mobileRegistration[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD]){

						if(mobileLanguageCodes.indexOf(mobileRegistration[parameters.user.LANGUAGE]) === -1){
							return;
						}

						if(mobileRegistration[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD] === 'pushy'){
							if(testCall && usersData[parameters.user.TEST_ENABLED]){
								receivers.pushyMobile[mobileRegistration[parameters.user.LANGUAGE]].push(mobileRegistration[parameters.messageChannels.TOKEN])
								
							}
							if(!testCall){
								receivers.pushyMobile[mobileRegistration[parameters.user.LANGUAGE]].push(mobileRegistration[parameters.messageChannels.TOKEN])							
							}
							
						}else{
							if(mobileRegistration[parameters.messageChannels.SYSTEM] === 'ios'){
								if(testCall && usersData[parameters.user.TEST_ENABLED]){
									receivers.fcmIosMobile[mobileRegistration[parameters.user.LANGUAGE]].push(mobileRegistration[parameters.messageChannels.TOKEN])
									
								}

								if(!testCall){
									receivers.fcmIosMobile[mobileRegistration[parameters.user.LANGUAGE]].push(mobileRegistration[parameters.messageChannels.TOKEN])						
								}

								
							}else{
								if(testCall && usersData[parameters.user.TEST_ENABLED]){
									receivers.fcmAndroidMobile[mobileRegistration[parameters.user.LANGUAGE]].push(mobileRegistration[parameters.messageChannels.TOKEN])
									
								}

								if(!testCall){
									receivers.fcmAndroidMobile[mobileRegistration[parameters.user.LANGUAGE]].push(mobileRegistration[parameters.messageChannels.TOKEN])				
								}
							}
						}
					}
				})
			})
			
		return receivers;
	}
	
	// Helper method for easier QA-ing, it enables us to delete mobile
	// device from user's registrations. 
	
	const deleteMobileDevice = token => {
		if(!token) return;
		if(!mobileToUser[token]) return;

		let user = getUser(mobileToUser[token]);
		
		if(_.isEmpty(user)) return;

		user[parameters.messageChannels.MOBILES] = user[parameters.messageChannels.MOBILES].filter(mobile => mobile[parameters.messageChannels.TOKEN] !== token);

		setUsersData(user, mobileToUser[token], false, true);

	}

	const deleteUser = id => {

		let mongoId = users[id][parameters.user.MONGO_ID];
		deleteMongoDbRecord(mongoId);
		delete users[id];
	}

	const getAllMobileTokens = () => {
		let tokens = [];

		Object.keys(users)
			.map(id => users[id])
			.map(user => {
				user.mobile.map(mobile => {
					tokens.push(mobile.token);
				})
			})

		return tokens;
	}

	const deleteMobileApp = token => {
		let userId = mobileToUser[token];

		let user = getUser(userId);
		
		if(_.isEmpty(user)) return;
		
		let mobiles = user.mobile.filter(mobile => {
			mobile.token !== token
		});

		user.mobile = [...mobiles];

		setUsersData(user, userId, false, true)
	}

	/*const testMssqlCalls = () => {
		//let queryString = "EXEC pim.usp_user_details_get " + id;
		let query ='EXEC pim.usp_user_details_getMany ' + '4375244';
		let ps = new sql.PreparedStatement(mssqlPool);
		ps.input('param', sql.BigInt);
		ps.prepare('EXEC pim.usp_user_details_getMany @param', (err) => {
			if(err) {
				console.log(err);
				return
			}
			console.log('executing');
			ps.execute({param: 4375244}, (err, recordset) => {
				if(err) {
					return;
				}
				console.log('we got here');
			})
		})
		return;
		
	}*/

	/**
	 * Clean tokens
	 *
	 * Accepts array of tokens with type to specific user map,
	 * loops over tokens and removes device identified by token.
	 *
	 * @param {array} tokens Token list to check.
	 * @param {string} type Type of map to check token.
	 * @return {boolean} updated Boolean if any updates occured.
	 */
	const cleanTokens = (tokens, type = 'mobile') => {

		let updated = false;

		console.log(`Batch Clean Tokens (${type})`, tokens.length);

		if (Array.isArray(tokens) && tokens.length) {

			const idMap = (type === 'push' ? pushToUser : mobileToUser);

			// Remove Duplicates and Loop
			new Set(tokens).forEach(token => {

				const userId = idMap[token];

				if (userId) {
					//console.log(`FOUND USER ${userId} for TOKEN ${token}`);

					let user = getUser(userId);

					if (!_.isEmpty(user)) {

						let devices = user[type].filter(device => {
							return device.token !== token;
						});

						user[type] = [ ...devices ];

						// Update user and save to mongodb
						setUsersData(user, userId, false, true);

						// Set updated true
						updated = true;
					}
				}
				else {
					console.error(`User Management Error: Cannot find user to delete token ${token}`);
				}
			});
		}

		return updated;
	}
	
	return {
		init,
		generateUserPairs,
		joinRooms,
		getUser,
		getUsers,
		getUserModel,
		getUserId,
		getMobileUserId,
		getPushUserId,
		getMobileUser,
		getMobileObject,
		getSocketUser,
		getSocketObject,
		getSocket,
		getPushObject,
		getMarketAlertReceivers,
		removePushRegistrations,
		removeMobileFromUsers,
		getUsersStats,
		usersFiltering,
		setUsersData,
		getSqlConnection,
		getUsersDataFromMssql,
		getUsersDataFromMongo,
		getCsvStats,
		getUserStats,
		getMongoStats,
		getMongoUserList,
		deleteMobileDevice,
		deleteUser,
		getAllMobileTokens,
		deleteMobileApp,
		cleanTokens,
	}
}
