/*
 * Group of events providing http rest api endpoints used by mobile app. 
 */

"use strict";

module.exports  = (directMessaging, usersManagement, messagingSettings) => {
	
	/*
	 * Redis event used to trigger socket messages. Since socket connections are handled
	 * on independently on each server, when the event trigger is received all servers
	 * need to react
	 *
	 */
	directMessaging.addRedisInEvent({
		name: 'sendSocketMessage',
		data: [
			'room',
			'data',
			'eventName'
		],
		handler: function(data) {
			let io = directMessaging.getSocketsConnection();
			io.sockets.in(data.room).emit(data.eventName, data.data);
		}
	})
	
}