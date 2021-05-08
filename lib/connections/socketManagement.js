/*
 * Socket Management Module
 * 
 * Handles input socket events. Depending on the event type (distributed/non distributed)
 * it passes event to other server instances using redis, or it executes handler function
 * directly. 
 *
 */
"use strict";

const Redis = require('ioredis');
const socketIO = require('socket.io');

/*
 * Check Recevied Data 
 * 
 * Data validation function. When registering each events is providing its list
 * of expected parameters. When receiving the events we need to make
 * sure these events are available in the request data. 
 *
 * @todo - move to utils and add to socket / redis / routes
 * from there.
 * 
 * @param properties array List of expected properties
 * @param data array List of received properties
 * @return string Empty string if validation successfull, othervise it returns name of the 
 * first missing parameter.
 * 
 */
const checkRecievedData = (properties, data) => {
	return properties.reduce((current, next) => {
		if(current === ''){
		    if (next in data) return '';
		    return next;
		}
		return current;
	}, '') ;
}


	
// Socket management module definition
module.exports = function(){
	let io, pub; 

	/*
	 * Socket Management  Init function. 
	 * 
	 * Triggered on Connections init. 
	 * 
	 * @param options object Parameters, redis connections instances and serverID
	 * @param events object Events module
	 * @param parametersList object Parameters object that is passed to clients on socket connect event. It is used make sure client and server are using same parameter names. 
	 * 
	 */
	const init = (options, events, parametersList) => {
		if( !options || 
			!options.redis || 
			!options.redis.pub || 
			!options.socket  
			
		){
			return false;
		}
		
		// Redis and socket instances
		pub = options.redis.pub;
		io = options.socket;
		
		
		// Get registered socket's events 
		let socketsEvents = events.getEvents('sockets');
		
		// Handling socket connections
		io.on('connection', (socket) => {
			// Send parametersList, and registered socket events to client
			/*
			 * On socket connect event, we are sending few things to the client. 
			 * 
			 * parametersList: List of parameters server is expecting from the client. This
			 * list is used on client to populate data sent to the server. This method is used
			 * prevent typos or inconsistent parameter names
			 * 
			 * serverInEvents: List or socket based registered events that the server is able to handle. 
			 * This should be used on client side to know which events should actually be sent to 
			 * the server
			 * 
			 * TODO: Define set of the events server is sending to clients, so that the client is 
			 * aware of this and do neccessery handling
			 */	
			
			// For each socket event add handling logic
			socketsEvents.forEach(event => {
				socket.on(event.name, (clientData) => {
					let data = {};
					let inputValid = true;
					
					if(event.name === 'initializeBrowser') {
						socket.emit('connected', {
							parametersList: parametersList,
							serverInEvents: events.getEventNames('sockets'),
							serverOutEvents: []
						});
					}
					
					// Adding serverId, and socket.id to the data
					data = Object.assign({}, clientData, {
						'socketID' : socket.id,
						'ip': socket.handshake.headers['x-location-ip'] || null,
						'country': socket.handshake.headers['x-location-country'] || null,
						'countryIsoCode': socket.handshake.headers['x-location-iso2'] || null,
						'timeZone': socket.handshake.headers['x-location-timezone'] || null,
						'latitude': socket.handshake.headers['x-location-latitude'] || null,
						'longitude': socket.handshake.headers['x-location-longitude'] || null,
						'userAgent': socket.handshake.headers['user-agent'] || null
					});
					
					/*
					 * Run data validation. Check if data received from the client is what we expect. The 
					 * expectations are defiend when registering the events. 
					 */
					const validation = checkRecievedData(event.data, data);
					
					if(validation !== ''){
						console.log(`MA: ${event.name} error. Parameter missing: ${validation}`);
						return;
					}
					
					if(event.tracking){
						event.tracking(data);
					}

					if(event.distributed){
						pub.publish(event.name, JSON.stringify(data));
					}else{
						event.handler(data);
					}
	
				});
			})
		})
	}
	
	/*
	 * Some handlers will need to contact client using socke connection. In this 
	 * we need to be able to pass current socket connection to the handler using
	 * this api method. 
	 */
	const getIo = () => {
		return 	io;
	} 
	
	return {
		init,
		getIo
	}
}
