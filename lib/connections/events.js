/*
 * Events module. 
 * 
 * Provides API for adding and managing events.
 *  
 */
"use strict";
// Module for registering events. 

const utils = require('./utils');

module.exports = function(){
	return{
		events: {},
		/*
		 * Add Event method
		 * 
		 * Used to register an event. 
		 * 
		 * @params name string Event name
		 * @params direction string Defines information direction (in/out)
		 * @params channel string Channel over which event is triggered (socket, http, redis)
		 * @params data array Array of required parameters
		 * @params handler function Custom response to the given event defined by the user
		 * @params distributed boolean Flag that shows whether event should be distributed over
		 * all server instances
		 * @params method string Optional parameter http method type, 
		 * @params url string Url of the http request
		 * @return void 
		 */
		addEvent(event) {
			
			// Checking if registration data is correct
			if(this.events[event.name]) {
				console.log(`Events Module: Event name ${event.name} exists. Please try different name`);
				return false;
			};

			// Adding new event to the system
			this.events = Object.assign({}, this.events, {
				[event.name]: event
			});

			return event.name;
		},
		// Removing event 
		removeEvent(ev) {
			if(!ev || !this.events[ev]) return false;
			let res = Object.assign({}, this.events);
			delete res[ev];
			this.events = res;
		},
		
		/*
		 * Getting event list
		 * 
		 * @params channel string Event channel for which we want events
		 * @params direction string 
		 * @return void
		 * 
		 */
		getEvents(channel, direction) {
			let eventsList = Object.keys(this.events)
								.map(name => this.events[name]);

			if(!channel) return eventsList;

			return eventsList.filter(ev => ev.channel === channel)
		},
		// Get list of event names in a correct format 
		getEventNames() {
			let eventNames = {};
			Object.keys(this.events)
				.forEach(event => {
					eventNames[utils.camelToUnderscore(event)] = event;
				});
			return eventNames;
		},
		
		// Clear all events
		reset() {
			this.events = {}
		},
		// Get all events
		getAllEvents() {
			return events;
		}
	}
}