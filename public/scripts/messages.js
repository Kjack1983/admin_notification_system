var messages = (function(){
	var sendMessageButton,
		previewMessageButton,
		dashboardContent,
		messageInputContainer,
		userListContainer,
		selectedUserListContainer,
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
		userList = [],
		selectedUsers = [],
		importedUsers = [],
		filtersMappings = {
			cultures: {
				'International': 'int',
				'All cultures': 'all',
				'EU culture': 'eu',
				'AU culture': 'au'
			},
			userType: {
				'All users': 'all',
				'Logged in': 'in',
				'Logged out': 'out'
			},
			deviceType: {
				'Alert': 'alert',
				'Browser': 'browser',
				'Browser Alert': 'browser-alert',
				'Browser Push': 'browser-push',
				'Mobile': 'mobile',
				'Push All': 'push-all',
				'All': 'all'
			},
			testUsers: {
				'All users': 'all',
				'Test users': 'test',
				'Non test users': 'non-test'
			}
		},
		mobileActionsMappings = {
			'Trading ticket' : {
				params: '#trading-ticket-pair',
				screen: '1'
			},
			'Market explorer' : {
				screen: '2'
			},
			'My account' : {
				screen: '3'
			},
			'Open positions' : {
				screen: '4'
			},
			'Deposit' : {
				screen: '6'
			},
			'Withdrawal' : {
				screen: '7'
			},
			'Upload documents' : {
				screen: '8'
			},
			'Account settings' : {
				screen: '9'
			},
			'Notification' : {
				screen: '10'
			},
			'Transactions report' : {
				screen: '11'
			},
			'Missing fields' : {
				screen: '12'
			},
			'Welcome screen' : {
				screen: '13'
			},
			'Favorite' : {
				screen: '14'
			},
			'Contact us': {
				screen: '15'
			},
			'Sign up' : {
				screen: '16'
			},
			'Login' : {
				screen: '17'
			},
			'Change password' : {
				screen: '18'
			},
			'Forgot password' : {
				screen: '19'
			},
			'Modify' : {
				screen: '20'
			}
		},
		mobileActions = {screen: '1'},
		filters = {
			cultures: filtersMappings.cultures['All cultures'], 
			userType: filtersMappings.userType['All users'],
			testUsers: filtersMappings.testUsers['All users'],
			deviceType: filtersMappings.deviceType['All'],
			selectedUsers: selectedUsers,
			importedUsers: importedUsers,
			alertActiveLanguages : [],
			pushActiveLanguages : [],
			mobileActiveLanguages: [],
			userIdFilter: ''
		},
		userSelection,
		userSelectionBlockingMask,
		userStats,
		csvUploadContainer,
		csvUploadSuccessMessage,
		csvUploadErrorMessage,
		csvStats,
		csvResetButton,
		inputs,
		username,
		socketId,
		modalContent,
		// User list stream. It emmits new value each time updated list of users is returned from the server
		userList$ = new Rx.Subject(),
		// Filter stream. Stream of user input values
		userFilter$,
		// Stream of filtered user list that
		filteredUserList$,
		oldList = [],
		// array of currently visible notifications
		visibleNotifications = [];

		// Backlog if too many alerts
		notificationsBacklog = [];

		// Instrument list
		allowedInstrumentsList = [],

		alertDuration = 300000;
	

	
	function init(_username, _socketId){
		dashboardContent = $('#dashboard-content');
		dashboardContent.empty();
		username = _username;
		socketId = _socketId;
		prepareInstrumentsList();
		$.ajax({
		    url: "templates/messages/messages.html",
		    cache: false,
		    dataType: "html",
		    success: function(data) {
		    	// Set panel data
		    	dashboardContent.html(data);
		        
		        messageInputContent = $('.messages-input-holder .row');
		        
		        userListContainer = $('.user-list-container');
		        userListContainer.off('click', '.user-id-button').on('click', '.user-id-button', selectUser);
		        selectedUserListContainer = $('.selected-user-list-container');
		        
		        $('.selectpicker').selectpicker({
		  			size: 4
				});

				selectedUsers = [];
				importedUsers = [];
				addFilterChangeHandlers();
				userSelection = $('.messages-filter-holder');
				userSelectionBlockingMask = $('.messages-filter-holder').find('.blocking-mask')[0];

		  		userStats = userSelection.find('.user-stats')[0];
		  		csvUploadContainer = $('#csv-upload-container');
				csvStats = csvUploadContainer.find('.upload-csv-stats')[0];
				cvsResetButton = csvUploadContainer.find('#csv-reset-button')[0];
				csvUploadSuccessMessage = csvUploadContainer.find('.upload-message.success')[0];
				csvUploadErrorMessage = csvUploadContainer.find('.upload-message.upload-error')[0];
				sendMessageButton = $('.message-btn');
				previewMessageButton = $('.message-preview-btn');
				modalContent = $('#adminModal .modal-content');
				addMessageInputs();
				
				
				$(document).off('click', '.message-btn').on('click', '.message-btn', sendMessage);
				
				$(document).off('click', '.message-preview-btn').on('click', '.message-preview-btn', previewMessage);

				$(document).off('click', '.modal-confirmation-message .confirm-btn').on('click', '.modal-confirmation-message .confirm-btn', function(){
					$("#adminModal").modal('hide');
				})
				
				$(document).off('click', '.modal-send-message-confirmation .cancel-btn').on('click', '.modal-send-message-confirmation .cancel-btn', function(){
					$("#adminModal").modal('hide');
				})
				
				//$(cvsResetButton).on('click', csvUploadReset);

				$(document).off('click', '#csv-reset-button').on('click', '#csv-reset-button', csvUploadReset);
				$(document).off('click', '#csv-upload-button').on('click', '#csv-upload-button', csvUploadHandler)
				
				//getRecipientStats();
		    }
		});
	}

	// function that is used to show the module when menu is clicked	
	function show() {
		init(username, socketId);
	}
	
	// function that is used to hide the module when other module is clicked
	function hide() {
		dashboardContent.empty();

	}
	
	function prepareInstrumentsList(){
		$.ajax({
			url: 'https://www.easymarkets.com/api/jsapiservice.svc/?rq=[{%22action%22:%22GetSession%22,%22args%22:{%22applicationId%22:%22CA7D0F97-F865-4D89-9983-409E5EE5DDF3%22}}]&appid=CA7D0F97-F865-4D89-9983-409E5EE5DDF3',
			crossDomain: true,
			dataType: 'jsonp',
			type: 'GET',
			success: function(response){
				var sid = response.results[0].GetSession.sessionId;
				$.ajax({
					'url': 'https://www.easymarkets.com/api/jsapiservice.svc/?rq=[{%22action%22:%22GetMarketInfoSettings%22,%22args%22:{%22siteLang%22:%22en%22}}]&appid=CA7D0F97-F865-4D89-9983-409E5EE5DDF3&sid=' + sid,
					crossDomain: true,
					dataType: 'jsonp',
					type: 'GET',
					success: function(res){
						res.results[0].GetMarketInfoSettings.currencyPairs.map(function(pair){
							allowedInstrumentsList.push(pair.baseCurrency + '/' + pair.nonBaseCurrency);
						})
						console.log('Allowed instrument list retrieved');
					} 
				})
			}
		})
	}


	function csvUploadHandler(e){
		e.preventDefault();
		clearSelectUserList();
		$(userSelectionBlockingMask).show();
		var csv = $('#csv-file-select');
		var csvFile = csv[0].files[0];
		var ext = csv.val().split(".").pop().toLowerCase();
		$(csvUploadSuccessMessage).hide();
		$(csvUploadErrorMessage).hide();
        if($.inArray(ext, ["csv"]) === -1){
            console.log('File format error');
            return false;
        }
        var test = Papa.parse(csvFile, {
			delimiter: " ",
			complete: function(data){
				importedUsers = [];
				data.data.forEach(function(item,i){
					if(i > 0){
						if(item[0]){
							importedUsers.push(item[0]);
						}
					}
				})
				filters.importedUsers = importedUsers;
				// Here i want to add stats about imported data
				$.ajax({
					type: "POST",
					url: '/api/fetch/csv/stats',
					data: JSON.stringify({users: importedUsers}),
					contentType: "application/json",
					success: function(res){

						$('.upload-csv-stats .users-number').text(res.totalNumber);
						$('.upload-csv-stats .available-users').text(res.totalAvailable);
						$('.upload-csv-stats .not-available').text(res.totalUnavailable);
						$('.upload-csv-stats .active-users').text(res.totalActive);
						$('.upload-csv-stats .mobile-apps').text(res.totalMobile);
						$('.upload-csv-stats .mobile-apps-enabled').text(res.totalMobileDirectMessagesEnabled);
						
						
						$(csvUploadSuccessMessage).show();
					},
					error: function(){
						console.log('There was a problem while sending the message');
						$(csvUploadErrorMessage).show();
					}
				});


				// /filters.importedUsers = importedUsers;
			}
		})
	}
	function csvUploadReset(){
		$('.upload-csv-stats .users-number').text('0');
		$('.upload-csv-stats .available-users').text('0');
		$('.upload-csv-stats .not-available').text('0');
		$('.upload-csv-stats .active-users').text('0');
		$('.upload-csv-stats .mobile-apps').text('0');
		$('.upload-csv-stats .mobile-apps-enabled').text('0');
									
		$(csvUploadSuccessMessage).hide();
		$(csvUploadErrorMessage).hide();

		importedUsers = [];

		filters.importedUsers = [];
		$("#csv-file-select").val('');
		$(userSelectionBlockingMask).hide();
	}
	/**
	 * Prepare Message - called before sending the actual message. It shows the current message both alert
	 * and push notificiation on the admin page.
	 * 
	 * @param void
	 * @return void
	 */
	function prepareMessage(){
		var message = {
			push: {
				title: {},
				text: {},
				action: {}
			},
			alert: {
				title: {},
				text: {},
				action: {}
			},
			mobile: {
				title: {},
				text: {},
				action: {}
			},
			adminUsername: username,
			socketId: socketId,
			validation: {
				messageValid: true,
				validationError: ''
			},
			messageEmpty: true,
		};

		// Transform UI states to filter values that server can understand
		message.filters = filters;
		
		filters.alertActiveLanguages.map(function(language) {
			
			var clearText = $($('#alert-message-' + language).summernote('code')).text();
			
			if(clearText !== '') message.messageEmpty = false;
			
			var htmlText = clearText === '' ? '' : $('#alert-message-' + language).summernote('code');
			
			message.alert.title[language] = 'Client Notification';
			
			message.alert.text[language] = htmlText;
			
			message.alert.action[language] = prepareMessageAction($('#alert-action-' + language).val());

			
		})
		
		filters.pushActiveLanguages.map(function(language){
			message.push.title[language] = $('#push-title-' + language).val();
			
			message.push.text[language] = $('#push-message-' + language).val();
			
			message.push.action[language] = prepareMessageAction($('#push-action-' + language).val());

		})

		
		if(filters.pushActiveLanguages.length){
			message.messageEmpty = false;
		}
		
		filters.mobileActiveLanguages.map(function(language){
			message.mobile.title[language] = $('#mobile-title-' + language).val();
			
			message.mobile.text[language] = $('#mobile-message-' + language).val();
			
			message.mobile.action[language] = mobileActions;
			
			if(mobileActions.screen === '1'){
				var re = /(^[a-zA-Z]{3}[/][a-zA-Z]{3}$)/g;
				var pairInput = $('#tt-ticket').val();
				var res = re.exec(pairInput);
				if(res){
					mobileActions.pair = res.input.toUpperCase();
				}else{
					message.validation.messageValid = false;
					message.validation.validationError = '<p>Mobile message deep link param is not valid. Pair format should be eur/usd. <br>Please try again.</p>';
				}
				
				if(allowedInstrumentsList.indexOf(mobileActions.pair) === -1){
					message.validation.messageValid = false;
					message.validation.validationError = '<p>Mobile message deep link param is not valid. The pair is not valid. <br>Please try again.</p>';
				}
			}

		})
		
		if(filters.mobileActiveLanguages.length){
			message.messageEmpty = false;
		}

		return message;
	}
	
	/**
	 * Prepeare actions format. Format for push and socket is a bit different. Also we currently dont know 
	 * what to expect from users since there's no instruction or constraint available for the action field. 
	 * So we need to take into consideration various possibilities and send proper action format to the client. 
	 *
	 * @params String action - action input from user
	 * @returns String - formated action string that is ready to go to client
	 */
	function prepareMessageAction(action){
		var result = '';
		if(!action) return result;
		if(action.indexOf('http') > -1) return action;
		result = action.replace(/^[^a-z\d]*|[^a-z\d]*$/gi, '');
		result = '/' + result;
		return result;
	}

	

	function sendMessage() {
		var message = prepareMessage();
		message.filters.selectedUsers = selectedUsers.slice(0);
		message.filters.importedUsers = importedUsers.slice(0);

		if(!message.validation.messageValid) {
			modalContent.empty();
			modalContent.append(
				message.validation.validationError + 
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


			return;
		}
		
		
		if(message.messageEmpty) {
			modalContent.empty();
			modalContent.append(
				'<p>Message fields are empty. Please add some text before sending the message. </p>' + 
				'<div class="modal-confirmation-message">' + 
					'<a href="#" class="btn confirm-btn">Ok</a>' + 
				'</div>'
			);
			//$("#adminModal").modal('show');
			
		}else{
			// I need basic stats here. 
			
			modalContent.empty();
			if(message.filters.selectedUsers.length || message.filters.importedUsers.length) {
				var usersNumber = message.filters.selectedUsers.length || message.filters.importedUsers.length;

				modalContent.append(
					'<div class="modal-send-message-confirmation">' + 
						'<h3>Message stats</h3>' + 
						'<p>Number of users you are trying to send messages: <span class="confirmation-stats">' + usersNumber + '</span></p>' + 
						'<p class="send-warning">Are you sure you want to send these messages?<p>' + 
						'<div class="modal-confirmation-buttons-holder">' + 
							'<a href="#" class="btn confirm-btn">Ok</a>' + 
							'<a href="#" class="btn cancel-btn">Cancel</a>' + 
						'</div>' + 
					'</div>'
				);
			}else{
				modalContent.append(
					'<div class="modal-send-message-confirmation">' + 
						'<h3>Message stats</h3>' + 
						'<p>Total Number of users that would receive messages: <span class="confirmation-stats">' + recipientStats.overall + '</span></p>' + 
						'<p>Number of browser alerts: <span class="confirmation-stats">' + recipientStats.alerts + '</span></p>'+ 
						'<p>Number of browser push notifications: <span class="confirmation-stats">' + recipientStats.push + '</span></p>'+ 
						'<p>Number of mobile app messages: <span class="confirmation-stats">' + recipientStats.mobiles + '</span></p>'+ 
						'<p class="send-warning">Are you sure you want to send these messages?<p>' + 
						'<div class="modal-confirmation-buttons-holder">' + 
							'<a href="#" class="btn confirm-btn">Ok</a>' + 
							'<a href="#" class="btn cancel-btn">Cancel</a>' + 
						'</div>' + 
					'</div>'
				);
				
			}
		}
		$("#adminModal").modal('show');
		
		// I need the sreen height and the modal height
		var windowHeight = $(window).height();
		setTimeout(function(){
			var modalHeight = $(modalContent).outerHeight();
			var marginTop = (windowHeight - modalHeight) / 2;
			modalContent.css({'margin-top': marginTop + 'px'});

			$(document).off('click', '.modal-send-message-confirmation .confirm-btn').on('click', '.modal-send-message-confirmation .confirm-btn', sendMessageConfirm);

		}, 150)

	}
	
	function messageSentConfirmation(){
		modalContent.empty();
		modalContent.append('<p>Message sent successfuly</p><div class="modal-confirmation-message"><a href="#" class="btn confirm-btn">Ok</a></div>');
		// After message is sent, remove the id's from filters
	}
	
	function sendMessageConfirm(){
		
		$(document).off('click', '.modal-send-message-confirmation .confirm-btn');

		var message = prepareMessage();
		//When sending the message attach user id's to the filter object.

		// check received message
		events.publish(eventNames.messages.SEND, message);
		//csvUploadReset();
		//clearSelectUserList();
		//filters.selectedUsers = [];
		//filters.importedUsers = [];
		
	}

	function previewMessage() {
		var message = prepareMessage();
		events.publish(eventNames.messages.SEND_PREVIEW, message);
	}


	function initializeUserIdFilter() {
		var inputForm = document.querySelector('#user-id-filter');
		// Create stream from input event
		if(inputForm){
			/*inputForm.on('change', function(){
				console.log('we are changing input')
			})*/
			userFilter$ = Rx.Observable
				.fromEvent(inputForm, 'input')
				// get input values
			  	.map(e => e.currentTarget.value)
			  	// Emmit values with at least 200ms break
			  	.debounce(500)
			  	// Initial value
			  	.startWith('');
			  
			userFilter$.subscribe(e => {
			  	filters.userIdFilter = e;
			});

			// Combine two streams by taking the last values from both, returning the stream of filtered user id values  	
			
			/*filteredUserList$ = Rx.Observable.combineLatest(userList$, userFilter$, (userList, filter) => {
			 	if(filter === '') return userList;
			 	return userList;
			  	return userList.filter(user => user.indexOf(filter) === 0);
			});*/

			filteredUserList$ = Rx.Observable.combineLatest(userList$, (userList) => {
			 	return userList;
			});
			// Subscribe to the filtered user list values -> and update UI
			filteredUserList$.subscribe(e => {
				updateUserListDisplay(e);
			});
		}
	}

	function updateUserListDisplay(e) {
		userListContainer.html('');
		var userListContent = '';
		e.forEach(function(userID) {
			userListContent += '<div class="user-id-holder"><span class="user-id-value">'+ userID +'</span><i data-userID="' + userID + '" class="fa fa-plus-circle user-id-button"></i></div>';
		});
		userListContainer.html(userListContent);
	};

	function selectUser(e){
		var userID = $(this).attr('data-userID');
		if(selectedUsers.indexOf(userID) === -1){
			selectedUsers.push(userID);
			selectedUserListContainer.append('<div id="'+ userID +'-holder" class="user-id-holder"><span class="user-id-value">'+ userID +'</span><i id="'+ userID +'-remove-button" data-userID="' + userID + '" class="fa fa-times-circle "></i></div>');
			
			$('#' + userID +'-remove-button').off('click').on('click', function() {
				$(this).off();
				selectedUsers = selectedUsers.filter(function(id) {
					return id !== userID;
				});
				$('#' + userID + '-holder').remove();
			})
		}		
	}

	function clearSelectUserList() {
		selectedUsers.map(function(userID){
			$('#' + userID + '-holder').remove();
		})
		
		selectedUsers = [];
		filters.selectedUsers = [];
	}
	
	
	// 
	function addMessageInputs(){
		languages.map(function(langItem){
			var language = langItem.code;

			$('#alert-message-' + language ).summernote({
				height: 120,
				styleTags: ['h1', 'h2', 'h3', 'h4'],
				fontSizes: ['10', '12', '14', '16'],
			  	toolbar: [
				    ['style', ['style']],
				    ['style', ['bold', 'italic', 'underline', 'strikethrough', 'clear']],
				    ['fontsize', ['fontsize']],
				    ['color', ['color']],
				    ['para', ['ul', 'ol', 'paragraph']],
			  	]
			});

			$('#alert-message-' + language).on('summernote.change', function(we, contents, $editable) {
				//pushText = $('#push-message-' + lang.code).val();
				var clearText = $(contents).text();
				
				/*
				 * Handling active language filter
				 * 
				 * When filtering users we need to take into consideration what languages do we 
				 * send. If the language input is empty users with this language selected should 
				 * not receive the message
				 */
				if(clearText && filters.alertActiveLanguages.indexOf(language) === -1 ) {
					filters.alertActiveLanguages.push(language);
					getRecipientStats();
				}

				if(!clearText && filters.alertActiveLanguages.indexOf(language) > -1){
					filters.alertActiveLanguages.splice(filters.alertActiveLanguages.indexOf(language), 1);
					getRecipientStats();
				}

			});

			$('#push-message-' + language).on('change keydown paste input', function(){
				if($('#push-message-' + language).val() && filters.pushActiveLanguages.indexOf(language) === -1){
					filters.pushActiveLanguages.push(language);
					getRecipientStats();
				}
				if(!$('#push-message-' + language).val() && filters.pushActiveLanguages.indexOf(language) > -1){
					filters.pushActiveLanguages.splice(filters.pushActiveLanguages.indexOf(language), 1);
					getRecipientStats();
				}
			});

			$('#mobile-message-' + language).on('change keydown paste input', function(){
				if($('#mobile-message-' + language).val() && filters.mobileActiveLanguages.indexOf(language) === -1){
					filters.mobileActiveLanguages.push(language);
					getRecipientStats();
				}
				if(!$('#mobile-message-' + language).val() && filters.mobileActiveLanguages.indexOf(language) > -1){
					filters.mobileActiveLanguages.splice(filters.mobileActiveLanguages.indexOf(language), 1);
					getRecipientStats();
				}

			});



			$('.note-current-color-button').hide();
			$('.note-color .note-icon-caret').addClass('note-icon-font');
			$('.note-color .note-icon-caret').css('color', 'brown');
			
			$('.note-current-color-button').off('click');
			$('.note-current-color').off('click');
		
		})
    	
		initializeUserIdFilter();
	}


	function addFilterChangeHandlers(){
		// When modifying filters, we want to update recipient stats straight away 
		$('.selectpicker.cultures').change(function(e){
			var selectedCulture = $(e.currentTarget).find("option:selected").text();
			filters.cultures = filtersMappings.cultures[selectedCulture];
			getRecipientStats();
		});
		$('.selectpicker.users').change(function(e){
			var selectedUsersType = $(e.currentTarget).find("option:selected").text();
			filters.userType = filtersMappings.userType[selectedUsersType];
			getRecipientStats();
		});
		$('.selectpicker.alert').change(function(e){
			var selectedDeviceType = $(e.currentTarget).find("option:selected").text();
			filters.deviceType = filtersMappings.deviceType[selectedDeviceType];
			getRecipientStats();
		});
		$('.selectpicker.test-users').change(function(e){
			var selectedTestUsers = $(e.currentTarget).find("option:selected").text();
			filters.testUsers = filtersMappings.testUsers[selectedTestUsers];
			getRecipientStats();
		});

		$('.selectpicker.mobile-screens').change(function(e){
			var selectedMobileScreen = $(e.currentTarget).find("option:selected").text();
			
			clearMobileParameters();
			
			mobileActions = {};

			mobileActions.screen = mobileActionsMappings[selectedMobileScreen].screen;
			
			if(mobileActionsMappings[selectedMobileScreen].params){
				mobileActions.screen = mobileActionsMappings[selectedMobileScreen].screen;
				$(mobileActionsMappings[selectedMobileScreen].params).show();
			}
		});


		filters.importedUsers = importedUsers;
	}
	
	function clearMobileParameters(){

		$('.trading-ticket-params').each(function(i, e){
			$(e).hide();
		})
	}
	
	let recipientStatsActive = false;
	function getRecipientStats(){
		if(!recipientStatsActive){
			recipientStatsActive = true;
			events.publish(eventNames.recipientStats._REQUEST_, filters);
			setTimeout(function(){
				recipientStatsActive = false;
			}, 1000);
		}
	}

	var userStats;
	function updateUserStats(data){
		//console.log(data);
		setTimeout(function(){
			if(data){
				$('.users-stats .loggedInUsers span').text(data.loggedInUsers);
				$('.users-stats .loggedOutUsers span').text(data.loggedOutUsers);
				$('.users-stats .mobileAppUsers span').text(data.mobileUsers);
				$('.users-stats .pushUsers span').text(data.pushUsers);
				$('.users-stats .socketUsers span').text(data.socketUsers);
			}

		}, 2000)
	}
	var recipientStats = {};
	function updateReciptientStats(data){

		$('.users-stats .overall span').text(data.alerts + data.push + data.mobiles);
		$('.users-stats .alerts span').text(data.alerts);
		$('.users-stats .push span').text(data.push);
		$('.users-stats .mobileApp span').text(data.mobiles);
		recipientStats.overall = data.alerts + data.push + data.mobiles;
		recipientStats.alerts = data.alerts;
		recipientStats.push = data.push;
		recipientStats.mobiles = data.mobiles;
		userList = [];
		// Transforming data from the server to an array of user id's
		Object.keys(data.userInfo).forEach(function(registration) {
			data.userInfo[registration].forEach(function(userID) {
				if(userList.indexOf(userID) === -1){
					userList.push(userID);
				}
			})
		});
	
		var userListChanged = false;

		if(userList.length === oldList.length){
			userList.every(function(user) {
				if(oldList.indexOf(user) === -1) {
					userListChanged = true;
					return false;
				}
				return 1;
			})
		}else{
			userListChanged = true;
		}
		//  
		if(userListChanged){
			oldList = [];
			userList.forEach(function(user) {
				oldList = oldList.concat([user]);
			})
			/*console.log('We dont get here');
			console.log(oldList);*/
	        // emit new array
			userList$.onNext(userList);
		}
		//console.log('------------');
	}


	function messagePreview(data) {
		
		var options = {
			limit: 5,
			animate: {
				enter: 'animated fadeInRightBig',
				exit: 'animated flipOutX'
			},
			placement: {
				from: 'top',
				align: 'right'
			}
		};
		var message = data.message;
		var url = data.url;
		if(url === ''){
			url = 'https://www.easymarkets.com/eu';
		}else{
			url = 'https://www.easymarkets.com/eu' + url;
		}
		
		var title = data.title;
		//var type = 'client-notifications';
		var clientMessageTemplate = '<div data-notify="container" id="notification-container" class="col-xs-11 col-sm-8 col-md-5 col-lg-3 alert alert-{0} client-notifications" role="alert">' +
						'<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
						'<div class="time-logo-container">' + 
							'<div class="logo-container"></div>' +
							'<div class="time-container">'+ data.messageTime +'</div>' +
						'</div>' + 	
						'<div class="message-container">' + 
							 message  +
						'</div>';
					'</div>';

		var notification = $.notify(
			{
				title: title,
				message: message,
			},
			$.extend(
				options,
				{
					type: 'minimalist',
					delay: alertDuration,
					allow_dismiss: true,
					newest_on_top: true,
					template: clientMessageTemplate,
					onShown: function(){
						// Handle click event
						$(notification.$ele[0]).off('click.ClientMessage').on('click.ClientMessage', function(e) {
							e.stopPropagation();
							if(e.currentTarget === this){
								// Notification clicked
								//location.href = url;
								window.open(url);
							}
						});
					},
					onClose: function(){
						$(notification.$ele[0]).off('click.ClientMessage');
						$(notification.$ele[0]).find('.close').off('click.ClientMessage');
						// Check backlog
						if (notificationsBacklog.length > 0) {
							if(notificationsBacklog[0].alertType === 'client message'){
								messagePreview(notificationsBacklog[0]);
							}
							
							notificationsBacklog.shift();
						}
					},
					onClick: function(){
						console.log('we clicked the thing');
					}
				}
			)
		);
	};

	function updateSocketInfo(id){
		socketId = id;
	}

	return {
		init: init,
		show: show,
		hide: hide,
		updateUserStats: updateUserStats,
		updateReciptientStats: updateReciptientStats,
		messageSentConfirmation: messageSentConfirmation,
		messagePreview: messagePreview,
		updateSocketInfo: updateSocketInfo
	}
})();