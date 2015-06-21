'use strict';

var config = require('./config');
var routePath = config.routes;

module.exports = function(app) {
	var bids = require('../system/bidsController.js');
	var bidrequest = require('../system/bidrequestController.js');
	var impTracker = require('../system/impTrackerController.js');
	var clickTracker = require('../system/clickTrackerController.js');
	var bannerRender = require('../system/bannerRenderController.js');
	var ping = require('../system/pingController.js');

	app.route('/').get(function(req, res) { res.send("Hi, bye!"); });
	
	// Bidding end point 
	app.route(routePath.bids)
		.get(bids.index)
		.post(bids.bids);

	// Imp tracker
	app.route(routePath.imptracker)
		.get(impTracker.tracker);

	// Click tracker
	app.route(routePath.click_tracker)
		.get(clickTracker.tracker);

	// Banner render
	app.route(routePath.banner_render)
		.get(bannerRender.render);

	// Banner preview
	app.route(routePath.banner_preview)
		.get(bannerRender.preview);
	app.route(routePath.banner_generate_preview_link)
		.all(bannerRender.generate_preview_link);

	app.route(routePath.ping)
		.all(ping.pingme);

	app.route(routePath.bidrequest)
		.get(bidrequest.generate);

	if (config.debug) {
		var debugController = require('../system/debugController.js');
		app.route('/debug').get(debugController.main);
		app.route('/debug/agent').get(debugController.agent);
		app.route('/debug/banner').get(debugController.banner);
	}
};
