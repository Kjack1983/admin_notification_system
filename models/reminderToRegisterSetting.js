const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const parameters = require('../app/parameters');


const schema = new Schema({
	[parameters.announcements.REMINDER_TO_REGISTER_TIME]: String,
	[parameters.announcements.REMINDER_TO_REGISTER_INTERVAL]: String,
	[parameters.announcements.REMINDER_TO_REGISTER_ACTIVE]: Boolean,
	[parameters.announcements.REMINDER_TO_REGISTER_MESSAGES]: Object
});


module.exports = mongoose.model('ReminderToRegisterSettings', schema);
