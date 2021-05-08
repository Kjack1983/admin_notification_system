"use strict";


const config = require('../config');
const UsersModel = require('../../models/user');
const _ = require('lodash');
const parameters = require('../parameters');


const duplicateStats = users => {
	let mobileTokenDuplicates = {},
		mobileDeviceDuplicates = {},
		browserTokenDuplicates = {},
		browserHashDuplicates = {},
		userIndexes = [];

	let totalMobileTokenDuplicates = 0;
	let totalMobileDeviceDuplicates = 0;
	let totalTokenNumbers = 0;
	let totalDeviceIdNumbers = 0;
	let totalMobileAppNumber = 0;	

	let totalBrowserTokenDuplicates = 0;
	let totalBrowserHashDuplicates = 0;
	let totalBrowserTokenNumbers = 0;
	let totalBrowserHashNumbers = 0;
	let totalBrowserPushNumbers = 0;

	users.map((user, userIndex) => {
		user[parameters.messageChannels.MOBILES].map(mobile => {
			
			let token = mobile[parameters.messageChannels.TOKEN];
			let deviceId = mobile[parameters.messageChannels.DEVICE_ID];
			
			if(!mobileTokenDuplicates[token]) {
				totalTokenNumbers++;
				mobileTokenDuplicates[token] = 1;
			}else{
				if(userIndexes.indexOf(userIndex) === -1){
					userIndexes.push(userIndex);
				}
				mobileTokenDuplicates[token]++;
			}

			if(deviceId){
				if(!mobileDeviceDuplicates[deviceId]) {
					totalDeviceIdNumbers++;
					mobileDeviceDuplicates[deviceId] = 1;
				}else{
					if(userIndexes.indexOf(userIndex) === -1){
						userIndexes.push(userIndex);
					}
					mobileDeviceDuplicates[deviceId]++;
				}

			}

			totalMobileAppNumber++;
		});

		user[parameters.messageChannels.PUSH].map(push => {
			
			let browserToken = push[parameters.messageChannels.TOKEN];
			let machineHash = push[parameters.messageChannels.MACHINE_HASH];
			
			if(!browserTokenDuplicates[browserToken]) {
				totalBrowserTokenNumbers++;
				browserTokenDuplicates[browserToken] = 1;
			}else{
				if(userIndexes.indexOf(userIndex) === -1){
					userIndexes.push(userIndex);
				}
				browserTokenDuplicates[browserToken]++;
			}

			
			if(!browserHashDuplicates[machineHash]) {
				totalBrowserHashNumbers++;
				browserHashDuplicates[machineHash] = 1;
			}else{
				if(userIndexes.indexOf(userIndex) === -1){
					userIndexes.push(userIndex);
				}
				browserHashDuplicates[machineHash]++;
			}

			totalBrowserPushNumbers++;
		});


	});

	totalMobileTokenDuplicates = Object.keys(mobileTokenDuplicates)
		.map(token => mobileTokenDuplicates[token])
		.filter(duplicate => duplicate > 1).length;

	totalMobileDeviceDuplicates = Object.keys(mobileDeviceDuplicates)
		.map(deviceId => mobileDeviceDuplicates[deviceId])
		.filter(duplicate => duplicate > 1).length;
	
	totalBrowserTokenDuplicates = Object.keys(browserTokenDuplicates)
		.map(browserToken => browserTokenDuplicates[browserToken])
		.filter(duplicate => duplicate > 1).length;

	totalBrowserHashDuplicates = Object.keys(browserHashDuplicates)
		.map(machineHash => browserHashDuplicates[machineHash])
		.filter(duplicate => duplicate > 1).length;

	console.log(`Mobile Duplicates stats: totalMobileTokenDuplicates ->  ${totalMobileTokenDuplicates} totalMobileDeviceDuplicates ->  ${totalMobileDeviceDuplicates}  totalTokenNumbers -> ${totalTokenNumbers} totalDeviceIdNumbers -> ${totalDeviceIdNumbers} totalMobileAppNumber -> ${totalMobileAppNumber}\n`.magenta);	
	
	console.log(`Browser Duplicates stats: totalBrowserTokenDuplicates ->  ${totalBrowserTokenDuplicates} totalBrowserHashDuplicates ->  ${totalBrowserHashDuplicates}  totalBrowserTokenNumbers -> ${totalBrowserTokenNumbers} totalBrowserPushNumbers -> ${totalBrowserPushNumbers} \n`.magenta);

	console.log(`totalNumberOfUsersWithDuplicates -> ${userIndexes.length}`.magenta);
};

