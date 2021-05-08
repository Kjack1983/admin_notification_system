/*
 * Redis Management Module
 *
 * Used to share information over server instances.
 * 
 * Input events can be distributed or not. Distributed events are shared to all instances
 * using Redis. For example when users registers to the system, we want all servers 
 * to update their records. This is done by publishing the event on Redis that tells
 * servers to perform specific action. 
 * 
 * Non distributed events are hendled on a server instance that receives the trigger. 
 * For example when requesting list of users, we dont need all servers to process 
 * this request. 
 *
 *
 */
"use strict";

module.exports = function(){

	// Connect to redis
	let redisConnected;
	let pub, sub;

	/*
	 * Redis management init function
	 * 
	 * Kicks off redis management. This happens on initialisation of the connections
	 * module. 
	 * 
	 * @param options object Holds redis connection
	 * @param events object Events module
	 * @return void
	 */
	const init = (options, events) => {
		
		if (!options || !options.redis) {
			return false;
		}
		
		if (options.redis.pub) {
			pub = options.redis.pub;
		}

		sub = options.redis.sub;

		// Redis Events
		const redisEvents = events.getEvents('redis');

		redisEvents.forEach(event => {
			sub.subscribe(event.name);
		});
		
		// Input Events (Distributed HTTP events)
		const inputEvents = events.getEvents()
			.filter(event => event.distributed);
		
		inputEvents.forEach(event => {
			sub.subscribe(event.name);
		})

		// Handle events
		sub.on('message', (channel, message) => {

			// Event data
			const data = JSON.parse(message);

			if (data.restrictToServer && data.restrictToServer !== options.serverID) {
				return;
			}

			redisEvents.forEach(event => {
				if(event.name === channel) {
	    			event.handler(data);
	    		}
	    	});

			inputEvents.map(event => {
	    		if(event.name === channel) {
	    			event.handler(data);
	    		}
	    	})
	    })
	}
	
	/*
	 * Get Redis Instance. 
	 * 
	 * Sometimes we need our handling function to use redis to pass data to 
	 * some endpoints. In this case the handler function makes request to the redis 
	 * management module to get redis instance, instead of creating new connection 
	 * in each handler. 
	 *
	 * @param void
	 * @return object Pub redis instance. 
	 */
	const getRedis = () => pub

	return {
		init,
		getRedis
	}
}