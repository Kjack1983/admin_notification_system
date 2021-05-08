var events = (function(){
 	var topics = {};
  	var hOP = topics.hasOwnProperty;

  	return {
    	subscribe: function(topic, listener) {
	      	// Create the topic's object if not yet created
	      	if(!hOP.call(topics, topic)) topics[topic] = [];

	      	// Add the listener to queue
	      	var index = topics[topic].push(listener) -1;

	      	// Provide handle back for removal of topic
	      	return {
	        	remove: function() {
	          		delete topics[topic][index];
	        	}
	      	};
    	},
	    publish: function(topic, info) {
	      	// If the topic doesn't exist, or there's no listeners in queue, just leave
	      	if(!hOP.call(topics, topic)) return;

	      	// Cycle through topics queue, fire!
	      	topics[topic].forEach(function(item) {
	      		item(info != undefined ? info : {});
	      	});
	    }
  	};
})();

var eventNames = {
	'languages': {
		'_INIT_' : '/content.languages',
		'_GET_LANGUAGES_' : '/content.langagues.get',
		'_SET_LANGUAGES_' : '/content.languages.set'
	},
	'messages': {
		'_INIT_': '/content.messages',
		'_ALERT_PREVIEW_': '/content.messages.alert.preview',
		'SEND_PREVIEW': '/messagePreview',
		'SEND': '/messageSend'
	},
	'push': {
		'_INIT_': '/content.push'
	},
	'alerts': {
		'_INIT_': '/content.alerts'
	},
	'groups': {
		'_INIT_': '/content.groups'
	},
	'reports': {
		'_INIT_': '/content.reports'
	},
	'rules': {
		'_INIT_': '/content.rules'
	},
	'authentication': {
		'_LOGIN_': '/login'
	},
	'userStats': {
		'_UPDATE_': '/user.stats.update'
	},
	'recipientStats': {
		'_UPDATE_': '/recipient.stats.update',
		'_REQUEST_': '/recipient.stat.request'
	},
	'filters': {
		'_UPDATE_': '/filters.update'
	},
	'admin': {
		'_PUSH_REGISTER': 'admin.push.register',
		'SHOW_PANEL': 'admin.showPanel',
		'SHOW_LOGIN': 'admin.showLogin',

	}
};
