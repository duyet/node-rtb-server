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

var min 	= 1000 * 60;
var hour 	= 1000 * 60 * 60; 

var syncBannerEvery = 5 * min; // 2 min
var syncBanner = setInterval(function() {
	run(rootPath + "/cronjob/sync-banner-counter.js");
}, syncBannerEvery);

var bannerDailyTrackerEvery = 5 * min; // 24 * hour; // 24 hour
var bannerDailyTracker = setInterval(function() {
	run(rootPath + "/cronjob/banner-daily-tracker.js");
}, bannerDailyTrackerEvery);

var adzoneDailyTrackerEvery = 5 * min; // 24 * hour; // 24 hour
var adzoneDailyTracker = setInterval(function() {
	run(rootPath + "/cronjob/adzone-daily-tracker.js");
}, adzoneDailyTrackerEvery);

var internalTransactionEvery = 1 * 24 * hour; // every days
var internalTransaction = setInterval(function() {
	run(rootPath + "/cronjob/internal-transaction-daily.js");
}, internalTransactionEvery);

var run = function(path) {
	var message = ("["+ new Date() +"]: Cronjob ", path);
	fs.appendFile(logPath, message + "\n", function (err) {});
	console.log(message);

	exec("node "+ path, puts);
}