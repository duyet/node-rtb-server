var sys = require('sys')
var exec = require('child_process').exec;
var fs = require('fs');

var rootPath = __dirname;
var logPath = __dirname + '/logs/cronjob.log';

console.log("Started cronjob server.");
function puts(error, stdout, stderr) {
	console.log('stdout: ' + stdout);
	console.log('stderr: ' + stderr);
	if (error !== null) console.log('exec error: ' + error);
}

var syncBannerEvery = 2 * 60 * 1000; // 2 min
var syncBanner = setInterval(function() {
	run(rootPath + "/cronjob/sync-banner-counter.js");
}, syncBannerEvery);

var bannerAdzoneDailyTrackerEvery = 24 * 60 * 60 * 1000; // 24 hour
var bannerAdzoneDailyTracker = setInterval(function() {
	run(rootPath + "/cronjob/banner-adzone-daily-tracker.js");
}, bannerAdzoneDailyTrackerEvery);


var run = function(path) {
	var message = ("["+ new Date() +"]: Cronjob ", path);
	fs.appendFile(logPath, message + "\n", function (err) {});
	console.log(message);

	exec("node "+ path, puts);
}