let mongoose = require('mongoose');
let Schema = mongoose.Schema;

module.exports = mongoose.model('Admin', new Schema({
    username: String, 
    password: String,
    role: String
}));

