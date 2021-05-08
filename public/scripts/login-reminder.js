var loginReminder = (function(){
	var dashboardContent,
		reminderToLoginSaveButton;
	
	var reminderToLoginInterval = '30 days',
		reminderToLoginTime = '14',
		reminderToLoginActive = false,
		languages = [{
				code: "en",
				value: "English"
			},
			{
				code: "pl",
				value: "Polish"
			},
			{
				code: "ar",
				value: "Arabic"
			},
			{
				code: "zh-hans",
				value: "Chinese"
			},
			{
				code: 'es',
				value: 'Spanish'
			}
		],
		intervalMapping = {
			'30 days': 2592000000,
			'15 days': 1296000000,
			'10 days': 864000000,
			'5 days': 432000000,
			'4 days': 345600000,
			'3 days': 259200000,
			'2 days': 172800000,
			'1 day': 86400000,
			'Today': 0	
		},
		reminderToLoginMessages = {},
		modalContent;

	languages.map(function(lang){
		reminderToLoginMessages.title = {};
		reminderToLoginMessages.text = {};
		reminderToLoginMessages.title[lang.code] = '';
		reminderToLoginMessages.text[lang.code] = '' ;
	});	

	
	function init() {
		dashboardContent = $('#dashboard-content');
		dashboardContent.empty();
		modalContent = $('#adminModal .modal-content');

		$.ajax({
		    url: "templates/reminder-to-login/index.html",
		    cache: false,
		    dataType: "html",
		    success: function(data) {
		    	// Set panel data
		    	dashboardContent.html(data);
				
				$('.selectpicker').selectpicker({
		  			size: 4
				});
			
				reminderToLoginInit();
		    }
		});

	}
	
	function reminderToLoginSave(){
		
		languages.map(function(lang){
			reminderToLoginMessages.title[lang.code] = $('#reminder-to-login-title-' + lang.code).val();
			reminderToLoginMessages.text[lang.code] = $('#reminder-to-login-message-' + lang.code).val();
		})
		
		reminderToLoginActive = $('#reminderToLoginActiveToggle').prop("checked");

		var data = {
			reminderToLoginTime: reminderToLoginTime,
			reminderToLoginInterval: reminderToLoginInterval,
			reminderToLoginMessages: reminderToLoginMessages,
			reminderToLoginActive: reminderToLoginActive
		};

		$.ajax({
			type: "POST",
			url: '/api/announcements/settings/login-reminder',
			data: JSON.stringify(data),
			contentType: "application/json",
			success: function(res){
				modalContent.empty();
				modalContent.append(
					'<div><p>Reminder to login settings saved</p></div>'+ 
					'<div class="modal-confirmation-message">' + 
						'<a href="#" class="btn confirm-btn">Ok</a>' + 
					'</div>'
				);
				$("#adminModal").modal('show');
				var windowHeight = $(window).height();
				setTimeout(function(){
					var modalHeight = $(modalContent).outerHeight();
					var marginTop = (windowHeight - modalHeight) / 2;
					modalContent.css({'margin-top': marginTop + 'px'});
				}, 150)	

			},
			error: function(){
				console.log('There was a problem while sending the message');
			}
		});


		
	}

	function reminderToLoginInit(){
		$('.selectpicker.reminder-to-login-interval').change(function(e){
			reminderToLoginInterval = intervalMapping[$(e.currentTarget).find("option:selected").text()];
		});

		$('.selectpicker.reminder-to-login-time').change(function(e){
			reminderToLoginTime = $(e.currentTarget).find("option:selected").text().slice(0, 2);
		});
		
		reminderToLoginSaveButton = $('.reminder-to-login-button-holder .btn');
		
		$(document).off('click', '.reminder-to-login-save').on('click', '.reminder-to-login-save', reminderToLoginSave);
		
		$.get('/api/announcements/settings/login-reminder', function(settings){
			if(settings['reminderToLoginTime'] && settings['reminderToLoginInterval'] && settings['reminderToLoginMessages']){
				
				reminderToLoginTime = settings.reminderToLoginTime;
				
				reminderToLoginInterval = parseInt(settings.reminderToLoginInterval);

				// Set the reminder time dropdown value
				$('.selectpicker.reminder-to-login-time').selectpicker('val', settings.reminderToLoginTime + ':00');
				
				// Set the interval drop down value
				Object.keys(intervalMapping)
					.map(function(val){
						if(reminderToLoginInterval === intervalMapping[val]){
							$('.selectpicker.reminder-to-login-interval').selectpicker('val', val);
						} 
					})
				
				languages.map(lang => {
					$('#reminder-to-login-title-' + lang.code).val(settings.reminderToLoginMessages.push.title[lang.code]);
					$('#reminder-to-login-message-' + lang.code).text(settings.reminderToLoginMessages.push.text[lang.code]);
				})
				
				reminderToLoginActive = settings.reminderToLoginActive;

				$('#reminderToLoginActiveToggle').prop('checked', settings.reminderToLoginActive);
			}
		})
	}
	// function that is used to show the module when menu is clicked	
	function show() {
		init();
	}
	
	// function that is used to hide the module when other module is clicked
	function hide() {
	
	}


	return {
		init: init,
		show: show,
		hide: hide
	}
})()