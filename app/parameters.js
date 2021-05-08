/*
 * List of parameters used by different modules in the app. Not
 * sure if this is the best solutions to keep them like this
 * in the object. But at least it prevents errors when misstyping property names
 */

const general = {
	TEST: 'test',
	METHOD: 'method',
	URL: 'url',
	DATA: 'data',
	SCREEN: 'screen'
};

const state = {
	PENDING: 'pending',
	SENT: 'sent',
	FAIL: 'fail',
};

const messages = {
	MESSAGES: 'messages',
	RECIPIENTS: 'recipients',
};

const messageChannels = {
	PUSH: 'push',
	SOCKETS: 'socket',
	ALERT: 'alert',
	BROWSERS: 'browser',
	MOBILES: 'mobile',
	HTTP : 'http',
	REDIS: 'redis',
	POST: 'post',
	GET: 'get',
	SOCKET_ID: 'socketID',
	SOCKET_ACTIVE: 'socketActive',
	TAB_ACTIVE: 'tabActive',
	PUSH_ENABLED: 'pushEnabled',
	PUSH_ACTIVE: 'pushActive',
	NOTIFICATION_DELIVERY_METHOD: 'notificationDeliveryMethod',
	TOKEN: 'token',
	OLD_TOKEN: 'oldToken',
	NEW_TOKEN: 'newToken',
	MACHINE_HASH: 'machineHash',
	DEVICE_ID: 'deviceID',
	SYSTEM: 'system',
	SOUND: 'sound',
	FIRST_CONNECTION_DATE: 'firstConnectionDate',
	LAST_CONNECTION_DATE: 'lastConnectionDate',
	APP_VERSION_NUMBER: 'appVersionNumber',
	ANNOUNCEMENTS: 'announcements',
	PUSH_TYPE: 'pushType'
};

const androidPushChannels = {
	ANNOUNCEMENTS: 'Announcements',
	STOP_LOSS: 'Stop-Loss',
	REMINDERS: 'Reminders',
	MARKET_ALERTS: 'Market-Alerts'
};

const user = {
	USER_ID: 'userID',
	MONGO_ID: '_id',
	USER_LOGGED_IN: 'userLoggedIn',
	TEST_ENABLED: 'testEnabled',
	MARKET_ALERT_ALLOW: 'marketAlertAllow',
	STOPLOSS_ALERT_ALLOW: 'stoplossAlertAllow',
	DIRECT_MESSAGE_ALLOW: 'directMessageAllow',
	LANGUAGE: 'language',
	CULTURE: 'culture',
	PAIRS: 'pairs',
	MOBILE_PAIRS: 'mobilePairs',
	ANNOUNCEMENTS: 'announcements',
	INSTRUMENT: 'instrument',
	INSTRUMENT_STATUS: 'instrumentStatus',
	ACCOUNT_BASE_CURRENCY: 'accountBaseCurrency',
	ALLOW_DEPOSIT: 'allowDeposit',
	ALLOW_WITHDRAWAL: 'allowWithdrawal',
	ALLOWED_CANCELLATION: 'allowedCancellation',
	COUNTRY_NAME: 'countryName',
	COUNTRY_ID: 'countryID',
	DEFAULT_PORTAL: 'defaultPortal',
	DEMO_EXPIRATION_DAYS: 'demoExpirationDays',
	HAS_CREDIT_CARD: 'hasCreditCard',
	HAS_MT4_ACCOUNT: 'hasMts4Account',
	IS_ACTIVE: 'isActive',
	IS_ACCOUNT_CLOSED: 'isAccountClosed',
	WITHDRAWAL_AVAILABLE: 'withdrawalAvailable',
};

const schedule = {
	SCHEDULE_MESSAGE: 'scheduled',
	JOB_ID: "ID",
	SCHEDULE_STATUS: 'STATUS'
}

const admin = {
	USERNAME: 'username',
	TOKEN: 'token',
	REFRESHTOKEN: 'refreshtoken',
	FILTERS: 'filters',
	CLIENT_FILTERS: 'clientFilters',
	DEVICE_LANGUAGES: 'deviceLanguages',
	MESSAGES: 'messages',
	PASSWORD: 'password',
	ACCESS: 'access',
	ADMIN: 'admin',
	RECIPIENT_STATS: 'recipientStats',
	RECIPIENT_IDS: 'recipientIds',
	COUNTRY_LIST: 'countryList'
};

