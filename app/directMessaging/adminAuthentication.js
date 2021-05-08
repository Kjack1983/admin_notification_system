"use strict";
const parameters = require('../parameters');
const ActiveDirectory = require('activedirectory');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const Admin = require('../../models/admin');

module.exports = (directMessaging) => {

	const verifyTokenAdminUser = async (token) => {
		return new Promise((resolve, reject) => {
			jwt.verify(token, config.jwtSecret, (err, adminData) => {
				if (err || !adminData) {
					reject(err);
				} else {
					Admin.findOne({ _id: adminData.id }, (err, adminUser) => {
						if (err || !adminUser) {
							reject(err);
						}
						else {

							const { _id,  username, role } = adminUser;

							// add expiry time to response
							resolve({
								id: _id,
								username: username,
								role: role,
								tokenData: adminData
							});
						}
					});
				}
			})
		});
	}

	// Mobile App Api methods
	directMessaging.addHttpInEvent({
		url: '/admin/auth/status',
		name: 'adminStatus',
		handler: async (req, res) => {
			if (req.headers && req.headers.token) {

				// Check the token
				try {
					const isVerifiedAdmin = await verifyTokenAdminUser(req.headers.token);
					let { username, tokenData } = isVerifiedAdmin;

					if (username && tokenData) {
						return res.send({
							auth: true,
							[parameters.admin.ACCESS]: 'allowed',
							[parameters.admin.USERNAME]: req.session[parameters.admin.USERNAME],
							[parameters.admin.TOKEN]: req.headers.token
						});
					}
					else {
						throw new Error('forbidden');
					}
				} catch (err) {
					console.error(err);
					return res.send({
						auth: false,
						'access': 'forbiden'
					});
				}
			} else {
				res.send({
					auth: false,
					'access': 'forbiden'
				});
			}
		},
		method: 'get'
	})

	directMessaging.addHttpInEvent({
		url: '/admin/auth/admins',
		name: 'adminsList',
		handler: function (req, res) {
			if (req.headers && req.headers.token) {
				// Check the token
				console.log('Admin Management: Requesting admins list', req.headers.token);
				jwt.verify(req.headers.token, config.jwtSecret, (err, admin) => {
					if (err) {
						return res.send({
							auth: false,
							'access': 'forbiden'
						});
					}

					Admin.find({}, (err, admins) => {
						return res.send({
							auth: true,
							admins: admins
						});
					})
				})

			} else {
				res.send({
					auth: false,
					'access': 'forbiden'
				});
			}
		},
		method: 'get'
	})

	/**
	 * Refresh jwt access token.
	 *
	 * @param { object } adminId
	 */
	const generateAccessToken = (adminId) => {
		return jwt.sign({id: adminId}, config.jwtSecret, {
			expiresIn: config.jwtExpirationTime
		})
	}

	/**
	 * Refresh jwt refresh token.
	 *
	 * @param { object } adminId
	 */
	const generateRefreshToken = (adminId) => {
		return jwt.sign({id: adminId}, config.jwtRefreshToken, {
			expiresIn: config.jwtExpirationTime * 2
		})
	}

	let sessionExpiryCallbacks = [];

	/**
	 * Decode token and set a timer for emitted message to be sent.
	 *
	 * @param { string } token 
	 */
	const setSessionExpiryTimer = (token) => {

		const { id, exp, iat } = jwt.decode(token);

		// Expiration time - current time.
		const remainingTime = exp - iat;

		// Set 1 minute before expiration in milliseconds.
		const msgRemainingTime = (remainingTime - 60) * 1000;

		setTimeout(() => {
			sessionExpiryCallbacks.filter(session => session.id.toString() === id).forEach(session => {
				session.callback();
			});
		}, msgRemainingTime);

	}

	/**
	 * Store Sessions on admin connect.
	 *
	 * @param { string } adminId 
	 * @param { string } socketId 
	 * @param { function } callback 
	 */
	const onSessionWillExpire = (adminId, socketId, callback) => {
		if (adminId && typeof callback === 'function') {
			sessionExpiryCallbacks.push({id: adminId, socket: socketId, callback: callback});
		}
	}

	/**
	 * Remove all session connection that do not match the socketId.
	 * Mainly used on disconnect socket connection.
	 * 
	 * @param { string } socketId 
	 */
	const removeSessionWillExpire = (socketId) => {
		sessionExpiryCallbacks = sessionExpiryCallbacks.filter(session => {
			return session.socket !== socketId;
		})
	}

	directMessaging.addHttpInEvent({
		name: 'adminLogin',
		data: [
			[parameters.admin.USERNAME],
			[parameters.admin.PASSWORD]
		],
		handler: function (req, res, data) {
			const { username, password } = data;

			Admin.findOne({ username: username }, (err, admin) => {
				if (err) return res.status(500).send('Error on the server');
				if (!admin) return res.status(404).send('No user found');

				var passwordValid = bcrypt.compareSync(password, admin.password);

				if (!passwordValid) return res.status(401).send('Username and password are not recognized');
				const token = generateAccessToken(admin._id);
				const refreshToken = generateRefreshToken(admin._id);

				// set timer on login.
				setSessionExpiryTimer(token);

				let response = {
					auth: true,
					token: token,
					refreshToken: refreshToken,
					username,
					role: admin.role
				}

				res.status(200).json(response);
			})
		},
		method: 'post',
		url: '/admin/auth/login',
	})

	/**
	 * Extend jwt token through refresh token which never expires.
	 */
	directMessaging.addHttpInEvent({
		name: 'refreshtoken',
		data: [
			[parameters.admin.REFRESHTOKEN]
		],
		handler: function (req, res, next) {
			let refreshToken = req.body.refreshtoken;

			jwt.verify(refreshToken, config.jwtRefreshToken, (err, adminData) => {
				if(err || !adminData) return res.send({ auth: false, 'access': 'forbiden' });
				
				Admin.findOne({ _id: adminData.id }, (err, admin) => {
					if (err) return res.status(500).send('Error on the server');
					if (!admin) return res.status(404).send('No user found');

					// reset jwt access token and refresh token.
					const token = generateAccessToken(admin._id);
					refreshToken = generateRefreshToken(admin._id);

					// set timer on refresh token.
					setSessionExpiryTimer(token);

					return res.send({
						auth: true,
						[parameters.admin.ACCESS]: 'allowed',
						[parameters.admin.TOKEN]: token,
						refreshToken: refreshToken,
						[parameters.admin.USERNAME]: admin.username,
						role: admin.role
					});
				});
			});
		},
		method: 'post',
		url: '/admin/auth/refreshtoken',
	})

	directMessaging.addHttpInEvent({
		name: 'adminLogout',
		data: [
			[parameters.admin.TOKEN]
		],
		handler: function (req, res, data) {
			const { id } = jwt.decode(data.token);

			// @todo [ioannis] check how to destroy jwt.
			// jwt.destroy(data.token);

			req.session.destroy(function (err) {
				res.send('logout');
			})
		},
		url: '/admin/auth/logout',
		method: 'post'
	})

	directMessaging.addHttpInEvent({
		url: '/admin/auth/register',
		name: 'adminRegister',
		handler: function (data) {
			if (!data.password || !data.username || !data.token) {
				console.log('Admin Management: Request to add the user is not valid.');
				return;
			} else {
				jwt.verify(data.token, config.jwtSecret, (err, admin) => {
					if (err) {
						console.log('Admin Management: Add new admin request is not authenticated.');
						return;
					}
					console.log('Admin Management: Registering new admin', data.username);

					var hashedPassword = bcrypt.hashSync(data.password, 8);

					Admin.create({
						username: data.username,
						password: hashedPassword,
						role: data.role.toLowerCase()
					});

				})
			}
		},
		method: 'post',
		distributed: true
	})


	return {
		verifyTokenAdminUser,
		onSessionWillExpire,
		removeSessionWillExpire
	}
}