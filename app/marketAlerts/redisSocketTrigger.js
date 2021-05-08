/*
 * Group of events providing http rest api endpoints used by mobile app. 
 */

"use strict";

module.exports  = (marketAlerts, usersManagement, messagingSettings) => {
	
	/*
	 * Redis event used to trigger socket messages. Since socket connections are handled
	 * on independently on each server, when the event trigger is received all servers
	 * need to react
	 *
	 */
	marketAlerts.addRedisInEvent({
		name: 'sendSocketMessage',
		data: [
			'room',
			'data',
			'eventName'
		],
		handler: function(data) {
			let io = marketAlerts.getSocketsConnection();
			io.sockets.in(data.room).emit(data.eventName, data.data);
		}
	})
	
}