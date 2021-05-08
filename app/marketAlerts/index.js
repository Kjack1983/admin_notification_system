module.exports = (marketAlerts, usersManagement, messagingSettings, messageHandler) => {
	require('./triggers')(marketAlerts, usersManagement, messagingSettings, messageHandler);
	require('./tracking')(marketAlerts, usersManagement, messagingSettings);
//	require('./messageTriggers')(marketAlerts, usersManagement);
	require('./redisSocketTrigger')(marketAlerts, usersManagement, messagingSettings);
}
