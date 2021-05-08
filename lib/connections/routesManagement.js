/**
 * Http requests management module
 * 
 * Handles http request to the system 
 * 
 * Based on the trigger type it sends data over redis to other 
 * instances or it runs the handlers and returns some data back over 
 * the network. 
 */
"use strict";

/**
 * Input data validation function, same as in socket management and redis 
 * management
 *
 * @todo - currently only validates keys of data, should
 * validate value not empty as well.
 *
 * @param {array} properties Key list to validate in data.
 * @param {object} data Data to validate key existence.
 * @return {string}
 */
const checkRecievedData = (properties, data) => {
	return properties.reduce((current, next) => {
		if (current === '') {
			// @note - value check included below but need to check impact
			// if (next in data && !!data[next]) return '';
			if (next in data) return '';
			return next;
		}
		return current;
	}, '');
}

module.exports = function(){

	let pub;
	
	const eventHandlerTrigger = (event, req, res) => {
		let requestData;

		// Get request data
		if (event.method === 'get') {
			requestData = req.query;
		}

		// Post request data
		else if (event.method === 'post') {
			if (Object.keys(req.body).length === 1 && 'data' in req.body) {
				requestData = req.body.data;
			}
			else{
				requestData = req.body;
			}
		}

		// Define request location data
		const locationData = {
			host: 'https://' + req.get('host'),
			ip: req.get('X-Location-IP') || null,
			country: req.get('X-Location-Country') || null,
			countryIsoCode: req.get('X-Location-Iso2') || null,
			countryCulture: req.get('X-Location-Culture') || null,
			timeZone: req.get('X-Location-Timezone') || null,
			latitude: req.get('X-Location-Latitude') || null,
			longitude: req.get('X-Location-Longitude') || null,
			userAgent: req.get('user-agent') || null
		};

		// Merge request and location data
		const data = { ...requestData, ...locationData };

		// Validate request
		const validation = checkRecievedData(event.data, data);

		// Check validation result and send proper response 
		if(validation !== ''){
			console.log(`[${event.name}] Request error: Parameter ${validation} missing from the request`);
			return res.status(400).json({
				"status": "error",
				"message": `Parameter ${validation} missing from the request`
			});
		}
		
		if (event.tracking) {
			event.tracking(data);
		}

		// Handle distributed requests
		if (event.distributed) {

			// Inject location data for mobile connect
			if (event.name && event.name === 'mobileConnect' && locationData.country) {
				res.header('X-Location-IP', locationData.ip);
				res.header('X-Location-Country', locationData.country);
				res.header('X-Location-Culture', locationData.countryCulture);
				res.header('X-Location-Iso2', locationData.countryIsoCode);
			}

			// Publish to redis
			pub.publish(event.name, JSON.stringify(data));

			// Respond
			res.json({
				"status": "success",
				"message": "Request received"
			});
		}

		// Handle non distributed requests
		else {
			event.handler.apply(null, [req, res, data]);
		}
	}

	/*
	 * Module init function 
	 * 
	 * Triggers the routes module. 
	 * 
	 * @params options object Passing redis instance
	 * @params app Passing node app instance 
	 * @params events object Events module
	 * @return void; 
	 */
	const init = (options, app, events) => {

		if (!options && !options.redis) {
			return false;
		}

		// List of all http events
		const routeEvents = events.getEvents('http');

		// Get events
		const getEvents = routeEvents.filter(event => event.method === 'get');

		// Post events
		const postEvents = routeEvents.filter(event => event.method === 'post');
		
		pub = options.redis.pub;

		// Handle get events
		getEvents.forEach(event => {
			app.get(event.url, eventHandlerTrigger.bind(null, event));
		})

		// Handle post events
		postEvents.forEach(event => {
			app.post(event.url, eventHandlerTrigger.bind(null, event));
		})
	}

	return {
		init
	}
}
