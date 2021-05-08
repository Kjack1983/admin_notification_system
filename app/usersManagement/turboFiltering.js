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

	/**
	 * Is culture allowed
	 *
	 * Filter user by culture.
	 *
	 * @param {object} user User object to filter
	 * @param {string} culture Selected culture to match
	 * @return {boolean} result
	 */
	const isCultureAllowed = (user, culture) => {

		let result = true;

		if (culture && culture !== 'all') {
			if (user[parameters.user.CULTURE] !== culture) {
				result = false;
			}
		}

		return result;
	}

	/**
	 * Is registration state allowed
	 *
	 * Filter users by their registration state.
	 *
	 * @param {object} user User object to filter
	 * @param {string} state Selected registration state to match
	 * @return {boolean} result
	 */
	const isRegistrationStateAllowed = (user, state) => {

		let result = true;

		if (state && state !== 'all') {

			// Selected registered but no user id
			if (state === 'registered' && !user[parameters.user.USER_ID]) {
				result = false;
			}

			// Selected not registered but user has id
			else if (state === 'not-registered' && user[parameters.user.USER_ID]) {
				result = false;
			}
		}

		return result;
	}

	/**
	 * Is login state allowed
	 *
	 * Filter users by their current logged in / out state.
	 *
	 * @todo This should check the current logged in status 
	 * instead of just the user id.  Id only is registered check.
	 *
	 * @param {object} user User object to filter
	 * @param {string} state Selected login state to match
	 * @return {boolean} result
	 */
	const isLoginStateAllowed = (user, state) => {

		let result = true;

		if (state && state !== 'all') {

			// Selected logged in but no user id
			if (state === 'in' && !user[parameters.user.USER_ID]) {
				result = false;
			}

			// Selected logged out but user has id
			else if (state === 'out' && user[parameters.user.USER_ID]) {
				result = false;
			}
		}

		return result;
	}

	/**
	 * Is device type allowed
	 *
	 * Filter users based on allowed devices array.
	 *
	 * @param {string} type Type to test.
	 * @param {array} allowed List of allowed device types.
	 * @return {boolean} result
	 */
	const isDeviceTypeAllowed = (type, allowed = []) => {
		return allowed.includes(type);
	}

	/**
	 * Is mobile os allowed
	 *
	 * Filter mobile devices by their os type.
	 *
	 * @param {object} mobile Mobile object to filter
	 * @param {string} os Operating system to match
	 * @return {boolean} result
	 */
	const isMobileOSAllowed = (mobile, os) => {

		let result = true;

		if (os && os !== 'all') {

			// Selected android but device is ios
			if (os === 'android' && mobile[parameters.messageChannels.SYSTEM] === 'ios') {
				result = false;
			}

			// Selected ios but device is android
			else if (os === 'ios' && mobile[parameters.messageChannels.SYSTEM] === 'android') {
				result = false;
			}
		}

		return result;
	}

	/**
	 * Is mobile app version allowed
	 *
	 * Filter mobile devices by their selected app version.
	 *
	 * @param {object} mobile Mobile object to filter
	 * @param {string} versions App Versions to match
	 * @return {boolean} result
	 */
	const isMobileAppVersionAllowed = (mobile, versions) => {

		let result = true;

		// Mobile Version
		const version = mobile[parameters.messageChannels.APP_VERSION_NUMBER];

		// Versions specified but mobile version not included
		if (Array.isArray(versions) && versions.length && !versions.includes(version)) {
			result = false;
		}

		return result;
	}

	/**
	 * Is Geo located country allowed
	 *
	 * Filter devices based on the selected geolocations.
	 *
	 * @param {object} device Device object to test (socket / push / mobile)
	 * @param {array} countries List of allowed countries
	 * @return {booelan} result
	 */
	const isGeoCountryAllowed = (device, countries) => {

		let result = true;

		if (countries && countries.length) {

			if (!device[parameters.tracking.COUNTRY_ISO_CODE] || !countries.includes(device[parameters.tracking.COUNTRY_ISO_CODE])) {
				return false;
			}
		}

		return result;
	}
	
	const filterUsers = (userList, data, testContent = true) => {

		let alerts = [];
		let pushMessages = [];
		let mobileMessages = [];
		let pushyMobiles = [];
		let iosMobiles = [];
		let androidMobiles = [];
		
		let alertActiveLanguages = [],
			pushActiveLanguages = [],
			mobileActiveLanguages = [];

		// Set active languages
		if (data.filters.deviceLanguages) {

			for (const [device, langs] of Object.entries(data.filters.deviceLanguages)) {

				let active = [];
				for (const lang of langs) {
					if (testContent === false || (data.messages[device].text[lang] !== '' && data.messages[device].title[lang] !== '')) {
						active.push(lang);
					}
				}

				switch (device) {
					case 'alert':
						alertActiveLanguages = active;
						break;
					case 'push':
						pushActiveLanguages = active;
						break;
					case 'mobile':
						mobileActiveLanguages = active;
						break;
				}
			}
		
			// For each filter apply its rules;
			userList.map(user => {

				// Exit if direct messaging turned off by user 
				if (!user || !user[parameters.user.DIRECT_MESSAGE_ALLOW]) {
					return;
				}

				// Culture filter
				if (!isCultureAllowed(user, data.filters.cultures)) {
					return;
				}

				// Registration state filter
				// @todo - checking in 'getClientIds' shows return data with
				// userId null values.  Assume due to device specific userId...
				// 2 possibilites:
				//   1. Add isRegistrationStateAllowed check on all device (and loggedIn / culture?)
				//   2. Check device <-> user correlation to ensure no devices without userId
				//      belong to a client.  Should only be associated when a user logs in / registers.
				// For now will filter out null values in 'getClientIds'.
				if (!isRegistrationStateAllowed(user, data.filters.registrationState)) {
					return;
				}

				// Login state filter
				if (!isLoginStateAllowed(user, data.filters.userType)) {
					return;
				}

				// Device type filter for alerts
				if (isDeviceTypeAllowed('alert', Object.keys(data.filters.deviceLanguages))) {

					let alertEnabled = user[parameters.messageChannels.SOCKETS].reduce((prev, curr) => {
						if (prev) return true;
						if (curr[parameters.messageChannels.SOCKET_ACTIVE] && alertActiveLanguages.indexOf(curr[parameters.user.LANGUAGE]) > -1) {

							// Geo located country
							if (!isGeoCountryAllowed(curr, data.filters.countries)) {
								return false;
							}

							return true;
						}

						return false;
					}, false);
					
					if (alertEnabled) {
						alerts.push(user);
					}
				}

				// Device type filter for browser push
				if (isDeviceTypeAllowed('push', Object.keys(data.filters.deviceLanguages))) {

					user[parameters.messageChannels.PUSH].map(push => {
						if (push[parameters.messageChannels.PUSH_ACTIVE] && pushActiveLanguages.indexOf(push[parameters.user.LANGUAGE]) > -1) {

							// Geo located country
							if (!isGeoCountryAllowed(push, data.filters.countries)) {
								return;
							}

							pushMessages.push(push);
						}
					});
				}

				// Device type filter for mobile push
				if (isDeviceTypeAllowed('mobile', Object.keys(data.filters.deviceLanguages))) {

					user[parameters.messageChannels.MOBILES].map(mobile => {

						if (mobileActiveLanguages.indexOf(mobile[parameters.user.LANGUAGE]) > -1 && mobile[parameters.messageChannels.APP_VERSION_NUMBER]){

							// Geo located country
							if (!isGeoCountryAllowed(mobile, data.filters.countries)) {
								return;
							}

							// Mobile OS type
							if (!isMobileOSAllowed(mobile, data.filters.mobileOsType)) {
								return;
							}

							// Add to iOS devices
							if (mobile[parameters.messageChannels.SYSTEM] === 'ios') {

								if (!isMobileAppVersionAllowed(mobile, data.filters.iosVersions)) {
									return;
								}

								mobileMessages.push(mobile);
								iosMobiles.push(mobile);
								return;
							}

							// Add to Android devices
							if (mobile[parameters.messageChannels.SYSTEM] === 'android') {

								if (!isMobileAppVersionAllowed(mobile, data.filters.androidVersions)) {
									return;
								}

								mobileMessages.push(mobile);

								// Add to Android FCM devices
								if (mobile[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD] === 'fcm') {
									androidMobiles.push(mobile);
									return;
								}

								// Add to Android Pushy devices
								if (mobile[parameters.messageChannels.NOTIFICATION_DELIVERY_METHOD] === 'pushy') {
									pushyMobiles.push(mobile);
									return;
								}
							}
						}
					});
				}
			});
		}
		
		return {
			alerts: [...alerts],
			push: [...pushMessages],
			mobiles: [...mobileMessages],
			pushyMobiles: [...pushyMobiles],
			iosMobiles: [...iosMobiles],
			androidMobiles: [...androidMobiles]
		};
	}

	/** 
	 * User stats
	 *
	 * Return object format
	 * {
	 *	alerts: alerts.length,
	 *	push: pushMessages.length,
	 *	mobiles: mobileMessages.length,
	 *	userInfo: {
	 *		alerts: [...alerts],
	 *		push: [...pushMessages],
	 *		mobiles: [...mobileMessages],
	 *		pushyMobiles: [...pushyMobiles],
	 *		iosMobiles: [...iosMobiles],
	 *		androidMobiles: [...androidMobiles]
	 *
	 *	},
	 *  recepientIds: {
	 *		alerts: [],
	 *		push: [],
	 *		mobiles: [],
	 *		pushyMobiles: [],
	 *		iosMobiles: [],
	 *		androidMobiles: []
	 *  }
	 * }
	 *
	 * @param {array} userList List of users to find stats for.
	 * @param {object} data Notification data passed from the admin.
	 * @return {object} userStats
	 */
	const getUsersStats = (userList, data) => {

		let userInfo = filterUsers(userList, data, !!data.messages);

		let userStats = {
			alerts: userInfo.alerts.length,
			push: userInfo.push.length,
			mobiles: userInfo.mobiles.length,
			userInfo: {
				alerts: [],
				push: [],
				mobiles: [],
				pushyMobiles: [],
				iosMobiles: [],
				androidMobiles: []			
			}
		}

		if (data.filters.mode === 'send') {
			userStats.userInfo = Object.assign({}, userInfo);
		}

		if (data.filters.mode === 'stats') {
			if (data.filters.userIdFilter !== '') {
				Object.keys(userInfo).forEach(function(registration) {
					userInfo[registration].forEach(function(user) {
						let id = user.userID;
						let idFilter = data.filters.userIdFilter;
						if(id && userStats.userInfo[registration].indexOf(id) < 0 && id.indexOf(idFilter) === 0){
							userStats.userInfo[registration].push(id);
						}
					})
				});
			}	
		}

		userStats.recipientIds = {
			alerts: userStats.userInfo.alerts.map(user => user.userID),
			push: userStats.userInfo.push.map(user => user.userID),
			mobiles: userStats.userInfo.mobiles.map(user => user.userID),
			pushyMobiles: userStats.userInfo.pushyMobiles.map(user => user.userID),
			iosMobiles:userStats.userInfo.iosMobiles.map(user => user.userID),
			androidMobiles: userStats.userInfo.androidMobiles.map(user => user.userID),
		}

		return userStats;
	}

	/**
	 * Return user list
	 *
	 * Heavily used for recipient targetting in admin
	 *
	 * @param {object} notification Notification data passed from the admin.
	 * @return {object}
	 */
	const getUsersList = (notification) => {

		const mode = notification.filters.mode;
		
		let userList = [];

		const {
			selectedUsers,
			importedUsers,
		} = notification.filters;

		// Selected users were chosen by hand
		if (selectedUsers && selectedUsers.length > 0) {
			userList = notification.filters.selectedUsers.map(id => users[id]);
		}

		// Imported users were added via upload csv
		else if (importedUsers && importedUsers.length > 0) {
			userList = notification.filters.importedUsers.map(id => users[id]);
		}

		// Filtered users were targetted through notification.filters
		else if (notification.filters.filtersEnabled){
			userList = Object.keys(users).map(id => users[id]);
		}
		
		return getUsersStats(userList, notification);
	}

	/**
	 * Return user list based on id
	 *
	 * Used for select users functionality in admin
	 *
	 * @param {object} notification Notification data passed from the admin.
	 * @return {object}
	 */
	const filterUserIds = (notification) => {
		return getUsersStats(Object.keys(users).map(id => users[id]), notification);
	}

	/**
	 * Get Client Ids
	 *
	 * Returns list of unique easyMarkets client ids based
	 * on notification filters.
	 *
	 * @param {object} filters Filters to reduce list.
	 * @return {array}
	 */
	const getClientIds = filters => {

		let clientIds = [];

		// Fetch all users
		const allUsers = Object.keys(users).map(id => users[id]);

		// Filter with registered only
		const { pushyMobiles, iosMobiles, androidMobiles, ...devices } = filterUsers(allUsers, {
			filters: {
				...filters || {},
				...{
					registrationState: 'registered'
				}
			}
		}, false);

		// Merge client id lists per device type
		Object.entries(devices).forEach(([deviceType, deviceList]) => {

			// Keep only devices with EM user id
			// @note - see todo filterUsers isRegistrationStateAllowed function
			clientIds = [ ...clientIds, ...deviceList.filter(device => !!device[parameters.user.USER_ID]).map(device => {
				return device[parameters.user.USER_ID];
			})];
		});

		// Return unique id list
		return [...new Set(clientIds)];
	};

	/**
	 * Return notification filter options
	 *
	 * @param {object} notification Notification data passed from the admin.
	 */
	const getNotificationFilters = notification => {

		let options = {
			countries: {},
			versions: {},
		};

		const devices = filterUsers(Object.keys(users).map(id => users[id]), notification, false);
		const { deviceLanguages } = notification.filters; 

		Object.keys(devices).forEach(deviceType => {

			devices[deviceType].map(device => {

				// Add Country Options
				const {countryIsoCode, country, timeZone} = device;

				if (countryIsoCode && country && !options.countries[countryIsoCode]) {
					if (timeZone && timeZone !== 'UTC') {
						options.countries[countryIsoCode] = {
							country: country.replace(/\b\w/g, l => l.toUpperCase()),
							timeZone: timeZone
						};
					}
				}

				// Add App Version Options
				if (Array.isArray(deviceLanguages.mobile) && deviceLanguages.mobile.length) {

					const {system, appVersionNumber} = device;

					if (system && appVersionNumber) {
						options.versions[system] = options.versions[system] || [];
						options.versions[system].push(appVersionNumber);
					}
				}
			});
		});

		// Sort country list by country
		options.countries = Object.keys(options.countries).sort((a, b) => {
			const c1 = options.countries[a].country.toLowerCase();
			const c2 = options.countries[b].country.toLowerCase();
			return c1 !== c2 ? (c1 < c2 ? -1 : 1) : 0
		}).reduce((a, c) => (a[c] = options.countries[c], a), {});

		// Unique and reverse sort versions
		options.versions = Object.entries(options.versions).reduce((acc, [system, versions]) => {
			acc[system] = [...new Set(versions)].sort((a, b) => {
				return sortVersions(a, b, 'desc');
			});
			return acc;
		}, {});

		return options;
	};

	/**
	 * Sort semantic versions
	 *
	 * Handles standard and non standard semantic versions:
	 * - 1.2.3 = standard - applicable to EM iOS app.
	 * - 1.2.3.4 = non stndard - applicable to EM Android app.
	 *
	 * @param {string} v1 First version to compare in sort.
	 * @param {string} v2 Second version to compare in sort.
	 * @param {string} direction Direction sort should take (default asc).
	 * @param {integer} index Internal index used in part based version comparison.
	 * @return {integer}
	 */
	const sortVersions = (v1, v2, direction = 'asc', index = 0) => {

		const v1Parts = v1.split('.');
		const v2Parts = v2.split('.');

		const limit = Math.max(v1Parts.length, v2Parts.length);
		const v1Current = parseInt(v1Parts[index] || 0, 10);
		const v2Current = parseInt(v2Parts[index] || 0, 10);

		if (v1Current > v2Current) {
			return direction === 'desc' ? -1 : 1;
		}

		if (v1Current < v2Current) {
			return direction === 'desc' ? 1 : -1;
		}

		if ((index + 1) < limit) {
			return sortVersions(v1, v2, direction, (index + 1));
		}

		return 0;
	};

	return {
		getUsersList,
		filterUserIds,
		getNotificationFilters,
		getClientIds
	}
}
