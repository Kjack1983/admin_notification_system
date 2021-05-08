/*
 * Admin authentication module. This is starting point of admin app. 
 * After users successfuly registers, admin panel is shown, and fun can start. 
 */
var loginModule = (function() {
	var loginButton,
		loginError,
		loginErrorContent,
		userName,
		password,
		loginContent, 
		deffered;

	var loginSuccessCallback = function(data) {
		// After successful login, notify rest of the admin system 
		deffered.resolve({
			username: userName.val()
		})
	};

	var loginErrorCallback = function(data) {
		loginErrorContent.text('Username and password are not recognized');
	  	loginError.css('visibility', 'visible');
	};

	function loginHandler(e) {
		if(userName.val() === '' && password.val() === ''){
  			loginErrorCallback();
  			return;
  		}
  		var userData = {
  			"username":   userName.val(),
			"password":  password.val()
  		}
  		  		
  		$.ajax({
			type: "POST",
			url: '/admin/auth/login',
			data: JSON.stringify(userData),
			dataType: 'text',
			contentType: "application/json",
			success: loginSuccessCallback,
			error: loginErrorCallback
		});
	}
	
	function init(){
		loginButton = $('.login-btn');
		loginError = $('.login-error');
		loginErrorContent = $('.login-error-content');
		userName = $('#username');
		password = $('#password');
		loginContent = $('#login-form-holder');
		deffered = $.Deferred();
	}

  	function showLogin() {
		loginContent.show();
		$(document).on('click', '.login-btn', loginHandler);
		return deffered.promise();
  	}

  	return {
		init: init,
  		showLogin: showLogin
  	}
})();
