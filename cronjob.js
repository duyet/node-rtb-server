var sys = require('sys')
var exec = require('child_process').exec;
var fs = require('fs');

var rootPath = __dirname;
var logPath = __dirname + '/logs/cronjob.log';

console.log("Started cronjob server.");
function puts(error, stdout, stderr) {
	// console.log('stdout: ' + stdout);
	console.log('stderr: ' + stderr);
	if (error !== null) console.log('exec error: ' + error);
}

var syncBannerEvery = 10 * 60 * 1000; // 2 min
var syncBanner = setInterval(function() {
	run(rootPath + "/cronjob/sync-banner-counter.js");
}, syncBannerEvery);

var bannerDailyTrackerEvery = 24 * 60 * 60 * 1000; // 24 hour
var bannerDailyTracker = setInterval(function() {
	run(rootPath + "/cronjob/banner-daily-tracker.js");
}, bannerDailyTrackerEvery);

var adzoneDailyTrackerEvery = 24 * 60 * 60 * 1000; // 24 hour
var adzoneDailyTracker = setInterval(function() {
	run(rootPath + "/cronjob/adzone-daily-tracker.js");
}, adzoneDailyTrackerEvery);

var internalTransactionEvery = 7 * 24 * 60 * 60 * 1000; // 7 days
var internalTransaction = setInterval(function() {
	run(rootPath + "/cronjob/internal-transaction-monthly.js");
}, internalTransactionEvery);

var run = function(path) {
	var message = ("["+ new Date() +"]: Cronjob ", path);
	fs.appendFile(logPath, message + "\n", function (err) {});
	console.log(message);

	exec("node "+ path, puts);
}