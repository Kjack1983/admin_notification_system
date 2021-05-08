/*
 *
 * Transforming the old database to the new one. Ideally one time call.  
 */


module.exports = (databaseTransform, usersManagement, messagingSettings) => {
	require('./mobiles')(databaseTransform, usersManagement, messagingSettings);
	require('./pushes')(databaseTransform,usersManagement,messagingSettings);
}