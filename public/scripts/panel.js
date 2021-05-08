
var panelModule = (function() {
	
	var logoContainer ,
		loginFormHolder,
		logoutButton,
		panelContent,
		panelContent,
		header,
		panelRow,
		content,
		currentMenuItem,
		menuMessages = [],
		userManagement,
		panelInitialized = false,
		username,
		showAdminPanelModule,
		adminModulesList,
		currentModule;
	function init(_showAdminPanelModule, _adminModulesList){
		showAdminPanelModule = _showAdminPanelModule;
		adminModulesList = _adminModulesList;
		if(!panelInitialized){
			logoContainer = $('#logo-container');
			loginFormHolder = $('#login-form-holder');
			logoutButton = $('.logout-holder');
			panelContent = $('.form-holder');
			panelContent = $('#panel-content');
			header = $('.header');
			panelRow;
			content = $('.content');
			currentMenuItem;
			menuMessages = [];
			userManagement = $('#user-management');
			panelInitialized = true;
			
			// Get panel data from db 
			
			$(document).on('click', '.logout-holder', function(){
				$.get('/admin/auth/logout', function(data){
	    			window.location.reload(true);
	    		})
			});

			$(document).on('click', '.panel-row', switchPanel);
		}
	}

	function switchPanel(e) {
		var clickedModule = $(this).attr('data-panel')
		
		if(clickedModule === currentModule) return;
		
		panelRow.each(function(i, el){
			if($(el).attr('data-panel') === clickedModule) {
				$(this).addClass('active');
				
				// Hidding current module
				switch (currentModule) {
					case adminModulesList.MESSAGES: {
						messages.hide();
						break;
					}
					case adminModulesList.AUTOMATED_MESSAGES: {
						automatedMessages.hide();
						break;
					}
					case adminModulesList.LOGIN_REMINDER: {
						loginReminder.hide();
						break;
					}
					case adminModulesList.UPLOAD_REMINDER: {
						uploadReminder.hide();
						break;
					}
				}
				
				// Showing clicked module
				switch (clickedModule) {
					case adminModulesList.MESSAGES: {
						messages.show();
						break;
					}
					case adminModulesList.AUTOMATED_MESSAGES: {
						automatedMessages.show();
						break;
					}
					case adminModulesList.LOGIN_REMINDER: {
						loginReminder.show();
						break;
					}
					case adminModulesList.UPLOAD_REMINDER: {
						uploadReminder.show();
						break;
					}
				}

				currentModule = clickedModule;


				// newModule add.
			}else{
				$(this).removeClass('active');
			}
		})
	}



	function showPanel(data, transition){
		username = data.username;
		if(transition){
			loginFormHolder.hide();
			panelContent.addClass('transition-start');
		}else{
			panelContent.addClass('active');
		}
		panelContent.show();
		userManagement.show();
        userManagement.find('.name-holder').text(username);
		header.addClass('panel-active');
		content.addClass('panel-active');
		$.ajax({
		    url: "templates/panel.html",
		    cache: false,
		    dataType: "html",
		    success: function(data) {
		    	panelContent.removeClass('transition-start');
		    	// Set panel data
			    panelContent.html(data);
			    var transitionDuration = transition ? 600 : 0;
		    	setTimeout(function(){
		    		if(typeof showAdminPanelModule === 'function'){
		    			currentModule = showAdminPanelModule();
		    		}
				}, transitionDuration)
		        // Populate menu information
		        panelRow = $('.panel-row');
		        currentMenuItem = $(panelRow[0]).attr('data-panel');
		        $(panelRow[0]).addClass('active');
		        // Initialize content
		     

		    }
		});

	}

	return {
		init: init,
		showPanel: showPanel
	}

})();