"use strict";

module.exports = (reporting, usersManagement, messagingSettings) => {

	require('./api')(reporting, usersManagement, messagingSettings);

	return {};
}
