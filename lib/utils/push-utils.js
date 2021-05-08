"use strict";

const config = require('../../app/config');
const lndDomain = config.lndDomain;

/**
 * Parse Deletable Tokens
 *
 * Loops over invalid tokens object as returned in result from send
 * call and checks token errors to see if token can be removed.  Logs
 * non deletable errors for later review.
 *
 * @params {object} tokens Key/Value Token and associated error to check.
 * @params {array} errors Array of errors dictating tokens are deletable.
 * @params {string} sender Sending service used to log non deletable errors.
 * @return {array} result Tokens which can be deleted.
 */
const parseDeletableTokens = (tokens = {}, errors = [], sender = 'Firebase') => {
	return Object.entries(tokens).reduce((acc, [token, error]) => {
		if (errors.includes(error)) {
			acc.push(token);
		}
		else {
			console.error(`${sender}: Logging non deletable error (${error}) for token ${token}`);
		}
		return acc;
	}, []);
};

/**
 * Parse and replace mobile action with webview
 * 
 * Parses mobile action and replaces object with updated
 * landing page url instead of selected webview.
 * 
 * @param {object} action Notification action to replace if webview found.
 * @param {string} language Language of notification message.
 * @return {object}
 */
const parseAndReplaceWebviewAction = (action = {}, language = 'en') => {

	if (action.screen && action.webview) {
		action = {
			screen: action.screen,
			cwvUrl: encodeURIComponent(`https://${lndDomain}/eu/${language}/${action.webview}/`)
		};
	}

	return action;
};

module.exports = () => {

	return {
		parseDeletableTokens,
		parseAndReplaceWebviewAction
	}
};
