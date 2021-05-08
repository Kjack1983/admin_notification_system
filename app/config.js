"use strict";

/**
 * Node
 */
const port = process.env.PORT ? process.env.PORT : 3333;

/**
 * Set local origins in env
 */
let localOrigins = (process.env.ORIGINS ? process.env.ORIGINS.split(',') : []).map((domain) => {
	return domain.trim() + ':*';
});

/**
 * Default origins
 */
const socketOrigins = [
	'www.easymarkets.com:*',
	'chn.easymarkets.com:*',
	'notify.easymarkets.com:*',
].concat(localOrigins).join(' ');

const jwtSecret = process.env.SECRET;
const jwtRefreshToken = process.env.REFRESHED_ACCESS_TOKEN;
const jwtExpirationTime = parseInt(process.env.ACCESS_EXPIRATION_TIME || '3600');

/**
 * Keys
 */
const pushyApiKey = process.env.PUSHY_API_KEY;

/**
 * Local Redis
 */
const sentinels = [
	{ host: 'localhost', port: process.env.SENTINEL || 26379 }
];

/**
 * Local Mongo
 */
const db = {
	name: 'marketNotifications',
	reporting: 'reporting',
	connection: 'mongodb://localhost:27017/'
};

/**
 * MongoDB settings
 */
const mongo = {
	local: {
		name: 'marketNotifications',
		connection: `mongodb://${process.env.MONGO_LOCAL}/`
	},
	reporting: {
		name: 'reporting',
		connection: `mongodb://${process.env.MONGO_REPORTING}/`
	}
};

/**
 * Load data from DB
 *
 * Local or Remote?
 */
const loadDataFromDatabase = process.env.LOAD_DATA_FROM_DATABASE === '1' ? true : false;
const loadDataFromPrp = process.env.LOAD_DATA_FROM_PRP === '1' ? true : false;

/**
 * Remote Redis
 */
const webeyezRedisHost = process.env.WEBEYEZ_REDIS_IP; // Needed ?
const webeyezRedisPort = process.env.WEBEYEZ_REDIS_PORT; // Needed ?

let redisClusterDetails;
try{
	redisClusterDetails = process.env.ENVIRONMENT === 'production' ? JSON.parse(process.env.PRODUCTION_REDIS_CLUSTER) : JSON.parse(process.env.PRP_REDIS_CLUSTER);
}catch(err){
	console.log('Error parsing redis cluster host data');
}

/**
 * Log directory
 */
const logDirectory = process.env.LOG_DIR || "./log/";

/**
 * Remote Segmentation API
 */
const segmentationApiUrl = process.env.SEGMENTATION_API;
const segmentationApiKey = process.env.SEGMENTATION_KEY;

/**
 * Remote Landing Pages API
 */
const lndDomain = process.env.LND_DOMAIN;
const lndApiUrl = process.env.LND_API;

/**
 * Remote MSSql
 */
const mssqlHostMc = 'mssql://' + process.env.MSSQL_USER + ':' + process.env.MSSQL_PASS + '@' + process.env.MSSQL_IP_MC + ':' + process.env.MSSQL_PORT_MC + '/' + process.env.MSSQL_DB_NAME_MC;
const mssqlHostBi = 'mssql://' + process.env.MSSQL_USER + ':' + process.env.MSSQL_PASS + '@' + process.env.MSSQL_IP_BI + ':' + process.env.MSSQL_PORT_BI + '/' + process.env.MSSQL_DB_NAME_BI;

const mssql = {
	hostMc: mssqlHostMc,
	hostMcObj: {
		user: process.env.MSSQL_USER,
		password: process.env.MSSQL_PASS,
		database: process.env.MSSQL_DB_NAME_MC,
		server: process.env.MSSQL_IP_MC,
		port: process.env.MSSQL_PORT_MC,
		requestTimeout: 5000,
		connectionTimeout: 5000,
		options: {
			encrypt: true
		}
	},
	hostBi: mssqlHostBi,
	hostBiObj: {
		user: process.env.MSSQL_USER,
		password: process.env.MSSQL_PASS,
		database: process.env.MSSQL_DB_NAME_BI,
		server: process.env.MSSQL_IP_BI,
		port: process.env.MSSQL_PORT_BI,
		requestTimeout: 15000,
		connectionTimeout: 15000,
		options: {
        	encrypt: true
    	}
    }
};

/**
 * Static info
 */
