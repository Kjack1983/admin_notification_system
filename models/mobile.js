var mongoose=require('mongoose'),
 	Schema=mongoose.Schema;
	

var MobileSchema = new Schema({
	token: { type: String, required: true },
	system: String,
	pairs: Array,
	active: Boolean,
	userID: String,
	userLoggedIn: Boolean,
	culture: String,
	language: String,
	serverID: String,
	marketAlertAllow: Boolean,
	notificationDeliveryMethod: String,
	deviceID: String
});

module.exports = mongoose.model('Mobile', MobileSchema);


