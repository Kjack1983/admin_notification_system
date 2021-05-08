"use strict";
/**
 * Landing Pages Api helper
 */
const config = require('../config');
const apiUrl = config.lndApiUrl;

const fetch = require('node-fetch');
const qs = require('querystring');

module.exports = () => {

	const fetchCustomWebviewSlugs = async(language) => {

		try {

			if (!language) {
				throw new Error('Missing language');
			}

			// Api Url with Parameters
			const url = apiUrl + 'list/slugs.json?' + qs.stringify({
				language: language,
				campaign: 'mobile-custom-webview'
			});

			// Call Api and return json decoded response
			return await fetch(url).then(res => res.json());

		} catch (error) {

			// Log full error
			console.error('LND API Get Slugs Error:', error);

			// Return error message
			return {error: error.message};
		}
	};

	return {
		fetchCustomWebviewSlugs
	};
};
