module.exports = (announcements, usersManagement, messagingSettings, messageHandler) => {
	//require('./reminderToRegister')(announcements, usersManagement, messagingSettings);
	//require('./reminderToLogin')(announcements, usersManagement, messagingSettings);
	require('./stoploss')(announcements, usersManagement, messagingSettings, messageHandler);
	//require('./kycReminder')(announcements, usersManagement, messagingSettings);
	require('./api')(announcements, usersManagement, messagingSettings, messageHandler);
}
