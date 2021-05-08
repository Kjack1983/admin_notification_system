const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const parameters = require('../app/parameters');



const usersSchema = new Schema({
	[parameters.user.USER_ID]: String,
	[parameters.user.USER_LOGGED_IN]: Boolean,
	[parameters.messageChannels.MACHINE_HASH]: String,
	[parameters.messageChannels.TOKEN]: String,
	[parameters.user.PAIRS]: Array,
	[parameters.user.MOBILE_PAIRS]: Array,
	[parameters.user.ANNOUNCEMENTS]: Array,
	[parameters.user.TEST_ENABLED]: Boolean,
	[parameters.user.MARKET_ALERT_ALLOW]: Boolean,
	[parameters.user.DIRECT_MESSAGE_ALLOW]: Boolean,
	[parameters.user.CULTURE]: String,
	[parameters.user.ACCOUNT_BASE_CURRENCY]: String,
	[parameters.user.ALLOW_DEPOSIT]: String,
	[parameters.user.ALLOW_WITHDRAWAL]: Boolean,
	[parameters.user.ALLOWED_CANCELLATION]: Boolean,
	[parameters.user.COUNTRY_NAME]: String,
	[parameters.user.COUNTRY_ID]: String,
	[parameters.user.DEFAULT_PORTAL]: String,
	[parameters.user.DEMO_EXPIRATION_DAYS]: String,
	[parameters.user.HAS_CREDIT_CARD]: Boolean,
	[parameters.user.HAS_MT4_ACCOUNT]: Boolean,
	[parameters.user.IS_ACTIVE]: Boolean,
	[parameters.user.IS_ACCOUNT_CLOSED]: Boolean,
	[parameters.user.WITHDRAWAL_AVAILABLE]: Boolean,
	[parameters.messageChannels.PUSH]: Array,
	[parameters.messageChannels.SOCKETS]: Array,
	[parameters.messageChannels.BROWSERS]: Array,
	[parameters.messageChannels.MOBILES]: Array,
});

module.exports = mongoose.model('Users', usersSchema);
