/*
 * Starting up our notifications server
 * 
 * The server is using socket, redis and http connections. We need to 
 * create this connections and pass them to individual modules. The idea
 * is to have different modules handle different areas of concern. Theorethically we could 
 * define all events in a single module. This is up to the user how the code will be organized
 * at this point. 
 * 
 * The modules are doing notthing more than adding events. 
 * 
 * Before starting with events adding we need to create redis and socket connections. 
 * 
 * Once we connect to desired channels we can go on and kick of modules, that will start 
 * listening for the events. 
 * 
 */
"use strict";
const _ = require('lodash');
const os = require('os');
const Redis = require('ioredis');
const socketIO = require('socket.io');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

/*const mongoose = require('mongoose');
const dbName = marketAlertsConfig.db.name;
const options = { 
	server: { 
		socketOptions: { 
			keepAlive: 300000, 
			connectTimeoutMS: 120000,
			reconnectTries: 50 
		} 
	} 
};   
const connectionString = marketAlertsConfig.db.connection + dbName;
console.log(connectionString);
mongoose.Promise = require('bluebird');
//mongoose.connect(connectionString, options);
mongoose.connect(connectionString);*/

const marketAlertsConfig = require('./config');
const parameters = require('./parameters');

const Users = require('./usersManagement');
const messagingSettings = require('./messagingSettings')();
messagingSettings.init();
const usersManagement = new Users(messagingSettings);

// Our connection library 
const Connections = require('../lib/connections');

