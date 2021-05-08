// Read .env file if found
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

let adminRoles = [
	'root', // Everything including unreleased functionality
	'admin', // Everything excluding unreleased functionality
	'user', // Everything except language / user management
];

const getAdminDetails = (userNames) => {

  let userName = readlineSync.question('Username: ');
  
  if(userNames.indexOf(userName) > -1) {
    console.log(`Username ${userName} is already taken, please try another one`);
    return getAdminDetails();
  }
  
  // Handle the secret text (e.g. password). 
  let password  = readlineSync.question('Password: ', {
    hideEchoBack: true // The typed text on screen is hidden by `*` (default). 
  });

  let role = readlineSync.question('Enter admin role [root, master, admin]: ');
  if(adminRoles.indexOf(role) === -1){
    console.log('Incorrect user role. Available roles are: root, admin, master. Please try again');
    return getAdminDetails();
  }

  var hashedPassword = bcrypt.hashSync(password, 8);

  Admin.create({
    username: userName,
    password: hashedPassword,
    role: role
  }, () => {
    console.log('Success. New admin user is added to the database. User role is set to root');
    process.exit();
  });
}

Admin.find({}, (err, admins) => {
  getAdminDetails(admins.map(admin => admin.username));
})
