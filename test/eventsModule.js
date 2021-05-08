"use strict";

const expect = require('chai').expect;
const should = require('chai').should();
const assert = require('chai').assert;

const events = require('../lib/marketAlerts/events');

describe('Events module', function(){
	
		
	it('1. Checks getEvents function input', function() {
		events.getEvents('sck').length.should.equal(0);
		events.getEvents('sockets').length.should.equal(0);
		events.getEvents('routes').length.should.equal(0);
		events.getEvents().length.should.equal(0);
	});
	
	it('2. Checks addEvent inputs', function() {
		events.addEvent().should.equal(-1);
		events.addEvent('register', 'asasas').should.equal(-1);
		events.addEvent('register', 'asasas', 'dsds').should.equal(-1);
		events.addEvent('register', 'sockets', [1, 2, 4], function(){}).should.be.a('string');
		events.addEvent().should.equal(-1);
		events.addEvent().should.equal(-1);
		events.addEvent().should.equal(-1);
	});
	
	it('3. Checks if event exists before adding', function() {
		events.reset();

		events.addEvent('register', 'sockets', [1, 2, 4], function(){}).should.be.a('string');
		events.addEvent('register', 'sockets', [1, 2, 4], function(){}).should.equal(-1);
		events.getEvents('sockets').length.should.equal(1);
		events.addEvent('push.register', 'sockets', [1, 2, 4], function(){}).should.be.a('string');
		events.getEvents('sockets').length.should.equal(2);
	})

	it('4. Checks remove event logic', function() {
		events.reset();
		events.addEvent('register', 'sockets', [1, 2, 4], function(){}).should.be.a('string');
		events.addEvent('pushRegister', 'sockets', [1, 2, 4], function(){}).should.be.a('string');
		events.removeEvent();
		events.getEvents().length.should.equal(2);
		events.removeEvent('dssd');
		events.getEvents().length.should.equal(2);
		events.removeEvent('register');
		events.getEvents().length.should.equal(1);
		events.removeEvent('register');
		events.getEvents().length.should.equal(1);
		events.removeEvent('pushRegister');
		events.getEvents().length.should.equal(0);
		events.removeEvent('pushRegister');
		events.getEvents().length.should.equal(0);
	});

	it('5. Checks getEvents functionality', function() {
		events.reset();
		events.getEvents().length.should.equal(0);
		events.addEvent('register', 'sockets', [1, 2, 4], function(){});
		events.addEvent('register', 'sockets', [1, 2, 4], function(){});
		events.getEvents().length.should.equal(1);
		events.addEvent('pushRegister', 'sockets', [1, 2, 4], function(){});
		events.addEvent('registerUser', 'sockets', [1, 2, 4], function(){});
		events.addEvent('pushVisitor', 'sockets', [1, 2, 4], function(){});
		events.getEvents().length.should.equal(4);
		events.reset();
		events.getEvents().length.should.equal(0);
		events.addEvent('register', 'sockets', [1, 2, 4], function(){});
		events.addEvent('register', 'sockets', [1, 2, 4], function(){});
		events.getEvents().length.should.equal(1);
	})

	it('6. Check getEventNames functionality', function() {
		events.reset();
		events.addEvent('register', 'sockets', [1, 2, 4], function(){});
		events.getEventNames()['REGISTER'].should.equal('register');
		events.addEvent('register.user', 'sockets', [1, 2, 4], function(){});
		events.getEventNames()['REGISTER_USER'].should.equal('register.user');
		events.addEvent('register_visitor', 'sockets', [1, 2, 4], function(){});
		events.getEventNames()['REGISTER_VISITOR'].should.equal('register_visitor');
		events.addEvent('pushRegister', 'sockets', [1, 2, 4], function(){});
		events.getEventNames()['PUSH_REGISTER'].should.equal('pushRegister');
		

	})
	
});
