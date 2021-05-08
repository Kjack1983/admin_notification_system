const SettingsModel = require('../models/settings');

module.exports = function(){
	let languages = [];
	
	const updateLanguagages = (lang) => {
		languages = [...lang];
		
		SettingsModel
			.find()
			.exec()
			.then(response => {
				let settings = response[0];
				if(settings){
					settings.languages = [...languages];
					settings.save();					
				}else{
					let newSettings = new SettingsModel()
					newSettings.languages = [...languages];
					newSettings.save();
				}

			})

	}

	const getLanguages = () => {
		let mobileLanguages,
			browserLanguages;
		
		mobileLanguages = languages.filter(lang => lang.domain === 'all' || lang.domain=== 'mobile');

		browserLanguages = languages.filter(lang => lang.domain === 'all' || lang.domain === 'browser');

		return {
			mobileLanguages,
			browserLanguages,
			languages
		}
	}

	const init = () => {
		// Get setting from the database
		return SettingsModel
			.find()
			.exec()
			.then(settings => {
				if(settings[0] && settings[0].languages) {
					languages = settings[0].languages;
					return;
				}
				updateLanguagages([]);
			})
			.catch(err => {
				console.log('Messaging Settings: There was a problem accessing mongodb', err);
			})	
	}

	const getAllSettings = () => {
		return SettingsModel
			.find()
			.lean()
			.exec()
			.then(settings => {
				if(settings[0] && settings[0].languages) {
					
					return settings[0];
				}
				return {}
			})
			.catch(err => {
				return {}
				console.log('Messaging Settings: There was a problem accessing mongodb', err);
			})	
	}

	return {
		init,
		updateLanguagages,
		getLanguages,
		getAllSettings
	}
}