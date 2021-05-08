"use strict";

const config = require('../config');
const parameters = require('../parameters');
const cron = require('node-cron');
const CronJob = require('cron').CronJob;
const request = require('request');
const Redis = require('ioredis');
const _ = require('lodash');
let uid = require('../uidGenerator')();

const moment = require('moment');

const SettingsModel = require('../../models/settings');

const announcementsList = [
	'reminderToRegister',
	'reminderToLogin',
	'reminderToUploadDocuments'
];


let sql = require('mssql');
let mssqlConnectionPool;
let sqlError = true;

let redis = new Redis({
	sentinels: config.sentinels,
	name: 'redis-cluster'
});

module.exports = (announcements, usersManagement, messagingSettings, messageHandler) => {
	
	const reminderToLogin = require('./reminderToLogin');
	const reminderToRegister = require('./reminderToRegister');
	const reminderToUploadDocuments = require('./reminderToUploadDocuments');
	
	let triggers = {
		reminderToLogin,
		reminderToRegister,
		reminderToUploadDocuments
	}
	
	let announcementsData = {};
	let announcementsTriggers = {};
	
	const sendAnnouncements = (gmtHour) => {
		let users = usersManagement.getUsers();

		announcementsList.map(announcementType => {
			if(!announcementsData[announcementType][parameters.announcements.REMINDER_ACTIVE]) {
				return;
			}
			
			if(announcementsData[announcementType][parameters.announcements.REMINDER_TIME] !== gmtHour) {
				return;
			}
			triggers[announcementType].trigger(messageHandler, usersManagement, announcementsData[announcementType], mssqlConnectionPool);

		})

	}

	const loadDataFromMongo = () => {
		return new Promise((resolve, reject) => {
			SettingsModel
				.find()
				.lean()
				.exec()
				.then(settings => settings[0] ? settings[0] : {})
				.then(data => {
					announcementsData = {
						languages: data.languages || [],
						reminderToLogin: data.reminderToLogin,
						reminderToRegister: data.reminderToRegister,
						reminderToUploadDocuments: data.reminderToUploadDocuments,
					}		
					resolve(announcementsData);
				})
				.catch(err => {
					resolve({});
					console.log('Messaging Settings: There was a problem accessing mongodb', err);
				})
		})

	}

	const mssqlConnect = () => {
		return new Promise((resolve, reject) => {
			mssqlConnectionPool = new sql.ConnectionPool(config.mssql.hostBiObj)
			mssqlConnectionPool.connect()
				.then(() => {
					sqlError = false;
					console.log(`MSSQL database [${config.mssql.hostBi}] connection established`.green);
					resolve(sqlError);
				})
				.catch((err) => {
					sqlError = true;
					reject();
					console.log(`There was an error connecting to the MSSQL database: ${config.mssql.hostBi} `.red + err);
				});
		})
	}
	
	const startCroneJob = () => {
		let croneJob = new CronJob(
			'00 00 * * * 1-5',
			() => {
				let gmtHour = moment(moment.utc(), 'DD/MM/YYYY').hour();
				let jobTime = moment(new Date(), 'DD/MM/YYYY').format('HH:mm:ss');
				console.log('Announcements Crone Job: Checking announcements at', moment(moment.utc(), 'DD/MM/YYYY').format('HH:mm:ss'), 'GMT');
				// Check what to send

				// Trigger redis vote 
				redis.lpush('announcementTrigger', uid);
				
				let checkInterval = setInterval(() => {
					redis.lrange('announcementTrigger', 0, -1).then(serverIndexes => {
						if (serverIndexes.length > 0) {
							clearInterval(checkInterval);
							if (serverIndexes[0] === uid) {
								sendAnnouncements(gmtHour);
							}
						}
					})
						.catch(err => {
							clearInterval(checkInterval);
						})
				}, 50);

				setTimeout(() => {
					clearInterval(checkInterval);
					redis.del('announcementTrigger');
				}, 600000)
				
				
				
			},
			() => {},
			true,
			'GMT' 
		)
	}

	const announcementsInit = () => {
		loadDataFromMongo().then(data => {
			announcementsData = Object.assign({}, data);
			return mssqlConnect();
		})
		.then(() => {
			startCroneJob();
		})
		.catch(err => {
			console.log(err);
		})
	}
	
	/**
	 * Saving reminders data to mongodb, called from the admin panel
	 *
	 * @note, distributed event handled by redis, handler takes
	 * data, not req, res, data as normal http request
	 */
	announcements.addHttpInEvent({
		name: 'reminderSettingsSave',
		url: '/api/announcements/reminder-settings/',
		data: [
			[parameters.announcements.REMINDER_TIME],
			[parameters.announcements.REMINDER_INTERVAL],
			[parameters.announcements.REMINDER_MESSAGES],
			[parameters.announcements.REMINDER_ACTIVE],
			'reminderType'
		],
		handler: function(data){
			// @todo Should verify all calls from admin with jwt
			SettingsModel
			.find()
			.exec()
				.then(settings => {

					let updateData = settings[0] ? settings[0] : new SettingsModel();

					updateData[data.reminderType] = {};
					
					updateData[data.reminderType][parameters.announcements.REMINDER_TIME] = data[parameters.announcements.REMINDER_TIME];
					updateData[data.reminderType][parameters.announcements.REMINDER_INTERVAL] = data[parameters.announcements.REMINDER_INTERVAL];
					updateData[data.reminderType][parameters.announcements.REMINDER_MESSAGES] = data[parameters.announcements.REMINDER_MESSAGES];
					updateData[data.reminderType][parameters.announcements.REMINDER_ACTIVE] = data[parameters.announcements.REMINDER_ACTIVE];

					/*
					announcementsData = _.cloneDeep(updateData);
					console.log(announcementsData[data.reminderType]);
					*/

					updateData.save();
						
					//res.json({status: 'success'});
				})
				.catch(err => {
					console.log('Announcements Settings Error', err.message);
				})
		},
		method: 'post',
		distributed: true
	});


	

	// Admin panel is making this request when loading. It gets reminders data from mongodb
	announcements.addHttpInEvent({
		name: 'retreivingSettings',
		url: '/api/announcements/settings',
		data: [],
		handler: function(req, res){
			loadDataFromMongo().then(data => {
				res.send({
					settings: data,
					error: false
				});
			})
			.catch(err => {
				announcementsData = {};
				res.send({
					settings: {},
					error: true
				});
			})
		},
		method: 'get'
	});
	

	// Triggers for manually initializing reminder, used for testing 
	announcements.addHttpInEvent({
		name: 'reminderToLoginTrigger',
		url: '/api/announcements/login-reminder',
		data: [],
		handler: function(req, res){
			res.send('Reminder to Login Trigger Received');
			
			let announcementType = 'reminderToLogin';
			
			if(!announcementsData[announcementType]) return;
							
			if(!announcementsData[announcementType][parameters.announcements.REMINDER_ACTIVE]) {
				return;
			}
			
			triggers[announcementType].trigger(messageHandler, usersManagement, announcementsData[announcementType], mssqlConnectionPool);

		},
		method: 'get'
	});

	announcements.addHttpInEvent({
		name: 'reminderToRegisterTrigger',
		url: '/api/announcements/register-reminder',
		handler: function(req, res) {
			res.send('Reminder to Register Trigger Received');
			
			let announcementType = 'reminderToRegister';
			
			if(!announcementsData[announcementType]) return;

			if(!announcementsData[announcementType][parameters.announcements.REMINDER_ACTIVE]) {
				return;
			}

			triggers[announcementType].trigger(messageHandler, usersManagement, announcementsData[announcementType], mssqlConnectionPool);
		},
		method: 'get'
	});

	announcements.addHttpInEvent({
		name: 'reminderToUploadTrigger',
		url: '/api/announcements/upload-reminder',
		handler: function(req, res){
			res.send('Reminder to Upload Documents Trigger Received');
			
			let announcementType = 'reminderToUploadDocuments';
			
			if(!announcementsData[announcementType]) return;
			
			if(!announcementsData[announcementType][parameters.announcements.REMINDER_ACTIVE]) {
				return;
			}

			triggers[announcementType].trigger(messageHandler, usersManagement, announcementsData[announcementType], mssqlConnectionPool);

		},
		method: 'get'
	});


	announcementsInit();

}
