'use strict';

var config = require('./config.js');

module.exports = function(app) {
	var bids = require('../system/bidsController.js');
	var bidrequest = require('../system/bidrequestController.js');
	var impTracker = require('../system/impTrackerController.js');
	var clickTracker = require('../system/clickTrackerController.js');
	var bannerRender = require('../system/bannerRenderController.js');
	var ping = require('../system/pingController.js');

	app.route('/').get(function(req, res) { res.send("Hi, bye!"); });
	
	app.route('/' + config.bidsPath)
		.get(bids.index)
		.post(bids.bids);

	app.route('/' + config.impTrackerPath)
		.get(impTracker.tracker);

	app.route('/' + config.clickTrackerPath)
		.get(clickTracker.tracker);

	app.route('/' + config.bannerRenderPath)
		.get(bannerRender.render);

	app.route('/ping')
		.all(ping.pingme);

	app.route('/bidrequest')
		.get(bidrequest.generate);
};
