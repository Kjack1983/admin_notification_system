"use strict";
const parameters = require('../parameters');
const async = require('async');
const R = require('ramda');

module.exports = (directMessaging, usersManagement, messagingSettings) => {

	// Segmentation handler
	const segmentation = require('../usersManagement/segmentation')();

	directMessaging.addSocketInEvent({
		name: 'recipientStats',
		data: [
			parameters.admin.USERNAME,
			parameters.admin.FILTERS,
			parameters.messageChannels.SOCKET_ID
		],
		handler: function(data) {

			let io = directMessaging.getSocketsConnection();
			const socketId = data[parameters.messageChannels.SOCKET_ID];

			const usersStats = usersManagement.usersFiltering.getUsersList({
				filters: data.filters,
				messages: data.messages
			});

			io.sockets.in(socketId).emit(parameters.admin.RECIPIENT_STATS, usersStats);
		}
	});

	/**
	 * Recipient ID Filter
	 */
	directMessaging.addSocketInEvent({
		name: 'recipientIds',
		data: [
			parameters.admin.USERNAME,
			parameters.admin.FILTERS,
			parameters.messageChannels.SOCKET_ID
		],
		handler: function(data) {

			let io = directMessaging.getSocketsConnection();
			const socketId = data[parameters.messageChannels.SOCKET_ID];

			const usersStats = usersManagement.usersFiltering.filterUserIds({
				filters: data.filters,
				messages: data.messages
			});

			io.sockets.in(socketId).emit(parameters.admin.RECIPIENT_IDS, usersStats);
		}
	});

	/**
	 * Device Notification Filter Options
	 */
	directMessaging.addSocketInEvent({
		name: 'notificationFilterOptions',
		data: [
			parameters.admin.USERNAME,
			parameters.admin.FILTERS,
			parameters.messageChannels.SOCKET_ID
		],
		handler: function(data) {

			let io = directMessaging.getSocketsConnection();
			const socketId = data[parameters.messageChannels.SOCKET_ID];

			const options = usersManagement.usersFiltering.getNotificationFilters({
				filters: data.filters,
				messages: data.messages
			});

			io.sockets.in(socketId).emit('notificationFilterOptions', options);
		}
	});

	/**
	 * Fetch available easymarkets filters
	 *
	 * Returns list of available easymarkets filters to use in admin
	 * for client filtering.
	 *
	 */
	directMessaging.addHttpInEvent({
		name: 'getEasymarketsClientFilters',
		url: '/api/settings/emClients',
		data: [
		],
		handler: function(req, res) {
			segmentation.fetchEasymarketsFilters().then(filters => {
				res.send(filters);
			});
		},
		method: 'get',
	});

	/**
	 * Fetch easymarkets clients using available filters.
	 *
	 * Returns list of available easymarkets clients from admin
	 * based on available filters.
	 *
	 */
	directMessaging.addSocketInEvent({
		name: 'fetchEasymarketsClients',
		data: [
			parameters.admin.CLIENT_FILTERS,
			parameters.admin.DEVICE_LANGUAGES,
			parameters.messageChannels.SOCKET_ID
		],
		handler: function(data) {

			let io = directMessaging.getSocketsConnection();
			const socketId = data[parameters.messageChannels.SOCKET_ID];

			try {

				const clientFilters = data[parameters.admin.CLIENT_FILTERS];

				// Reject if missing filters
				if (!clientFilters || !clientFilters.rules || !clientFilters.rules.length) {
					throw new Error('Missing Filters');
				}

				// Fetch client ids
				else {

					let clientsFound = 0;

					// Fetch notifications client list
					const clientList = usersManagement.usersFiltering.getClientIds({
						deviceLanguages: data[parameters.admin.DEVICE_LANGUAGES]
					});

					console.log(`EM Client Filter Process: ${clientList.length} Clients`);

					const splitClients = R.splitEvery(5000, clientList).map(clientGroup => {
						return async () => {

							const clients = await segmentation.fetchEasymarketsClients(clientFilters, [...clientGroup]);

							if (clients.Message || !Array.isArray(clients)) {
								throw new Error(clients.Message || 'Unknown error');
							}

							// Update total found
							clientsFound = clientsFound + clients.length;

							// Update running total
							io.sockets.in(socketId).emit('clientListUpdate', {
								clients: clientsFound
							});

							console.log(`EM Client Filter Processing (${clientGroup.length}): ${clients.length}`);
							return clients;
						}
					});

					// Send in series
					async.parallelLimit(splitClients, 4, (error, result) => {

						// Update error state
						if (error) {
							console.error('EM Client Filter Error:', error.message);
							io.sockets.in(socketId).emit('clientListUpdate', {
								error: error.message
							});
						}

						// Update complete client list
						else {

							const clients = result.reduce((acc, curr) => {
								acc = [...acc, ...curr];
								return acc;
							}, []);

							console.log(`EM Client Filter Success: ${clients.length}/${clientList.length}`);

							// Send client list
							io.sockets.in(socketId).emit('clientListUpdate', {
								clients: clients
							});
						}
					});
				}

			} catch (error) {

				console.error('EM Client Filter Error:', error.message);

				// Update error state
				io.sockets.in(socketId).emit('clientListUpdate', {
					error: error.message
				});
			}
		}
	});
}
