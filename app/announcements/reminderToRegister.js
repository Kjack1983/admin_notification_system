const _ = require('lodash');
const parameters = require('../parameters');
const utils = require('./utils');
const sql = require('mssql');
const moment = require('moment');

const trigger = (messageHandler, usersManagement, reminderData, mssqlConnectionPool) => {
	
	// Get the recepients template
	let recipients = _.cloneDeep(utils.recipientsTemplate);
	
	let currentTime = new Date();
	
	// Get the list of all users
	let users = usersManagement.getUsers();
	
	let reminderMessages = utils.prepareMessage(reminderData, 'reminderToRegister');

	let unregisteredUserList = Object.keys(users)
		.map(id => users[id])
		.filter(user => {

			// Making sure user never logged in to the system
			if(user[parameters.user.USER_ID]) return false;
			
			if(user[parameters.messageChannels.MOBILES].length === 0) return false;
			
			if(!user[parameters.user.ANNOUNCEMENTS]) return true;
			// Make sure that user haven't yet received this announcement 
			
			if(user[parameters.user.ANNOUNCEMENTS].length === 0) return true;

			return !user[parameters.user.ANNOUNCEMENTS].reduce((acc, next) => {
				if(acc) return true;
				if(next[parameters.announcements.NAME] === parameters.announcements.REMINDER_TO_REGISTER) return true;
				return false;
			}, false);

		});

	let updateUserList = [];

	unregisteredUserList.map(user => {
		let id = usersManagement.getUserId(user);
		let userChanged = false;
		
		user[parameters.messageChannels.MOBILES].map(mobile => {
			
			// Making sure the app can receive direct messages
			if(!mobile[parameters.messageChannels.APP_VERSION_NUMBER]) return;
			
			let mobileFirstConnectioDate = mobile[parameters.messageChannels.FIRST_CONNECTION_DATE];

			// Making sure the app has the first connection date parameter
			if(!mobileFirstConnectioDate) return;
			
			// Making sure user is not logged in
			if(mobile[parameters.user.USER_ID]) return;
			
			let timeDifference;
			
			let diff = moment.duration( currentTime - mobileFirstConnectioDate );
			
			let mobileLanguage = mobile[parameters.user.LANGUAGE];
			
			if(reminderMessages.messages.mobile.text[mobileLanguage] === '' || reminderMessages.messages.mobile.title[mobileLanguage] === '') return;

			//console.log('Difference is: ' + diff )

			if(diff < reminderData.reminderInterval) {
				return		
			}
			// Update users announcements array
			userChanged = true;

			if(mobile[parameters.messageChannels.SYSTEM] === 'ios'){
				recipients.iosMobiles.push(mobile);
				return;
			}
			
			if(mobile[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD] === 'fcm'){
				recipients.androidMobiles.push(mobile);
				return;
			}

			if(mobile[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD] === 'pushy'){
				recipients.pushyMobiles.push(mobile);
				return;
			}

		})
		if(userChanged) {
			updateUserList.push(id);
		}
	})

	updateUserList.map(id => {
		let user = usersManagement.getUser(id);
		
		let announcementRecord = {
			[parameters.announcements.NAME]: parameters.announcements.REMINDER_TO_REGISTER,
			[parameters.announcements.TIME]: moment(currentTime, 'YYYY/MM/DD'),
			messages: reminderMessages.messages
		};
		
		user[parameters.user.ANNOUNCEMENTS].push(announcementRecord);
		usersManagement.setUsersData(user, id, false, true);
	});

	// Send reminder to register notification
	if (Object.values(recipients).reduce((total, curr) => { return total + curr.length; }, 0)) {

		// @todo - Set send as promise and updateUserList (above) afterwards
		//
		// @todo - Fix initial reporting, commenting out for now.
		//messageHandler.send(reminderMessages, recipients, 'announcement-reminderToRegister');
	}
}
module.exports = {
	trigger
}