const globalPairs = [
	'EUR/USD',
	'USD/CHF', 
	'USD/JPY',
	'GBP/USD',
	'XAU/USD',
	'AUD/USD', 
	'XAG/USD', 
	'OIL/USD',
	'BRT/USD',
	'DAX/EUR',
	'FTS/GBP',
	'NDQ/USD',
	'DOW/USD',
	'USD/CAD',
	'EUR/JPY',
	'GBP/JPY',
	'NZD/USD',
	'EUR/GBP',
	'AUD/JPY',
	'USX/USD',
	'CAC/EUR',
	'NKI/USD',
	'USD/CNH',
	'NZD/JPY',
	'ASX/AUD'
];

// Event Types
const eventList = {
	"1" : {
		"name": "1 Hour Min Low Changed", 
		"type": "low", 
		"message": {
			"en": "Hits 1 Month Low"
		} 
	},
	"2" : {
		"name": "1 Hour Max High Changed", 
		"type": "high", 
		"message": {
			"en": "Hits 1 Month Low"
		}
	},
	"3" : {
		"name": "30 Days Min Low Changed", 
		"type": "low", 
		"message": {
			"en": "trading at a 30 day low",
			"es": "cotizando al nivel más bajo de los últimos 30 días",
			"pl": "kurs na 30 dniowym spadku",
			"ar": "يتداول عند أدنى مستوى لمدة 30 يوما",
			"zh-hans": "跌至30日低位",
			"it": "trading di 30 giorni al suo minimo"
		}
	},
	"4" : {
		"name": "30 Days Max High Changed", 
		"type": "high", 
		"message": {
			"en": "trading at a 30 day high",
			"es": "cotizando al nivel más alto de los últimos 30 días",
			"pl": "kurs na 30 dniowym wzroście",
			"ar": "يتداول عند أعلى مستوى لمدة 30 يوما",
			"zh-hans": "升至30日高位",
			"it": "trading di 30 giorni al suo massimo"
		}
	},
	"5" : {
		"name": "90 Days Min Low Changed", 
		"type": "low", 
		"message": {
			"en":"trading at a 90 day low",
			"es":"cotizando al nivel más bajo de los últimos 90 días",
			"pl":"kurs na 90 dniowym spadku",
			"ar":" يتداول عند أدنى مستوى لمدة 90 يوما",
			"zh-hans":"跌至90日低位",
			"it": "trading di 90 giorni al suo minimo"
		}
	},
	"6" : {
		"name": "90 Days Max High Changed", 
		"type": "high", 
		"message": {
			"en": "trading at a 90 day high",
			"es": "cotizando al nivel más alto de los últimos 90 días",
			"pl": "kurs na 90 dniowym wzroście",
			"ar": "يتداول عند أعلى مستوى لمدة 90 يوما",
			"zh-hans": "升至90日高位",
			"it": "trading di 90 giorni al suo massimo"
		}
	},
	"7" : {
		"name": "1 Year Min Low Changed", 
		"type": "low", 
		"message": {
			"en":"trading at a 1 year low",
			"es":"cotizando al nivel más bajo del año",
			"pl":"kurs na rocznym spadku",
			"ar":"يتداول عند أدنى مستوى لمدة سنة",
			"zh-hans":"跌至1年来低位",
			"it": "trading di 1 anno al suo minimo"
		}
	},
	"8" : {
		"name": "1 Year Max High Changed", 
		"type": "high", 
		"message": {
			"en": "trading at a 1 year high",
			"es": "cotizando al nivel más alto del año",
			"pl": "kurs na rocznym wzroście",
			"ar": "يتداول عند أعلى مستوى لمدة سنة",
			"zh-hans": "升至1年来高位",
			"it": "trading di 1 anno al suo massimo"
		}
	}
}

/*const getPairsUrl = process.env.enviroments === 'production' ? 'https://www.easymarkets.com/api/jsapiservice.svc/?rq=[{%22action%22:%22GetMarketInfoSettings%22,%22args%22:{%22siteLang%22:%22en%22}}]&appid=CA7D0F97-F865-4D89-9983-409E5EE5DDF3' : 'https://prp.easymarkets.com/api/jsapiservice.svc/?rq=[{%22action%22:%22GetMarketInfoSettings%22,%22args%22:{%22siteLang%22:%22en%22}}]&appid=CA7D0F97-F865-4D89-9983-409E5EE5DDF3';*/

module.exports = {
	port,
	socketOrigins,
	jwtSecret,
	jwtRefreshToken,
	jwtExpirationTime,
	pushyApiKey,
	sentinels,
	db,
	mongo,
	loadDataFromDatabase,
	loadDataFromPrp,
	webeyezRedisHost,
	webeyezRedisPort,
	logDirectory,
	redisClusterDetails,
	segmentationApiUrl,
	segmentationApiKey,
	lndApiUrl,
	lndDomain,
	mssql,
	globalPairs,
	eventList
}
