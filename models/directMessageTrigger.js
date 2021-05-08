const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const parameters = require('../app/parameters');


const schema = new Schema({
    username: String,
    filters: {
        cultures: String,
        userType: String,
        deviceType: String,
        selectedUsers: Array,
        importedUsers: Array,
        mobileOsType: String,
    },
    messages: {
        alert: Object,
        push: Object,
        mobile: Object
    },
    userIds: {
        alert: Array,
        mobiles: Array,
        push: Array,
        pushyMobiles: Array,
        iosMobiles: Array,
        androidMobiles: Array
    },
    time: Date
});


module.exports = mongoose.model('DirectMessageTriggers', schema);
