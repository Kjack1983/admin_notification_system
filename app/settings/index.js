const Settings = require('../../models/settings');

module.exports = (settings, usersManagement, messagingSettings) => {

	// Landing Page Api handler
	const lndApi = require('../usersManagement/lnd.api')();
	
	settings.addHttpInEvent({
		name: 'addingLanguage',
		url: '/api/settings/language/',
		data: [
			'languages'
		],
		handler: function(data){
			messagingSettings.updateLanguagages(data.languages);
		},
		method: 'post',
		distributed: true
	});

	settings.addHttpInEvent({
		name: 'retreivingLanguage',
		url: '/api/settings/language/',
		data: [],
		handler: function(req, res){
			
			res.send({
				languages: messagingSettings.getLanguages().languages,
				error: false
			});

		},
		method: 'get'
	});

	/**
	 * Fetch available Custom Webview Slugs
	 *
	 * Returns list of available LND custom webview slugs per language.
	 *
	 * @param {string} language Language for webview slugs.
	 * @return {void}
	 */
	settings.addHttpInEvent({
		name: 'lndApiGetSlugs',
		url: '/api/lnd/slugs',
		data: [
			'language',
		],
		handler: function(req, res, data) {
			lndApi.fetchCustomWebviewSlugs(data.language).then(slugs => {
				res.send(slugs);
			});
		},
		method: 'get',
	});
}
