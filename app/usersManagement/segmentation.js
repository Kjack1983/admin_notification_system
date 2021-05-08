"use strict";
/**
 * Segmentation helper
 */
const config = require('../config');
const apiUrl = config.segmentationApiUrl;
const apiKey = config.segmentationApiKey;

const fetch = require('node-fetch');
const crypto = require('crypto');

/**
 * Non Visible Filters
 *
 * Used in segmentation request but
 * not available to front end admin.
 *
 * @const {array} nonVisibleFilters
 */
const nonVisibleFilters = [
	{
		Name: 'User Id',
		DbName: 'UserId',
		DataType: 'Integer',
		DefaultValue: null,
		Values: null
	}
];

/**
 * Client Filter Object to Sql Query
 *
 * - Strings in single quotes: field = 'test'
 * - Multiple values with in: field in (1,2)
 * - Date comparison 'yyyy-MM-dd': field > '2020-01-23'
 * - Boolean True = 1, False = 0: field = 0
 * - Nullable column IS NOT NULL, IS NULL
 * - In case of defaultValue ISNULL(field, default) = value
 */
const clientFilterObjectToQuery = (data, filters) => {

	let query = '';

	// Recursively process rules
	if (data.combinator && data.rules.length) {
		query = '(' + data.rules.map(rule => {
			return clientFilterObjectToQuery(rule, filters);
		}).join(` ${data.combinator} `) + ')';
	}
	else {

		const filter = filters.find(filter => filter.DbName === data.field);

		if (filter) {

			let value = data.value;
			let operator = data.operator;
			let field = data.field;

			// Reset value is in single length array 
			if (Array.isArray(value) && value.length === 1) {
				value = value[0];
			}

			const filterType = filter.DataType.toLowerCase();
			const valueIsArray = Array.isArray(value);

			// Multi value select
			if (filterType === 'integer' && valueIsArray) {

				value = `(${value.join(',')})`;

				if (operator === '=') {
					operator = 'in';
				}
				else if (operator === '!=') {
					operator = 'not in';
				}
			}

			// Single value with default
			else if (filterType === 'integer' && filter.DefaultValue !== null) {
				field = `isnull(${field}, ${filter.DefaultValue})`;
			}

			// Date select (set qoutes)
			else if (filterType === 'date') {
				value = `'${value}'`;
			}

			// Join without value (operator is / is not null)
			if (['is null', 'is not null'].includes(operator)) {
				query = [
					field,
					operator
				].join(' ');
			}

			// Join with value
			else {
				query = [
					field,
					operator,
					value
				].join(' ');
			}
		}
	}

	return query;
};

module.exports = () => {

	const fetchEasymarketsFilters = async(data) => {
		return await fetch(apiUrl + 'getAvailableFields').then(res => res.json());
	};

	const fetchEasymarketsClients = async(data, clients = []) => {

		// Fetch Filter List
		const filters = await fetchEasymarketsFilters();

		// Inject notifications system client id list
		if (Array.isArray(clients) && clients.length) {
			data = {
				rules: [
					{ field: 'UserId', value: clients, operator: '=' },
					{ ...data }
				],
				combinator: 'and',
				not: false
			};
		}

		// Build Query
		const query = clientFilterObjectToQuery(data, [
			...filters,
			...nonVisibleFilters
		]);

		const iv = Buffer.alloc(16);
		const key = Buffer.from(apiKey);
		const cipher = crypto.createCipheriv("aes256", key, iv);
		const decipher = crypto.createDecipheriv("aes256", key, iv);

		let encrypted = cipher.update(query, "utf8", 'base64');
		encrypted += cipher.final("base64");

		/**
		 * Decrypt encrypted query
		let decrypted = decipher.update(encrypted, 'base64', 'utf8');
		decrypted += decipher.final('utf8');
		console.log(decrypted);
		*/

		return await fetch(apiUrl + 'GetMatchedUsers', {
			method: 'post',
			body: '=' + encodeURIComponent(encrypted),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
		}).then(res => res.json());
	}

	return {
		fetchEasymarketsFilters,
		fetchEasymarketsClients,
	}
};
