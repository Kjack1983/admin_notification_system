"use strict";

module.exports = function(directMessaging, usersManagement, messagingSettings, messageHandler){
	
	let adminManagement = require('./adminManagement')();
	require('./adminSocketConnections')(directMessaging, usersManagement, adminManagement, messagingSettings);
	require('./directMessageTrigger')(directMessaging, usersManagement, adminManagement, messagingSettings, messageHandler);
	require('./messageRecipientsFiltering')(directMessaging, usersManagement, messagingSettings);
	require('./redisSocketTrigger')(directMessaging, usersManagement, messagingSettings);

	// @todo - Re-add messaging preview later with new firebase support not fcm
	//require('./messagePreview')(directMessaging, usersManagement, adminManagement, messagingSettings);
	
	let io;
	let userStats = usersManagement.getUsersStats();
	let logCount = 0;
	/*setInterval(() => {
		if(!io) {
			io = directMessaging.getSocketsConnection();
		}
		if(io){
			
			var room = io.sockets.adapter.rooms['admin'];
			
			if(room && room.length){
				if(logCount < 20){
					console.log('Admin Users Stats: Sending users stats using sockets');
					logCount++;
					io.sockets.in('admin').emit('usersStats', userStats);
					console.time('User Management get user stats test');
					userStats = usersManagement.getUsersStats();
					console.timeEnd('User Management get user stats test');
				}else{
					io.sockets.in('admin').emit('usersStats', userStats);
					userStats = usersManagement.getUsersStats();
					
				}

			}
		}		
	}, 1000);*/

	return {};
}
