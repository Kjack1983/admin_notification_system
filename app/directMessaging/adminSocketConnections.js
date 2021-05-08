"use strict";
const parameters = require('../parameters');
module.exports = (directMessaging, usersManagement, adminManagement, messagingSettings) => {

	const adminAuth = require('./adminAuthentication')(directMessaging);

	directMessaging.addSocketInEvent({
		name: 'adminConnect',
		data: [
			parameters.admin.USERNAME,
			parameters.admin.TOKEN,
			parameters.messageChannels.SOCKET_ID
		],
		handler: async (data) => {

			const socketId = data[parameters.messageChannels.SOCKET_ID];

			const adminUser = await adminAuth.verifyTokenAdminUser(data.token, true);

			let user;
			const username = data[parameters.admin.USERNAME];

			const userModel = adminManagement.getUserModel();

			let users = adminManagement.getUsers();

			users[socketId] = Object.assign({}, userModel, data);

			const { tokenData } = adminUser;
			user = { ...users[socketId], tokenData };

			user[parameters.messageChannels.SOCKETS].forEach(socket => {
				socket[parameters.messageChannels.SOCKET_ACTIVE] = false;
			});

			let sockets = [];

			sockets = user[parameters.messageChannels.SOCKETS].filter(socket => socket[parameters.messageChannels.SOCKET_ID] !== data[parameters.messageChannels.SOCKET_ID]);

			sockets.push({
				[parameters.messageChannels.SOCKET_ID]: socketId,
				[parameters.messageChannels.SOCKET_ACTIVE]: true,
				[parameters.admin.USERNAME]: data[parameters.admin.USERNAME]
			});

			let io = directMessaging.getSocketsConnection();
			let socket = adminManagement.getSocket(data[parameters.messageChannels.SOCKET_ID], io);

			user[parameters.messageChannels.SOCKETS] = [...sockets];

			if (socket) {
				socket[parameters.admin.USERNAME] = data[parameters.admin.USERNAME];
				socket.join(parameters.admin.ADMIN);
				socket.join(socketId);
				socket.join(data[parameters.admin.USERNAME]);

				usersManagement.getUsersStats().then(userStats => {
					socket.emit('usersStats', userStats);
				})

				adminAuth.onSessionWillExpire(adminUser.id, socketId, () => {
					socket.emit('adminTokenWillExpire', 'Your session is about to expire in 1 minute please refresh');
				});
			}
		},
		distributed: true
	})

	directMessaging.addSocketInEvent({
		name: 'scheduledListJobs',
		data: [
			parameters.messageChannels.SOCKET_ID
		],
		handler: async (data) => {
			let io = directMessaging.getSocketsConnection();
			const socketId = data[parameters.messageChannels.SOCKET_ID];
			let socket = adminManagement.getSocket(socketId, io);

			let jobs = await directMessaging.getQueueJobList('schedulingQueue');

			if (jobs) {
				socket.emit('scheduledListJobs', jobs);
			}
		}
	});

	directMessaging.addSocketInEvent({
		name: 'adminPushRegister',
		data: [
			parameters.admin.USERNAME,
			parameters.messageChannels.TOKEN,
			parameters.messageChannels.SOCKET_ID
		],
		handler: function (data) {
			let user = adminManagement.getUser(data[parameters.messageChannels.SOCKET_ID]);
			if (!user) return;
			user[parameters.messageChannels.TOKEN] = data[parameters.messageChannels.TOKEN];
		},
		distributed: true
	});



	directMessaging.addRedisInEvent({
		name: 'broadcastUserStats',
		data: [
			'event'
		],
		handler: (data) => {

			const io = directMessaging.getSocketsConnection();
			const adminConnections = io.sockets.adapter.rooms['admin'];

			// Broadcast user update if there are admins connected
			if (adminConnections && adminConnections.length) {

				// @todo - broadcasting update causes refresh, handle properly
				/*
				usersManagement.getUsersStats().then(userStats => {
					io.sockets.in('admin').emit('usersStats', userStats);
				});
				*/
			}
		},
	});

	directMessaging.addHttpInEvent({
		name: 'adminStats',
		url: '/api/fetch/admins',
		handler: function (req, res) {
			res.send(adminManagement.getUsers());
		},
		method: 'get',
	});

	// Closing socket connection
	directMessaging.addSocketInEvent({
		name: 'disconnect',
		data: [parameters.messageChannels.SOCKET_ID],
		handler: function (data) {
			adminAuth.removeSessionWillExpire(data[parameters.messageChannels.SOCKET_ID]);
			adminManagement.removeUser(data[parameters.messageChannels.SOCKET_ID]);
		},
		distributed: true
	});




}
