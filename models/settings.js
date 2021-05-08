const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReminderSchema = new Schema({
	reminderTime: String,
	reminderInterval: String,
	reminderMessages:Object,
	reminderActive: Boolean
});


const SettingsSchema = new Schema({
	languages: Array,
	reminderToLogin: ReminderSchema,
	reminderToRegister: ReminderSchema,
	reminderToUploadDocuments: ReminderSchema,
});

module.exports = mongoose.model('Settings', SettingsSchema);
