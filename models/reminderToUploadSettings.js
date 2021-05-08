const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const parameters = require('../app/parameters');


const schema = new Schema({
	[parameters.announcements.REMINDER_TO_UPLOAD_TIME]: String,
	[parameters.announcements.REMINDER_TO_UPLOAD_INTERVAL]: String,
	[parameters.announcements.REMINDER_TO_UPLOAD_ACTIVE]: Boolean,
	[parameters.announcements.REMINDER_TO_UPLOAD_MESSAGES]: Object
});


module.exports = mongoose.model('ReminderToUploadSettings', schema);
