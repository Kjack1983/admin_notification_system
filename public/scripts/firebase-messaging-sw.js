importScripts('https://www.gstatic.com/firebasejs/3.5.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/3.5.2/firebase-messaging.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
  'messagingSenderId': '454419618716'
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

var uid = function() {
	var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};


self.addEventListener('push', function(event) {
	console.log('FCM Service Worker: Push notification received');
	var payload = event.data ? event.data.text() : 'no payload';
    var title = 'Market Notification';
    var payloadData;
    if (payload !== 'no payload') {
    	payloadData = JSON.parse(payload); 
    }
    var message = payloadData.data.detail || '';
    const notificationTitle = payloadData.data.title || 'Market Notification';
    const notificationOptions = {
    	body: message,
    	icon: '/admin/img/easymarkets_logo_icon.png',
    	requireInteraction: true,
    	data: JSON.stringify(payloadData.data)
  	};
  	
  	
  	payloadData.data.pushID = uid();
  

  	return self.registration.showNotification(notificationTitle,
    	notificationOptions);

});








