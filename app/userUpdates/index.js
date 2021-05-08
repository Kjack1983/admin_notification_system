"use strict";
const parameters = require('../parameters');
const _ = require('lodash');
const { logger } = require('../utils/winston.logger');

module.exports = function(webeyezRedis, usersManagement, messagingSettings){
	webeyezRedis.addRedisInEvent({
		name: 'UserSettingsChanged',
		data: [], 
		handler: function(data) {
			
			let userData = JSON.parse(data.Message);
            
            if(!data.UserId) return;
                
            let userID = data.UserId.toString();
            let marketAlertAllow = userData.GetMarketAlerts;
            let stopLossAlertAllow = userData.GetStopLossAlerts;
            let directMessageAllow = userData.GetDirectMessages;
			let notifyOnInstruments = userData.NotifyOnInstruments;
				
			logger.info(`Mobile Registration user ${userID} update using webeyez Redis: [marketAlertAllow, stopLossAlertAllow, notifyOnInstruments, directMessageAllow]`, marketAlertAllow, stopLossAlertAllow, notifyOnInstruments, directMessageAllow);
                
            let user = usersManagement.getUser(userID);
            
            if(_.isEmpty(user)) return;

            if(typeof marketAlertAllow !== 'undefined') {
	            user[parameters.user.MARKET_ALERT_ALLOW] = marketAlertAllow;
            }

            if(typeof stopLossAlertAllow !== 'undefined') {
	            user[parameters.user.STOPLOSS_ALERT_ALLOW] = stopLossAlertAllow;
            }
			
			if(typeof directMessageAllow !== 'undefined') {
				user[parameters.user.DIRECT_MESSAGE_ALLOW] = directMessageAllow;
			}

            if(typeof notifyOnInstruments !== 'undefined') {
	            user[parameters.user.MOBILE_PAIRS] = notifyOnInstruments.map(pair => {
					return pair.slice(0,3) + '/' + pair.slice(3, 6)
				});
            }
			
			usersManagement.setUsersData(user, userID, false, true);    

		} 
	})
	return {};
}