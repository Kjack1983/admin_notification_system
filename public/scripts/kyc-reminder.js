var uploadReminder = (function(){
	var dashboardContent,
		reminderToUploadSaveButton;
	
	var reminderToUploadInterval = '30 days',
		reminderToUploadTime = '14',
		reminderToUploadActive = false,
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
			'14 days': 1209600000,
			'13 days': 1123200000,
			'12 days': 1036800000,
			'11 days': 950400000,
			'10 days': 864000000,
			'5 days': 432000000,
			'4 days': 345600000,
			'3 days': 259200000,
			'2 days': 172800000,
			'1 day': 86400000			
		},
		reminderToUploadMessages = {},
		modalContent;

	languages.map(function(lang){
		reminderToUploadMessages.title = {};
		reminderToUploadMessages.text = {};
		reminderToUploadMessages.title[lang.code] = '';
		reminderToUploadMessages.text[lang.code] = '' ;
	});	

	
	function init() {
		dashboardContent = $('#dashboard-content');
		dashboardContent.empty();
		modalContent = $('#adminModal .modal-content');

		$.ajax({
		    url: "templates/reminder-to-upload/index.html",
		    cache: false,
		    dataType: "html",
		    success: function(data) {
		    	// Set panel data
		    	dashboardContent.html(data);
				
				$('.selectpicker').selectpicker({
		  			size: 4
				});
			
				reminderToUploadInit();
		    }
		});

	}
	
	function reminderToUploadSave(){
		
		languages.map(function(lang){
			reminderToUploadMessages.title[lang.code] = $('#reminder-to-upload-title-' + lang.code).val();
			reminderToUploadMessages.text[lang.code] = $('#reminder-to-upload-message-' + lang.code).val();
		})
		
		reminderToUploadActive = $('#reminderToUploadActiveToggle').prop("checked");

		var data = {
			reminderToUploadTime: reminderToUploadTime,
			reminderToUploadInterval: reminderToUploadInterval,
			reminderToUploadMessages: reminderToUploadMessages,
			reminderToUploadActive: reminderToUploadActive
		};
		
		$.ajax({
			type: "POST",
			url: '/api/announcements/settings/upload-reminder',
			data: JSON.stringify(data),
			contentType: "application/json",
			success: function(res){
				modalContent.empty();
				modalContent.append(
					'<div><p>Reminder to upload settings saved</p></div>'+ 
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

	function reminderToUploadInit(){
		$('.selectpicker.reminder-to-upload-interval').change(function(e){
			reminderToUploadInterval = intervalMapping[$(e.currentTarget).find("option:selected").text()];
		});

		$('.selectpicker.reminder-to-upload-time').change(function(e){
			reminderToUploadTime = $(e.currentTarget).find("option:selected").text().slice(0, 2);
		});
		
		reminderToUploadSaveButton = $('.reminder-to-upload-button-holder .btn');
		
		$(document).off('click', '.reminder-to-upload-save').on('click', '.reminder-to-upload-save', reminderToUploadSave);
		
		$.get('/api/announcements/settings/upload-reminder', function(settings){
			if(settings['reminderToUploadTime'] && settings['reminderToUploadInterval'] && settings['reminderToUploadMessages']){
				
				reminderToUploadTime = settings.reminderToUploadTime;
				
				reminderToUploadInterval = parseInt(settings.reminderToUploadInterval);

				// Set the reminder time dropdown value
				$('.selectpicker.reminder-to-upload-time').selectpicker('val', settings.reminderToUploadTime + ':00');
				
				// Set the interval drop down value
				Object.keys(intervalMapping)
					.map(function(val){
						if(reminderToUploadInterval === intervalMapping[val]){
							$('.selectpicker.reminder-to-upload-interval').selectpicker('val', val);
						} 
					})
				
				languages.map(lang => {
					$('#reminder-to-upload-title-' + lang.code).val(settings.reminderToUploadMessages.push.title[lang.code]);
					$('#reminder-to-upload-message-' + lang.code).text(settings.reminderToUploadMessages.push.text[lang.code]);
				})
				
				reminderToUploadActive = settings.reminderToUploadActive;

				$('#reminderToUploadActiveToggle').prop('checked', settings.reminderToUploadActive);
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