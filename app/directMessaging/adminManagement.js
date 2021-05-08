"use strict";
const parameters = require('../parameters');


module.exports = () => {
	const adminModel = {
		[parameters.admin.USERNAME]: '',
		[parameters.messageChannels.SOCKETS]: [],
		[parameters.messageChannels.TOKEN]: ''
	}

	let users = {};
	const getUsers = () => users;
	
	const getUser = username => users[username];

	const getUserModel = () => adminModel;
	
	const getSocket = (socketId, io) => io.sockets.connected[socketId];
	
	const removeUser = socketId => {
		if(!socketId) return;
		if(!users[socketId]) return;

		delete users[socketId];

	}
	return {
		getUsers,
		getUser,
		getUserModel,
		getSocket,
		removeUser
	}
}