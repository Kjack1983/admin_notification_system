/*
 * Utility functions to help up with filtering users based on provided criterias. 
 * 
 * These are used when filtering users for direct messaging module. Based on the provided set
 * of filteres list of users is returned that satisfy filtering criterias
 *
 */
"use strict";

const parameters = require('../parameters');

module.exports = (users) => {
	/*
	 * Filtering function. Accepts list of applied filters and returns object with stats and 
	 * users' data
	 * 
	 * @param filters object 
	 * @return object 
	 */

	const userLoggedInCheck = user => {
		if(user[parameters.messageChannels.MOBILES].length === 0) return user[parameters.user.USER_ID];
		let mobileLoggedIn = false;

		user[parameters.messageChannels.MOBILES].map(mobile => {
			if(mobile[parameters.user.USER_ID]) {
				mobileLoggedIn = true;
			}
		});


	}
	const getUsersList = (filters, mode) => {
		return new Promise(resolve => {

			let initialUserList = [];
			let loggedInAlerts = [];
			let loggedOutAlerts = [];

			let alerts = [];
			let pushMessages = [];
			let mobileMessages = [];
			
			// If we provided users id from the user id's filter we initalize the user list with this list
			initialUserList = filters.selectedUsers
				.filter(id => users[id])
				.map(id =>  users[id]);
			
			

			// If we imported users from csv then this list is what we use as a starting point
			if(filters.importedUsers.length){
				initialUserList = filters.importedUsers
					.filter(id => users[id])
					.map(id => users[id]);
			}
			// If no users are provided using id filter, or csv import functionality start from scratch
			if(!initialUserList.length){
				initialUserList = Object.keys(users).map(id => users[id]);
			}
			
			// Remove users that have directMessageAllow false
			initialUserList = initialUserList.filter(user => user[parameters.user.DIRECT_MESSAGE_ALLOW]);
			
			// Culture filter, only if cultures filter exist and is not set to all
			if(filters.cultures && filters.cultures !== 'all'){
				initialUserList = initialUserList.filter(user => user[parameters.user.CULTURE] === filters.cultures)
			}
			
			// Test/Regular
			if(filters.testUsers && filters.testUsers !== 'all'){
				initialUserList = initialUserList.filter(user => {
					if(user[parameters.user.TEST_ENABLED]) {
						return filters.testUsers === 'test'
					}else{
						return filters.testUsers === 'non-test'
					}
				})
			}
			
			initialUserList.forEach(user => {
				if(
					filters.deviceType === 'all' ||
					filters.deviceType === 'alert' ||
					filters.deviceType === 'browser' ||
					filters.deviceType === 'browser-alert'
				){
					let alertEnabled = 
						user[parameters.messageChannels.SOCKETS]
							.reduce((prev, curr) => {
								if(prev) return true;
								return (curr[parameters.messageChannels.SOCKET_ACTIVE] && filters.alertActiveLanguages.indexOf(curr[parameters.user.LANGUAGE]) > -1);
							}, false);
					
					if(alertEnabled){
						if(user[parameters.user.USER_ID] && (filters.userType === 'in' || filters.userType === 'all')) {
							alerts.push(user);
						}

						if(!user[parameters.user.USER_ID] && (filters.userType === 'out' || filters.userType === 'all')) {
							alerts.push(user);
						}
					}
				}



				if(
					filters.deviceType === 'all' ||
					filters.deviceType === 'push-all' ||
					filters.deviceType === 'browser' ||
					filters.deviceType === 'browser-push'
				){
					// Push is considered enabled if the language of the user is found in the list of message 
					// languages
					user[parameters.messageChannels.PUSH]
							.map(push => {
								if(push[parameters.messageChannels.PUSH_ACTIVE] && filters.pushActiveLanguages.indexOf(push[parameters.user.LANGUAGE]) > -1){
									if(user[parameters.user.USER_ID] && (filters.userType === 'in' || filters.userType === 'all')){
										pushMessages.push(push);
									}

									if(!user[parameters.user.USER_ID] && (filters.userType === 'out' || filters.userType === 'all')){
										pushMessages.push(push);
									}
												
								}
							});
				}
				

				if(
					filters.deviceType === 'all' ||
					filters.deviceType === 'push-all' ||
					filters.deviceType === 'mobile'
				){
					user[parameters.messageChannels.MOBILES]
						.map(mobile => {
							if( filters.mobileActiveLanguages.indexOf(mobile[parameters.user.LANGUAGE]) > -1 && mobile[parameters.messageChannels.APP_VERSION_NUMBER]){
								
								if(mobile[parameters.user.USER_ID] && (filters.userType === 'in' || filters.userType === 'all')) {
									mobileMessages.push(mobile);
								}

								if(!mobile[parameters.user.USER_ID] && (filters.userType === 'out' || filters.userType === 'all') ) {
									mobileMessages.push(mobile);
								}
								
							}
						});
					
				}
			});
			let pushyMobiles = [], 
			    iosMobiles = [],
			    androidMobiles = [];
			
			// Filterout logged in or out mobile devices
			
			mobileMessages.map(mobile => {

				if(mobile[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD] === 'pushy'){
					pushyMobiles.push(mobile);
					return;
				}
				
				if(mobile[parameters.messageChannels.SYSTEM] === 'ios'){
					iosMobiles.push(mobile);
					return;
				}
				
				androidMobiles.push(mobile);
			});

			

			let response = {
				alerts: alerts.length,
				push: pushMessages.length,
				mobiles: mobileMessages.length,
				userInfo: {}
			};
			
			if(mode === 'messaging') {
				response.userInfo = {
					alerts: [...alerts],
					push: [...pushMessages],
					mobiles: [...mobileMessages],
					pushyMobiles: [...pushyMobiles],
					iosMobiles: [...iosMobiles],
					androidMobiles: [...androidMobiles]
				}
			}

			if(mode === 'filtering') {
				response.userInfo = {
					alerts: [],
					push: [],
					mobiles: [],
					pushyMobiles: [],
					iosMobiles: [],
					androidMobiles: []
				}
				if(filters.userIdFilter !== ''){
					let userInfo = {
						alerts: [...alerts],
						push: [...pushMessages],
						mobiles: [...mobileMessages],
						pushyMobiles: [...pushyMobiles],
						iosMobiles: [...iosMobiles],
						androidMobiles: [...androidMobiles]
					};

					Object.keys(userInfo).forEach(function(registration) {
						userInfo[registration].forEach(function(user) {
							let id = user.userID;
							let idFilter = filters.userIdFilter;
							if(id && response.userInfo[registration].indexOf(id) < 0 && id.indexOf(idFilter) === 0){
								response.userInfo[registration].push(id);
							}
						})
					});
				}
			}
		}
		return response;
	}


	
	return {
		getUsersList
	}
	


}

	
