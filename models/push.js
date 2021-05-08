var mongoose=require('mongoose'),
 	Schema=mongoose.Schema;

var PushSchema = new Schema({
	machineHash: { type: String, required: true},
	pairs: Array,
	token: String,
	blocked: Boolean,
	userID: String,
	userLoggedIn: Boolean,
	culture: String,
	language: String,
	serverID: String
});

module.exports = mongoose.model('Push', PushSchema);


