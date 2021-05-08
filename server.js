/*
 * Client messaging server v2. 
 * 
 * The application consists of connections library and events that are added
 * using the library's api. Connection library connects different input
 * channels over which the server is receiving information from the outside
 * world. 
 * 
 * Currently there are three channels: Sockets, Redis, Http.The library
 * itself is quite small and simple. Communication with the library is done
 * using the events api, that allows user to add events to the system. In that
 * way building the application consist of adding various events and providing 
 * handlers for these events using the events api. In our implementation we 
 * are adding these events in the app module using number of connections 
 * instances.
 *
 * Clients module adds events for handling clients connections (browsers, 
 * mobile and push registrations and handling)
 *
 * Direct messaging module adds events for handling notification admin panel 
 * (Admin socket connections, message previews, user stats)
 *
 * Market alert module adds events for market alerts handling. Receiving market 
 * alert triggers, transforming it to appropriate formats and sending it to
 * clients over different channels (browser push, mobile push, html alert)
 *
 * Webeyez redis module handles user profile updates from received from 
 * webeyez.
 *
 * User management module is independent module that stores user’s data and 
 * provide various methods for manipulating this data.  These methods are 
 * used by any module that is modifying the state of user profiles.
 *
 * 
 */

"use strict";

// Read .env file if found
require ('dotenv').config({silent: true});

// Include newrelic if on production
if (
	!!process.env.ENVIRONMENT &&
	!!process.env.NEWRELIC &&
	process.env.ENVIRONMENT === 'production' &&
	process.env.NEWRELIC === 'true'
) {
	console.log('Adding NewRelic');
	require('newrelic');
}

const express = require('express');
const app = express();
const http = require('http').Server(app);
const colors = require('colors');
const config = require('./app/config');

const bodyParser = require('body-parser');
var bodyParserJsonError = require('express-body-parser-json-error');
const cors = require('cors');

// Express settings: remove X-Powered-By
app.disable('x-powered-by');

// Express settings: Json
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParserJsonError());

// Express settings: Cors
app.use(cors({credentials: true, origin: '*'}));

// Express settings: Global response headers
app.use((req, res, next) => {
	res.header('Cache-Control', 'max-age=0, no-cache, no-store');
	next();
});

// Express settings: Trust nginx proxy traffic
app.set('trust proxy', 1);

// @todo - remove
//app.use('/admin', express.static('public'));

const marketNotificationsServer = require('./app');

marketNotificationsServer(app, http);

http.listen(config.port, () => {
	console.log(`Server listening on port ${config.port}`.magenta.bold.bgWhite);
})


