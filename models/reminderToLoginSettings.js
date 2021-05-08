const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const parameters = require('../app/parameters');


const schema = new Schema({
	[parameters.announcements.REMINDER_TO_LOGIN_TIME]: String,
	[parameters.announcements.REMINDER_TO_LOGIN_INTERVAL]: String,
	[parameters.announcements.REMINDER_TO_LOGIN_ACTIVE]: Boolean,
	[parameters.announcements.REMINDER_TO_LOGIN_MESSAGES]: Object
});


module.exports = mongoose.model('ReminderToLoginSettings', schema);