const clearMobiles = users => {
	let mobileTokenMap = {}, 
		mobileDeviceMap = {},
		validIndicatorMap = {};

	// Create data maps
	console.log('\nStarting mobile duplicates detection');
	//duplicateStats(users);
	//console.log('\n************************************************************\n');
	users.map( (user, userIndex) => {
		validIndicatorMap[userIndex] = {};
		user[parameters.messageChannels.MOBILES].map((mobile, deviceIndex) => {

			let token = mobile[parameters.messageChannels.TOKEN];
			let deviceId = mobile[parameters.messageChannels.DEVICE_ID];
			let lastConnectionDate = new Date(mobile[parameters.messageChannels.LAST_CONNECTION_DATE]);
			
			validIndicatorMap[userIndex][deviceIndex] = true;

			if(!mobileTokenMap[token]) {
				mobileTokenMap[token] = [];
			}

			mobileTokenMap[token].push({
				userIndex,
				deviceIndex,
				lastConnectionDate	
			})
			if(deviceId){
				if(!mobileDeviceMap[deviceId]) {
					mobileDeviceMap[deviceId] = [];
				}

				mobileDeviceMap[deviceId].push({
					userIndex,
					deviceIndex,
					lastConnectionDate
				});
				
			}
		})
	});

	Object.keys(mobileTokenMap)
		.map(token => mobileTokenMap[token])
		.map(tokenApps => {
			let lcd;
			tokenApps.map(tokenApp => {
				let lastConnectionDate = tokenApp.lastConnectionDate;
				let userIndex = tokenApp.userIndex;
				let deviceIndex = tokenApp.deviceIndex;
				if(!lcd) {
					lcd = lastConnectionDate;
				}else{
					lcd = lcd < lastConnectionDate ? lastConnectionDate : lcd;
				}
			});

			tokenApps.map(tokenApp => {
				let lastConnectionDate = tokenApp.lastConnectionDate;
				let userIndex = tokenApp.userIndex;
				let deviceIndex = tokenApp.deviceIndex;
				// Indicating as invalid every device with duplicate token with last connection date less than the latest one
				if(lastConnectionDate !== lcd){
					validIndicatorMap[userIndex][deviceIndex] = false;
				}
			});
		});
	

	Object.keys(mobileDeviceMap)
		.map(deviceId => mobileDeviceMap[deviceId])
		.map(deviceApps => {
			let lcd;
			deviceApps.map(deviceApp => {
				let lastConnectionDate = deviceApp.lastConnectionDate;
				let userIndex = deviceApp.userIndex;
				let deviceIndex = deviceApp.deviceIndex;
				if(!lcd) {
					lcd = lastConnectionDate;
				}else{
					lcd = lcd < lastConnectionDate ? lastConnectionDate : lcd;
				}
			});

			deviceApps.map(deviceApp => {
				let lastConnectionDate = deviceApp.lastConnectionDate;
				let userIndex = deviceApp.userIndex;
				let deviceIndex = deviceApp.deviceIndex;
				// Indicating as invalid every device with duplicate token with last connection date less than the latest one
				if(lastConnectionDate !== lcd){
					validIndicatorMap[userIndex][deviceIndex] = false;
				}
			});
		});
	
	let userChangedIndexList = [];

	users = users.map((user, userIndex) => {
		let mobiles = user[parameters.messageChannels.MOBILES];
		mobiles = mobiles.filter((mobile, deviceIndex) => {
			if(!validIndicatorMap[userIndex][deviceIndex] && userChangedIndexList.indexOf(userIndex) === -1) {
				userChangedIndexList.push(userIndex);
			}
			return validIndicatorMap[userIndex][deviceIndex]
		});
		user[parameters.messageChannels.MOBILES] = [...mobiles];
		return user;
	})

	
	//duplicateStats(users);
	
	console.log('\nMobile duplicate detection completed')
	
	return userChangedIndexList;

}






const clearBrowsers = users => {
	console.log('\nStarting browser duplicates detection');
	
	let browserTokenMap = {},
		browserHashMap = {},
		browserValidIndicatorMap = {};


	//duplicateStats(users);
	users.map( (user, userIndex) => {
		browserValidIndicatorMap[userIndex] = {};
		user[parameters.messageChannels.PUSH].map((push, deviceIndex) => {

			let token = push[parameters.messageChannels.TOKEN];
			let machineHash = push[parameters.messageChannels.MACHINE_HASH];
			
			browserValidIndicatorMap[userIndex][deviceIndex] = true;

			if(!browserTokenMap[token]) {
				browserTokenMap[token] = [];
			}

			browserTokenMap[token].push({
				userIndex,
				deviceIndex
			})

			if(!browserHashMap[machineHash]) {
				browserHashMap[machineHash] = [];
			}

			browserHashMap[machineHash].push({
				userIndex,
				deviceIndex
			});			
		})
	});

	Object.keys(browserTokenMap)
		.map(token => browserTokenMap[token])
		.map(tokenApps => {
			if(tokenApps.length > 1){
				tokenApps.map(tokenApp => {
					let userIndex = tokenApp.userIndex;
					let deviceIndex = tokenApp.deviceIndex;
					browserValidIndicatorMap[userIndex][deviceIndex] = false;
				});
			}
		});

	Object.keys(browserHashMap)
		.map(machineHash => browserHashMap[machineHash])
		.map(hashApps => {
			if(hashApps.length > 1) {
				hashApps.map(hashApp => {
					let userIndex = hashApp.userIndex;
					let deviceIndex = hashApp.deviceIndex;
					if(browserValidIndicatorMap[userIndex][deviceIndex]){
						browserValidIndicatorMap[userIndex][deviceIndex] = false;
					}
				});
				
			}
		});
	
	let userChangedIndexList = [];

	users = users.map((user, userIndex) => {
		let pushes = user[parameters.messageChannels.PUSH];
		pushes = pushes.filter((push, deviceIndex) => {
			if(!browserValidIndicatorMap[userIndex][deviceIndex] && userChangedIndexList.indexOf(userIndex) === -1) {
				userChangedIndexList.push(userIndex);
			}
			return browserValidIndicatorMap[userIndex][deviceIndex]
		});
		user[parameters.messageChannels.PUSH] = [...pushes];
		return user;
	})

	
	//duplicateStats(users);
	
	console.log('\nBrowser duplication detection completed\n')
	//checkBrowserTokenDuplicates(users);

	return userChangedIndexList;
	
}

module.exports =  {
	clearMobiles,
	clearBrowsers	
}