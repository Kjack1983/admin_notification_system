
require('dotenv').config({ silent: true });


const mongoose = require('mongoose');
const getJSON = require('get-json');
const config = require('./app/config');
const dbName = config.db.name;
const connectionString = config.db.connection + dbName;
const readlineSync = require('readline-sync');
const Admin = require('./models/admin');
const bcrypt = require('bcryptjs');



mongoose.Promise = require('bluebird');
mongoose.connect(connectionString, {useMongoClient: true});


const SettingsModel = require('./models/settings');

const reminderToLogin = require('./models/reminderToLoginSettings');
const reminderToRegister = require('./models/reminderToRegisterSetting');
const reminderToUpload = require('./models/reminderToUploadSettings');


Promise.all([reminderToLogin.find({}), reminderToRegister.find({}), reminderToUpload.find({}), SettingsModel.find({})]).then(values => {

 // console.log(values[0][0]);
 // console.log(values[3][0].languages);

 /*  reminderToLogin: data.reminderToLogin,
    reminderToRegister: data.reminderToRegister,
      reminderToUploadDocuments: data.reminderToUploadDocuments,

 */
  SettingsModel
    .find()
    .exec()
    .then(settings => {

		let updateData = settings[0] ? settings[0] : new SettingsModel();

		// Reminder to Login
		if (values[0].length) {

			updateData.reminderToLogin = {};
			updateData.reminderToLogin.reminderMessages = {};
			updateData.reminderToLogin.reminderMessages = values[0][0].reminderToLoginMessages.mobile;
			updateData.reminderToLogin.reminderInterval = values[0][0].reminderToLoginInterval;
			updateData.reminderToLogin.reminderTime = values[0][0].reminderToLoginTime;
			updateData.reminderToLogin.reminderActive = values[0][0].reminderToLoginActive;
		}

		// Reminder to Register
		if (values[1].length) {

			updateData.reminderToRegister = {};
			updateData.reminderToRegister.reminderMessages = {};
			updateData.reminderToRegister.reminderMessages = values[1][0].reminderToRegisterMessages;
			updateData.reminderToRegister.reminderInterval = values[1][0].reminderToRegisterInterval;
			updateData.reminderToRegister.reminderTime = values[1][0].reminderToRegisterTime;
			updateData.reminderToRegister.reminderActive = values[1][0].reminderToRegisterActive;
		}

		// Reminder to Upload Docs
		if (values[2].length) {

			updateData.reminderToUploadDocuments = {};
			updateData.reminderToUploadDocuments.reminderMessages = {};
			updateData.reminderToUploadDocuments.reminderMessages = values[2][0].reminderToUploadMessages.mobile;
			updateData.reminderToUploadDocuments.reminderInterval = values[2][0].reminderToUploadInterval;
			updateData.reminderToUploadDocuments.reminderTime = values[2][0].reminderToUploadTime;
			updateData.reminderToUploadDocuments.reminderActive = values[2][0].reminderToUploadActive;
		}


		console.log(updateData);

     
     
     updateData.save();
    //  /console.log(updateData.reminderToRegister);
		//updateData.save();

      return;
    })
    .catch(err => {
      console.log('Announcements Settings Error', err.message);
    })


}).catch((error) => {
	console.log(error);
});