const marketAlerts = {
	ROW_ID: 'row_id',
	EVENT_ID: 'event_id',
	EVENT_DATE: 'event_date',
	BASE_CURR: 'base_curr',
	NON_BASE_CURR: 'non_base_curr',
	EVENT_TYPE_ID: 'event_type_id',
	NEW_VALUE: 'new_value',
	OLD_VALUE: 'old_value',
	LAST_EVENT_DATE: 'last_event_date',
	DIFFERENCE: 'difference',
	EVENT_DESCRIPTION: 'event_description',
	TYPE: 'type',
	ACTION: 'action',
	PRICE: 'price',
	CODE: 'code',
	EVENTID: 'eventID',
	TITLE: 'title',
	DETAIL: 'detail',
	BODY: 'body',
	MESSAGE: 'message',
	SOCKET_MESSAGE: 'socketMessage',
	PUSH_URL: 'pushUrl',
	MESSAGE_TYPE: 'messageType'
};

const directMessaging = {
	TITLE: 'title',
	DETAIL: 'detail',
	BODY: 'body',
	MESSAGE: 'message',
	DATA: 'data'
};

const announcements = {
	REMINDER_TO_REGISTER: 'reminderToRegister',
	REMINDER_TO_LOGIN: 'reminderToLogin',
	REMINDER_TO_UPLOAD: 'reminderToUploadDocuments',
	REMINDER_TO_REGISTER_TIME: 'reminderToRegisterTime',
	REMINDER_TO_REGISTER_INTERVAL: 'reminderToRegisterInterval',
	REMINDER_TO_REGISTER_MESSAGES: 'reminderToRegisterMessages',
	REMINDER_TO_REGISTER_ACTIVE: 'reminderToRegisterActive',
	REMINDER_TO_LOGIN_TIME: 'reminderToLoginTime',
	REMINDER_TO_LOGIN_INTERVAL: 'reminderToLoginInterval',
	REMINDER_TO_LOGIN_MESSAGES: 'reminderToLoginMessages',
	REMINDER_TO_LOGIN_ACTIVE: 'reminderToLoginActive',
	REMINDER_TO_UPLOAD_TIME: 'reminderToUploadTime',
	REMINDER_TO_UPLOAD_INTERVAL: 'reminderToUploadInterval',
	REMINDER_TO_UPLOAD_MESSAGES: 'reminderToUploadMessages',
	REMINDER_TO_UPLOAD_ACTIVE: 'reminderToUploadActive',
	REMINDER_TIME: 'reminderTime',
	REMINDER_INTERVAL: 'reminderInterval',
	REMINDER_MESSAGES: 'reminderMessages',
	REMINDER_ACTIVE: 'reminderActive',
	NAME: 'name',
	TIME: 'time',
	TITLE: 'title',
	MESSAGE: 'message'
};

const tracking = {
	TRIGGER_ID: 'triggerID',
	NOTIFICATION_ID: 'notificationID',
	TRIGGER_RECIEVED_TIME: 'triggerRecievedTime',
	TRIGGER_TYPE: 'triggerType',
	MARKET_ALERT: 'marketAlert',
	PUSH_SERVER_URL: 'pushServerUrl',
	NOTIFICATION_RECEIVED: 'notificationReceived',
	ACTION_TIME: 'actionTime',
	PUSH_ID: 'pushID',
	USER_AGENT: 'userAgent',
	IP: 'ip',
	COUNTRY: 'country',
	COUNTRY_ISO_CODE: 'countryIsoCode',
	LATITUDE: 'latitude',
	LONGITUDE: 'longitude',
	TIME_ZONE: 'timeZone',
	REGION: 'region',
	VISIBLE: 'visible',
	TIME: 'time',
	USER_ACTION: 'userAction'
}

module.exports = {
	general,
	state,
	messages,
	messageChannels,
	androidPushChannels,
	user,
	schedule,
	admin,
	marketAlerts,
	directMessaging,
	announcements,
	tracking
}
