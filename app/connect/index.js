"use strict";

module.exports = (connect, usersManagement, messagingSettings) => {

	const sendModule = require('./sendModule')(connect, usersManagement, messagingSettings);

	return sendModule;
}
