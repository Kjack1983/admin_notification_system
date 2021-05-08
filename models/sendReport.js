const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const Schema = mongoose.Schema;
const config = require('../app/config');

/**
 * Set Reporting DB connection
 */
const ReportConnection = config.mongo.reporting;

const ReportDb = mongoose.createConnection(ReportConnection.connection + ReportConnection.name, {
	useMongoClient: true,
});

const sendReportScema = new Schema({
	messageId: String,
	username: String,
	time: Date,
	type: String,
	ttl: Number,
	messages: {
		alert: Object,
		push: Object,
		mobile: Object
	},
	filters: Object,
	recipients: [{ type: Schema.Types.ObjectId, ref: 'RecipientSnapshot'}]
});

const recipientSnapshotSchema = new Schema({
	reportId: { type: Schema.Types.ObjectId, ref: 'SendReports' },
	messageId: String,
	type: String,
	status: {
		state: String,
		error: String,
	},
	interactions: Array,
	data: Object
});

const SendReport = ReportDb.model('SendReports', sendReportScema);
const RecipientSnapshot = ReportDb.model('RecipientSnapshot', recipientSnapshotSchema);

module.exports = {
	SendReport,
	RecipientSnapshot
}
