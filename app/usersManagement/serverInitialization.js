"use strict";

const mongoDbDataProcessing = require('./mongoDbDataProcessing');

const runDuplication = (savedUsers) => {
	/*let usersList = savedUsers.map(dbUserData => {
		// Parse and store user's object from mongodb
		let usersData = Object.assign({}, dbUserData);
		return usersData;
	});*/

	let mobileUpdateList = mongoDbDataProcessing.clearMobiles(savedUsers);
				
	let browserUpdateList = mongoDbDataProcessing.clearBrowsers(savedUsers);
	
	mobileUpdateList = mobileUpdateList.filter(id => browserUpdateList.indexOf(id) === -1);
	
	return [...mobileUpdateList, ...browserUpdateList];
}

module.exports = {
	runDuplication,
}