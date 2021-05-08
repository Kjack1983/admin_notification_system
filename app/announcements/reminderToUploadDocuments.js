const _ = require('lodash');
const parameters = require('../parameters');
const utils = require('./utils');
const sql = require('mssql');
const moment = require('moment');

const trigger = (messageHandler, usersManagement, reminderData, mssqlConnectionPool) => {
	
	let currentTime = new Date();
	
	let intervalDays = reminderData[parameters.announcements.REMINDER_INTERVAL] / utils.timeHelper.day;

	const queryString = `EXEC USP_Notifications_KYCUsers_GET @Days = ${intervalDays}`;

	new sql.Request(mssqlConnectionPool).query(queryString)
		.then(data => {
			
			let users = usersManagement.getUsers();

			let usersList = data.recordset.map(item => item.UserID);

			if(usersList.constructor !== Array) {
				console.log('KYC Reminder: Mssql returned unrecognized data format');
				return;
			}
			//usersList = ['4426010'];
			
			if(usersList.length === 0) return;

			console.log(`KYC Reminder: Preparing reminders for ${usersList.length} users`);
	
			let recipients = _.cloneDeep(utils.recipientsTemplate);
			
			let reminderMessages = utils.prepareMessage(reminderData, 'reminderToUploadDocuments');
			
			usersList.map(userId => {
				
				let user = usersManagement.getUser(userId);

				if (!user[parameters.user.DIRECT_MESSAGE_ALLOW]) return;

				let userReceivedReminder = user[parameters.user.ANNOUNCEMENTS].reduce((acc, next) => {
						if(acc) return true;
						if(next[parameters.announcements.NAME] === parameters.announcements.REMINDER_TO_UPLOAD) return true;
						return false;
					}, false);
				
				if (userReceivedReminder) return;
				
				let userWillReceiveReminder = false;
				
				let announcementRecord = {
					[parameters.announcements.NAME]: parameters.announcements.REMINDER_TO_UPLOAD,
					[parameters.announcements.TIME]: moment(currentTime, 'YYYY/MM/DD'),
					messages: reminderMessages.messages
				};
				
				let alertEnabled = 
					user[parameters.messageChannels.SOCKETS]
						.reduce((prev, curr) => {
							if(prev) return true;
							return curr[parameters.messageChannels.SOCKET_ACTIVE];
						}, false);
				
				if(alertEnabled) {
					recipients.alerts.push(user);
					userWillReceiveReminder = true;
				}

				user[parameters.messageChannels.PUSH].map(push => {
					if(push[parameters.messageChannels.PUSH_ACTIVE]){
						recipients.push.push(push);
						userWillReceiveReminder = true;
					}
				});

				user[parameters.messageChannels.MOBILES].map(mobile => {
					// Check if mobile supports direct messages
					if(!mobile[parameters.messageChannels.APP_VERSION_NUMBER]) return;
					
					userWillReceiveReminder = true;
					
					if(mobile[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD] === 'pushy') {
						recipients.pushyMobiles.push(mobile);
						return;
					}

					if(mobile[parameters.messageChannels.SYSTEM] === 'ios') {
						recipients.iosMobiles.push(mobile);
						return;
					}
					recipients.androidMobiles.push(mobile);

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
				//messageHandler.send(reminderMessages, recipients, 'announcement-reminderToUploadDocuments');
			}
		})
		.catch(err => {
			console.log(err);
		})	

}
module.exports = {
	trigger
}
