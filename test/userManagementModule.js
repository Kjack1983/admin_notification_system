"use strict";
const usersManagement = require('../lib/marketAlerts/usersManagement');
const parametersList = require('../lib/marketAlerts/parameterList').parameterList;
const expect = require('chai').expect;
const should = require('chai').should();
const assert = require('chai').assert;



describe('User management module', function() {
	describe('Logged out user browser connect', function(){
			
		it('Should have socket id, user logged in, machine hash, language parameters', function() {
			
			usersManagement.loggedOutUserBrowserConnect().should.equal(-1);
			usersManagement.loggedOutUserBrowserConnect({}).should.equal(-1);
			usersManagement.loggedOutUserBrowserConnect({
				[parametersList.MACHINE_HASH]: '1233',
				[parametersList.SOCKET_ID]: '1233',
				[parametersList.LANGUAGE]: 'en',
				[parametersList.USER_LOGGED_IN]: false,
			}).should.equal('1233');
			
		});
		
		it('Logged out user should be logged out', function() {
			usersManagement.loggedOutUserBrowserConnect({
				[parametersList.MACHINE_HASH]: '1233',
				[parametersList.SOCKET_ID]: '1233',
				[parametersList.LANGUAGE]: 'en',
				[parametersList.USER_LOGGED_IN]: true,
			}).should.equal(-1);
		});
		it('Should check if machine already exist with logged out users', function() {
			
		});
		it('Should overide existing logged out user on the same machine', function() {
			
		});
		it('Should check if machine already exist with logged in users', function() {
			
		});
		it('Should save browser info to the users object', function() {
			
		});
	})

})

