"use strict";
const async = require('async');
const parameters = require('../parameters');
const moment = require('moment');
const reportModels = require('../../models/sendReport');
const SendReport = reportModels.SendReport;
const RecipientSnapshot = reportModels.RecipientSnapshot;

const listReports = (query, options) => {
	return new Promise((resolve, reject) => {

		SendReport.find(query, null, options).exec()
		.then(docs => {

			let reports = [];

			if (docs && docs.length) {

				let reportIdList = [];

				docs.forEach(doc => {

					let report = {};

					// Add Basic
					report.id = doc.messageId;
					report.username = doc.username;
					report.time = doc.time;
					report.type = doc.type;

					reportIdList.push(doc.messageId);

					// Add Messages
					report.languages = [];
					report.messages = {};

					// Add notification state
					report.states = {};

					// Extract only messages actually sent
					Object.keys(doc.messages).map(type => {

						let messages = {};
						let messageFound = false;
						let curr = doc.messages[type];

						if (curr.text) {

							Object.keys(curr.text).map(lang => {
								if (curr.text[lang]) {

									messageFound = true;

									if (!report.languages.includes(lang)) {
										report.languages.push(lang);
									}

									messages[lang] = {
										title: curr.title[lang],
										text: curr.text[lang],
										action: curr.action[lang]
									};
								}
							});
						}

						if (messageFound) {
							report.messages[type] = messages;

							report.states[type] = Object.values(parameters.state).reduce((acc, curr) => {
								acc[curr] = 0;
								return acc;
							}, {});
						}
					});

					reports.push(report);
				});
			}

			resolve(reports);
		})
		.catch(err => {
			reject(err);
		});
	});
};

module.exports = (reporting, usersManagement, messagingSettings) => {

	reporting.addHttpInEvent({
		name: 'reportOptions',
		url: '/api/reporting/options',
		data: [
			parameters.admin.USERNAME,
		],
		handler: (req, res, data) => {

			// @todo - add user / session check before response

			let response = {};

			let senders = new Promise((resolve, reject) => {

				SendReport.distinct('username', (err, result) => {

					if (err) {
						reject(err);
						return;
					}

					resolve(result);
				});
			});

			let types = new Promise((resolve, reject) => {

				SendReport.distinct('type', (err, result) => {

					if (err) {
						reject(err);
						return;
					}

					resolve(result);
				});
			});

			Promise.all([senders, types]).then(values => {

				const [ senders = [], types = [] ] = values;

				response.senders = (Array.isArray(senders) ? senders : []);
				response.types = (Array.isArray(types) ? types : []);

				res.send(response);
			});
		},
		method: 'post'
	});

	reporting.addSocketInEvent({
		name: 'listReports',
		data: [
			parameters.admin.USERNAME,
			parameters.messageChannels.SOCKET_ID
		],
		handler: (data) => {

			let io = reporting.getSocketsConnection();
			const socketId = data[parameters.messageChannels.SOCKET_ID];

			// Build query from data
			let query = {
				type: { $in: data.reportType }
			};

			if (data.restrictToUser) {
				query.username = data.username;
			}

			// Build options from data
			let options = {
				limit: 10,
				sort: { 'time': -1 },
				lean: true
			};

			listReports(query, options).then(reports => {

				io.sockets.in(socketId).emit('listReports', {name: data.name, reports: reports});

				async.parallel(reports.map(report => {
					return (callback) => {

						const id = report.id;
						const data = {...report};

						let states = {...data.states};

						RecipientSnapshot.find({
							messageId: id
						}, {
							type: true,
							status: true,
							interactions: true,
						}).lean().cursor().on('data', (recipient) => {

							const type = recipient.type;
							const state = recipient.status.state;

							// Aggregate recipient states
							if (type && states.hasOwnProperty(type)) {
								states[type][state] = (states[type][state] + 1);
							}

						}).on('end', () => {

							io.sockets.in(socketId).emit('updateRecipientStats', {name: data.name, data: {
								reportId: id,
								states: states
							}});

							callback(null, {
								reportId: id,
								states: states,
							});

						}).on('error', (err) => {
							callback(err);
						});
					};
				}));

			}).catch(err => {

				console.error('Reporting Error: failed to list reports');
				io.sockets.in(socketId).emit('listReports', {name: data.name, reports: []});

			});
		}
	});
}
