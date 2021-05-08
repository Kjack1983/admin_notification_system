const _ = require('lodash');
const parameters = require('../parameters');
const utils = require('./utils');
const sql = require('mssql');
const moment = require('moment');

const trigger = (messageHandler, usersManagement, reminderData, mssqlConnectionPool) => {

	let intervalDays = reminderData[parameters.announcements.REMINDER_INTERVAL] / utils.timeHelper.day;

	const queryString = `EXEC USP_Notifications_NotLoggedInUsers_GET  @Days =${intervalDays}`;

	new sql.Request(mssqlConnectionPool).query(queryString)
		.then(data => {

			let usersList = data.recordset.map(item => item.UserID);
								
			if(usersList.constructor !== Array) {
				console.log('Reminder to Login: Mssql returned unrecognized data format');
				return;
			}

			//usersList = ['4673093'];

			if(usersList.length === 0) return;
			
			console.log(`Reminder to Login: Preparing reminders for ${usersList.length} users`);
			
			let recipients = _.cloneDeep(utils.recipientsTemplate);
			
			let reminderMessages = utils.prepareMessage(reminderData, 'reminderToLogin');
			
			usersList.map(userId => {
				
				let user = usersManagement.getUser(userId);

				if (!user[parameters.user.DIRECT_MESSAGE_ALLOW]) return;

				let userReceivedReminder = user[parameters.user.ANNOUNCEMENTS].reduce((acc, next) => {
						if(acc) return true;
						if(next[parameters.announcements.NAME] === parameters.announcements.REMINDER_TO_LOGIN) return true;
						return false;
					}, false);
				
				if (userReceivedReminder) return;
				
				let userWillReceiveReminder = false;
				
				let announcementRecord = {
					[parameters.announcements.NAME]: parameters.announcements.REMINDER_TO_LOGIN,
					[parameters.announcements.TIME]: moment(new Date(), 'YYYY/MM/DD'),
					messages: reminderMessages.messages
				};

				user[parameters.messageChannels.MOBILES].map(mobile => {
					// Check if mobile supports direct messages
					if(!mobile[parameters.messageChannels.APP_VERSION_NUMBER]) return;
					
					userWillReceiveReminder = true;

					if (mobile[parameters.messageChannels.SYSTEM] === 'ios'){
						recipients.iosMobiles.push(mobile);
						return;
					}
					
					if (mobile[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD] === 'fcm'){
						recipients.androidMobiles.push(mobile);
						return;
					}

					if (mobile[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD] === 'pushy'){
						recipients.pushyMobiles.push(mobile);
						return;
					}
				});

				if(userWillReceiveReminder) {
					user[parameters.user.ANNOUNCEMENTS].push(announcementRecord);
					usersManagement.setUsersData(user, userId, false, true);
				}
			})

			// Send reminder to register notification
			if (Object.values(recipients).reduce((total, curr) => { return total + curr.length; }, 0)) {

				// @todo - Set send as promise and updateUserList (above) afterwards
				//
				// @todo - Fix initial reporting, commenting out for now.
				//messageHandler.send(reminderMessages, recipients, 'announcement-reminderToLogin');
			}
		})
		.catch(err => {
			console.log('Reminder to Login Error: ', err.message);
		})
	
}

module.exports = {
	trigger
}
