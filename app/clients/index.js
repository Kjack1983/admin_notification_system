/*
 * Group of events related to managing clients connections. 
 * Currently browser sockets/push notifications and mobile device connections are 
 * supported. 
 * 
 * Browsers are communicating using sockets, while mobile app uses http rest api
 * to communication to the server. 
 * 
 */
module.exports = (clients, usersManagement, messagingSettings, messageHandler) => {
	require('./browserConnections')(clients, usersManagement, messagingSettings);
	require('./mobileConnections')(clients, usersManagement, messagingSettings);
	require('./pushConnections')(clients, usersManagement, messagingSettings);
	require('./api')(clients, usersManagement, messagingSettings, messageHandler);
	require('./debuging')(clients, usersManagement, messagingSettings);
}
