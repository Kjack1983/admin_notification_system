var automatedMessages = (function(){
	var dashboardContent,
		reminderToRegisterSaveButton;
	
	var reminderToRegisterInterval = '30 days',
		reminderToRegisterTime = '14',
		reminderToRegisterActive = false,
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
			'1 hour': 3600000,
			'3 minutes': 180000,
			'1 minute': 60000
		},
		reminderToRegisterMessages = {},
		modalContent;

	languages.map(function(lang){
		reminderToRegisterMessages.title = {};
		reminderToRegisterMessages.text = {};
		reminderToRegisterMessages.title[lang.code] = '';
		reminderToRegisterMessages.text[lang.code] = '' ;
	});	

	
	function init() {
		dashboardContent = $('#dashboard-content');
		dashboardContent.empty();
		modalContent = $('#adminModal .modal-content');

		$.ajax({
		    url: "templates/announcements/announcements.html",
		    cache: false,
		    dataType: "html",
		    success: function(data) {
		    	// Set panel data
		    	dashboardContent.html(data);
				
				$('.selectpicker').selectpicker({
		  			size: 4
				});
			
				reminderToRegisterInit();
		    }
		});

	}
	
	function reminderToRegisterSave(){
		
		languages.map(function(lang){
			reminderToRegisterMessages.title[lang.code] = $('#reminder-to-register-title-' + lang.code).val();
			reminderToRegisterMessages.text[lang.code] = $('#reminder-to-register-message-' + lang.code).val();
		})
		
		reminderToRegisterActive = $('#reminderToRegisterActiveToggle').prop("checked");
		var data = {
			reminderToRegisterTime: reminderToRegisterTime,
			reminderToRegisterInterval: reminderToRegisterInterval,
			reminderToRegisterMessages: reminderToRegisterMessages,
			reminderToRegisterActive: reminderToRegisterActive
		};
		
		$.ajax({
			type: "POST",
			url: '/api/announcements/settings/register-reminder',
			data: JSON.stringify(data),
			contentType: "application/json",
			success: function(res){
				modalContent.empty();
				modalContent.append(
					'<div><p>Reminder to register settings saved</p></div>'+ 
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

	function reminderToRegisterInit(){
		$('.selectpicker.reminder-to-register-interval').change(function(e){
			reminderToRegisterInterval = intervalMapping[$(e.currentTarget).find("option:selected").text()];
		});

		$('.selectpicker.reminder-to-register-time').change(function(e){
			reminderToRegisterTime = $(e.currentTarget).find("option:selected").text().slice(0, 2);
		});
		
		reminderToRegisterSaveButton = $('.reminder-to-register-button-holder .btn');
		
		$(document).off('click', '.reminder-to-register-save').on('click', '.reminder-to-register-save', reminderToRegisterSave);
		
		$.get('/api/announcements/settings/register-reminder', function(settings){
			if(settings['reminderToRegisterTime'] && settings['reminderToRegisterInterval'] && settings['reminderToRegisterMessages']){
				
				reminderToRegisterTime = settings.reminderToRegisterTime;
				
				reminderToRegisterInterval = parseInt(settings.reminderToRegisterInterval);

				// Set the reminder time dropdown value
				$('.selectpicker.reminder-to-register-time').selectpicker('val', settings.reminderToRegisterTime + ':00');
				
				// Set the interval drop down value
				Object.keys(intervalMapping)
					.map(function(val){
						if(reminderToRegisterInterval === intervalMapping[val]){
							$('.selectpicker.reminder-to-register-interval').selectpicker('val', val);
						} 
					})
				
				languages.map(lang => {
					$('#reminder-to-register-title-' + lang.code).val(settings.reminderToRegisterMessages.title[lang.code]);
					$('#reminder-to-register-message-' + lang.code).text(settings.reminderToRegisterMessages.text[lang.code]);
				})
				
				reminderToRegisterActive = settings.reminderToRegisterActive;

				$('#reminderToRegisterActiveToggle').prop('checked', settings.reminderToRegisterActive);
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