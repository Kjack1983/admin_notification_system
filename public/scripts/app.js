/*
 * Admin client module entry point. Since the client code is already getting more and 
 * more complex, we need to find a good way to organize client modules. At the moment its
 * a set of modules that communicate to each other using pub/sub event channel. 
 */
var notificationAdminPanel = (function(){

	var socket, 
		username,
		socketId,
		token,
		panelInitialized = false,
		adminModulesList = {
			'MESSAGES': 'messages', 
			'AUTOMATED_MESSAGES': 'automaticMessages',
			'LOGIN_REMINDER': 'loginReminder',
			'UPLOAD_REMINDER': 'uploadReminder',
			'REPORTS': 'reports'
		},
		currentModule = adminModulesList.MESSAGES,
		parameters;
	
	function panelModuleInit() {
		if(currentModule === adminModulesList.MESSAGES){
			messages.init(username, socketId);
			return adminModulesList.MESSAGES;
		}
	}
	

	function adminInit(data) {
		panelModule.init(panelModuleInit, adminModulesList);
		data.socketId = socketId;
		data.access === "allowed" ? showAdminPanel(data) : showLogin();
		panelInitialized = true;
	}

	function showAdminPanel(data){
		username = data.username;
		data.socketId = socketId;	
		panelModule.showPanel(data);
		if(!pushRegistered){
			registerPushNotifications();
			pushRegistered = true;
		}
		socket.emit('adminConnect', {username: username});
	}

	function showLogin(){
		loginModule.init();
		loginModule.showLogin()
			.then(function(data){
				username = data.username;
				if(!pushRegistered){
					registerPushNotifications();
					pushRegistered = true;
				}
				socket.emit('adminConnect', {username: username});
				data.socketId = socketId;	
				panelModule.showPanel(data, true);
			})
			
	}
	
	function addSocketHandlers() {
		socket.on('usersStats', function(data) {
			messages.updateUserStats(data);
		});

		socket.on('clientNotificationPreview', function(data) {
			messages.messagePreview(data);
		});

		socket.on('connect', function(){
			socketId = socket.id;
			if(username) {
				messages.updateSocketInfo(socketId);
				socket.emit('adminConnect', {username: username});	
			}else{
				$.get('/admin/auth/status', adminInit);
			}
		});

		socket.on('connected', function(data){
			// Data is list of parameters we should send to the server
			parameters = data.parametersList;
			socketId = socket.id;
			messages.updateSocketInfo(socketId);
			var adminData = {};
	        adminData.token = token;
	        adminData.username = username;
	        if(username && token){
		        socket.emit('adminPushRegister', adminData);
	        }

		})

		socket.on('recipientStats', messages.updateReciptientStats);

	}

	function addAppEventListeners(){
		// This event is triggered when there is a change of a filter on admin page. 
		// When this happens we want to update recipient stats as soon as possible. We are emmiting filter data
		// to the server. Server will then process this data, and send new data to the admin. 
		events.subscribe(eventNames.recipientStats._REQUEST_, function(data){
			socket.emit('recipientStats', {
				username: username,
				filters: data
			});
		});

		events.subscribe(eventNames.messages.SEND_PREVIEW, messagePreviewRequest);
		events.subscribe(eventNames.messages.SEND, messageSend);
	}
	function messageSend(data){
		$.ajax({
			type: "POST",
			url: '/live/client-trigger',
			data: JSON.stringify(data),
			dataType: 'text',
			contentType: "application/json",
			success: function(){
				messages.messageSentConfirmation();		
			}
		});
	}

	function messagePreviewRequest(data) {
		$.ajax({
			type: "POST",
			url: '/live/client-trigger/preview',
			data: JSON.stringify(data),
			dataType: 'text',
			contentType: "application/json",
			success: function(){
				console.log('Messages sent successfuly');
			},
			error: function(){
				console.log('There was a problem while sending the message');
			}
		});
	}
	var pushRegistered = false;

	function registerPushNotifications() {
		var config = {
		    apiKey: "AIzaSyCYVLNyZ707vfakmcv9Yxouu955O2cisgk",
		    messagingSenderId: "454419618716"
		};
		
  		firebase.initializeApp(config);
		
		var messaging = firebase.messaging();

		messaging.onTokenRefresh(function() {
			messaging.getToken()
			  	.then(function(refreshedToken) {
				    console.log('Market Notifications Admin: Token refreshed.');
				  })
			  	.catch(function(err) {
			    	console.log('Market Notifications Admin: Unable to retrieve refreshed token ', err);
			    });
		});
		
	  	navigator.serviceWorker
			.register('scripts/firebase-messaging-sw.js')
			.then(function(registration) {
				return messaging.useServiceWorker(registration);
			})
			.then(function() {
				console.log('Market Notifications Admin: Service worker registered');
				return messaging.requestPermission()
			})
			.then(function() {
				return messaging.getToken();
			})
			.then(function(currentToken) {
				var adminData = {};
	            adminData.token = currentToken;
	            token = currentToken;
	            adminData.username = username;
	            socket.emit('adminPushRegister', adminData);
			})
			.catch(function(err) {
				console.log('Market Notifications Admin: Push registration error: ' + err);
			})			

	}


	function init() {
		// Create Connection
		socket = io('wss://', {
			path:'/admin/socket.io',
		});
		addSocketHandlers();
		addAppEventListeners();
	};

	return{
		init: init
	}
})();

notificationAdminPanel.init();