/**
 * Get Firebase Access Token for use in RestAPI
 */
const clientServiceAccount = require('./client-service-account.json');

const {google} = require('googleapis');

const getAccessToken = () => {
	return new Promise((resolve, reject) => {
		const jwtClient = new google.auth.JWT(
			clientServiceAccount.client_email,
			null,
			clientServiceAccount.private_key,
			[
				"https://www.googleapis.com/auth/firebase.messaging"
			]
		);

		jwtClient.authorize((err, tokens) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(tokens.access_token);
		});
	});
}

getAccessToken().then(token => {
	console.log(token);
});
