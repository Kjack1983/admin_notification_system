
"use strict";
const parameters = require('../parameters');
const moment = require('moment');
const config = require('../config');
module.exports  = (clients, usersManagement) => {

	// Debuging api calls
	clients.addHttpInEvent({
		name: 'debugSimpleCode',
		url: '/api/debug/simple',
		handler: function(req, res) {
			let jobTime = moment(new Date(), 'DD/MM/YYYY').format('HH:mm:ss');
			let response = {
				requestReceived: jobTime 
			};

			const users = usersManagement.getUsers();
			jobTime = moment(new Date(), 'DD/MM/YYYY').format('HH:mm:ss');
			response.requestProcessed = jobTime;
			response.numberOfUsers = Object.keys(users).length;
			res.send(response);
		},
		method: 'get'
	})

	clients.addHttpInEvent({
		name: 'debugMongoCall',
		url: '/api/debug/mongo/:id',
		handler: function(req, res) {
			
			let userId = req.params.id;

			let jobTime = moment(new Date(), 'DD/MM/YYYY').format('HH:mm:ss');
			let response = {
				requestReceived: jobTime 
			};
			usersManagement.getUsersDataFromMongo(userId)
				.then(data => {
					jobTime = moment(new Date(), 'DD/MM/YYYY').format('HH:mm:ss');
					response.mongoRequestCompleted = jobTime;
					response.data = data;
					res.send(response);
				})
				
		},
		method: 'get'
	})

	clients.addHttpInEvent({
		name: 'debugUserListCall',
		url: '/api/debug/users/list',
		handler: function(req, res) {
			let jobTime = moment(new Date(), 'DD/MM/YYYY').format('HH:mm:ss');

			let response = {
				requestReceived: jobTime 
			};

			const users = usersManagement.getUsers();
			
			jobTime = moment(new Date(), 'DD/MM/YYYY').format('HH:mm:ss');
			response.usersRetreived = jobTime;

			let userIdList = Object.keys(users);

			jobTime = moment(new Date(), 'DD/MM/YYYY').format('HH:mm:ss');
			response.userIdList = userIdList.length;

			res.send(response);
		},
		method: 'get'
	})

	clients.addHttpInEvent({
		name: 'debugMssqlCall',
		url: '/api/debug/mssql/:id',
		handler: function(req, res){
			let jobTime = moment(new Date(), 'DD/MM/YYYY').format('HH:mm:ss');
			
			let response = {
				requestReceived: jobTime 
			};
			
			let userId = req.params.id;

			usersManagement.getUsersDataFromMssql(userId)
				.then(data => {
					jobTime = moment(new Date(), 'DD/MM/YYYY').format('HH:mm:ss');
					response.usersRetreived = jobTime;
					response.user = data;
					res.send(response);
				})
		},
		method: 'get'
	})
	
	let sql = require('mssql');
	let mssqlConnectionPool;
	let sqlError = true;
	mssqlConnectionPool = new sql.ConnectionPool(config.mssql.hostBiObj)
		mssqlConnectionPool.connect()
			.then(() => {
				sqlError = false;
				console.log(`MSSQL database [${config.mssql.hostBi}] connection established`.green);
				
			})
			.catch((err) => {
				sqlError = true;
				console.log(`There was an error connecting to the MSSQL database: ${config.mssql.hostBi} `.red + err);
						
			});

	clients.addHttpInEvent({
		name: 'debugMssqlConnection',
		url: '/api/debug/mssql-connection/:days',
		handler: function(req, res){
			let jobTime = moment(new Date(), 'DD/MM/YYYY').format('HH:mm:ss');
			
			let response = {
				requestReceived: jobTime 
			};
			
			let days = req.params.days;
			const queryString = `EXEC USP_Notifications_NotLoggedInUsers_GET @Days = ${days}`;
					
			new sql.Request(mssqlConnectionPool).query(queryString)
				.then(data => {
					response.resultTime = moment(new Date(), 'DD/MM/YYYY').format('HH:mm:ss');
					response.data = data.recordsets[0];
					res.send(response);
				})
				.catch(err => {
					res.send(err.message);
				})

		},
		method: 'get'
	})

}