module.exports = (app, http) => {
	/*
	 * Connections instances. Each instance is adding events for specific
	 * group of tasks. Connections library recieves app instance and the list of
	 * parameters that we are planning to use in our handlers. 
	 */

	// Set server id with os hostname and pm2 env name if exists
	const serverID = os.hostname() + '-' + (process.env.name || 'server');
	const serverENV = (process.env.NODE_ENV || 'unknown')

	console.log('------------------------------------');
	console.log(`Initializing [${serverENV}] Server [${serverID}]`);

	// Base connections (passed with messageHandler)
	const connect = new Connections(app, parameters, serverID);
	
	// User connections (browser, push, mobiles)
	const clients = new Connections(app, parameters, serverID);
	
	// Handling user updates coming from webeyez redis 
	const userUpdates = new Connections(app, null, serverID);
	
	// Receiving market alert triggers and sending messages to the client
	const marketAlerts = new Connections(app, parameters, serverID);
	
	// Admin panel handling
	const directMessaging = new Connections(app, parameters, serverID);
	
	// Annoucmenets module
	const announcements = new Connections(app, parameters, serverID);

	// Handle Reporting
	const reporting = new Connections(app, parameters, serverID);

	const settings = new Connections(app, parameters, serverID);

	// Socket connection used to communicate to the clients
	let clientIo = socketIO(http, {
		origins: marketAlertsConfig.socketOrigins,
		path: '/live/socket.io'
	});
	
	// Socket connection used to communicate to the admin panel
	let adminIo = socketIO(http, {
		origins: marketAlertsConfig.socketOrigins,
		path: '/admin/socket.io'
	});

	// Local redis used to publish events and data over redis
	let pub = new Redis({
		sentinels: marketAlertsConfig.sentinels,
		name: 'redis-cluster'
	});
	
	let pubRedisError = false;
	
	pub.on("error", function(err) {
	    if (!pubRedisError) {
	        pubRedisError = true;
	        console.error(`Redis Error: Error connecting to Pub Redis`, err);
	    }
	});

	let pubRedisConnected = false;
	
	pub.on('connect', err => {
		if(!pubRedisConnected) {
			pubRedisConnected = true;
			console.log(`Redis: Pub redis connected.`)
		}
	})

	// Local redis instance used to listen for events
	let sub = new Redis({
		sentinels: marketAlertsConfig.sentinels,
		name: 'redis-cluster'
	});

	let subConnectionError = false;
	
	sub.on("error", function(err) {
	    if (!subConnectionError) {
	        subConnectionError = true;
	        console.error(`Redis Error: Error connecting to Sub redis`, err);
	    }
	});

	let subRedisConnected = false;
	
	sub.on('connect', err => {
		if(!subRedisConnected) {
			subRedisConnected = true;
			console.log(`Redis: Sub redis connected.`)
		}
	})
	
	var webeyezRedisClusterNodes = [];
	let webeyezRedis = {};

	if(!_.isEmpty(marketAlertsConfig.redisClusterDetails)) {

		Object.keys(marketAlertsConfig.redisClusterDetails).map(host => {
			for (var i = marketAlertsConfig.redisClusterDetails[host][0]; i < marketAlertsConfig.redisClusterDetails[host][1] + 1; i++){
				webeyezRedisClusterNodes.push({
					port: i,
					host: host
				})
			}	
		})

		// Webeyez redis, used to receive updates from webeyez when the user profile changes
		webeyezRedis = new Redis.Cluster(webeyezRedisClusterNodes);

		let webeyezRedisConnected = false;
		
		webeyezRedis.on('connect', err => {
			if(!webeyezRedisConnected) {
				webeyezRedisConnected = true;
				console.log(`Redis: WebeyezRedis redis connected.`)
			}
		})

		let webeyezConnectionError = false;
		
		webeyezRedis.on("error", function(err) {
		    if (!webeyezConnectionError) {
		        webeyezConnectionError = true;
		        console.error(`Redis Error: Error connecting to WebeyezRedis Redis`, err.message);
		    }
		});
		
	}

	// Add message handler
	const messageHandler = require('./connect')(connect, usersManagement, messagingSettings);

	// Adding clients module
	require('./clients')(clients, usersManagement, messagingSettings, messageHandler);
	
	// Connecting to webeyez redis and updating user subscriptions
	require('./userUpdates')(userUpdates, usersManagement, messagingSettings);

	// Adding direct messaging module
	require('./directMessaging')(directMessaging, usersManagement, messagingSettings, messageHandler);
	
	// Implementation of market alerts
	require('./marketAlerts')(marketAlerts, usersManagement, messagingSettings, messageHandler);
	
	// Adding annoucements module 
	require('./announcements')(announcements, usersManagement, messagingSettings, messageHandler);

	// Adding reporting module
	require('./reporting')(reporting, usersManagement, messagingSettings);

	require('./settings')(settings, usersManagement, messagingSettings);

	// Starting the user management module. It loads data from the database
	usersManagement.init()
		.then(res => {

			// Initialize session for admin panel
			app.use(session({
				store: new RedisStore({
					client: pub 
				}),
				secret: 'ii7Aighie5ph',
				resave: false,
				saveUninitialized : false,
				cookie: {maxAge: 180000 }
			}));

			// Connect 
			connect.init({
				name: 'Connect',
				socket: adminIo,
				redis: {
					pub,
					sub
				}
			});

			// Market alerts are using client socket connections and redis 
			marketAlerts.init({
				name: 'Market Alerts',
				socket: clientIo,
				redis: {
					pub,
					sub
				}
			});
			
			// Clients are using client socket connections, redis and mssql
			clients.init({
				name: 'Clients',
				socket: clientIo,
				redis: {
					pub,
					sub
				},
			})
			
			// Webeyez redis is only using webeyez redis connection
			userUpdates.init({
				name: 'User updates',
				redis: {
					pub: null,
					sub: webeyezRedis
				},
			});
			
			// Admin panel is using admin socket and redis
			directMessaging.init({
				name: 'Direct Messaging',
				socket: adminIo,
				redis: {
					pub,
					sub
				}
			});

			announcements.init({
				name: 'Announcements',
				socket: clientIo,
				redis: {
					pub,
					sub
				}
			});

			reporting.init({
				name: 'Reporting',
				socket: adminIo,
				redis: {
					pub,
					sub
				}
			});

			settings.init({
				name: 'Settings',
				socket: adminIo,
				redis: {
					pub,
					sub
				}
			});	

		})	
		.catch(err => {
			console.log('Modules Initialization Error', err.message);
		})

}





