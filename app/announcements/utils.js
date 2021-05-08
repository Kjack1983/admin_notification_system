const parameters = require('../parameters');

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const month = 30 * day;
const year = 365 * day;


let recipientsTemplate = {
	alerts: [],
	push: [],
	mobiles: [],
	pushyMobiles: [],
	iosMobiles: [],
	androidMobiles: []		
};

const timeHelper = {
	second,
	minute,
	hour,
	day,
	month,
	year
};

const reminderMessagesTemplate =  {
	push: {title: {}, text: {}, action: {}},
	mobile: {title: {}, text: {}, action: {}},
	alert: {title: {}, text: {}, action: {}}
}
const prepareMessage = (reminderData, reminderType) => {
	
	let reminderMessages = Object.assign({}, reminderMessagesTemplate);
	
	Object.keys(reminderData[parameters.announcements.REMINDER_MESSAGES].text).map(lang => {
		
		reminderMessages.push.title[lang] = reminderData[parameters.announcements.REMINDER_MESSAGES].title[lang];
		reminderMessages.alert.title[lang] = reminderData[parameters.announcements.REMINDER_MESSAGES].title[lang];
		reminderMessages.mobile.title[lang] = reminderData[parameters.announcements.REMINDER_MESSAGES].title[lang];
		
		reminderMessages.push.text[lang] = reminderData[parameters.announcements.REMINDER_MESSAGES].text[lang];
		reminderMessages.alert.text[lang] = reminderData[parameters.announcements.REMINDER_MESSAGES].text[lang];
		reminderMessages.mobile.text[lang] = reminderData[parameters.announcements.REMINDER_MESSAGES].text[lang];
		
		reminderMessages.push.action[lang] = '';
		reminderMessages.alert.action[lang] = '';
		reminderMessages.mobile.action[lang] = '';	
		
		if(reminderType === 'reminderToLogin') {
			reminderMessages.mobile.action[lang] = {screen: '17'};	
		}

		if(reminderType === 'reminderToUploadDocuments') {
			reminderMessages.push.action[lang] =  lang === 'en' ? '/eu/my-easymarkets/my-account/upload-documents/' : '/eu/' + lang + '/my-easymarkets/my-account/upload-documents/';
			reminderMessages.alert.action[lang] = lang === 'en' ? '/eu/my-easymarkets/my-account/upload-documents/' : '/eu/' + lang + '/my-easymarkets/my-account/upload-documents/';;
			reminderMessages.mobile.action[lang] = {screen: '8'};	
		}

		if(reminderType === 'reminderToRegister') {
			reminderMessages.mobile.action[lang] = {screen: '16'};	
		}
	});

	// Inject trigger type
	return {
		filters: {
			mode: 'send',
		},
		messages: reminderMessages,
		[parameters.tracking.TRIGGER_TYPE]: reminderType,
	};
}

module.exports = {
	timeHelper,
	prepareMessage,
	recipientsTemplate
}
