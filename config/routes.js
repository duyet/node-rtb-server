'use strict';

var config = require('./config');
var routePath = config.routes;

module.exports = function(app) {
	var man = require('../system/manController.js');
	var bids = require('../system/bidsController.js');
	var bidrequest = require('../system/bidrequestController.js');
	var impTracker = require('../system/impTrackerController.js');
	var clickTracker = require('../system/clickTrackerController.js');
	var winNotice = require('../system/winNoticeController.js');
	var bannerRender = require('../system/bannerRenderController.js');
	var ping = require('../system/pingController.js');
	var triggerSystem = require('../system/triggerController.js');
	var manager = require('../system/managerController.js');
	var sync = require('../system/syncController.js');

	app.route('/').get(function(req, res) { res.send("Hi, what's up?"); });
	
	// Manual page 
	app.route(routePath.man)
		.get(man.index);

	// Bidding end point 
	app.route(routePath.bids)
		.get(bids.index)
		.post(bids.bids);

	// Imp tracker
	app.route(routePath.imp_tracker)
		.get(impTracker.tracker);

	// Click tracker
	app.route(routePath.click_tracker)
		.get(clickTracker.tracker);

	// Win notice
	app.route(routePath.win)
		.all(winNotice.index);

	// Banner render
	app.route(routePath.banner_render)
		.get(bannerRender.render);

	// Banner preview
	app.route(routePath.banner_preview)
		.get(bannerRender.preview);
	app.route(routePath.banner_generate_preview_link)
		.all(bannerRender.generate_preview_link);

	// Ping
	app.route(routePath.ping)
		.all(ping.pingme);

	// Manager agent 
	app.route(routePath.manager_agent)
		.get(manager.agent);
	app.route(routePath.manager_agent + '/all')
		.get(manager.agent_all);

	// Manager banner
	app.route(routePath.manager_banner)
		.get(manager.banner);

	// =======================================
	// TRIGGER
	// =======================================
	// Reset Agent
	app.route(routePath.trigger_reset_agent)
		.get(triggerSystem.trigger_reset_agent);
	
	// Reset Publisher
	app.route(routePath.trigger_reset_publisher)
		.get(triggerSystem.trigger_reset_publisher);
	
	// Reset All
	app.route(routePath.trigger_reset_all)
		.get(triggerSystem.trigger_reset_all);

	// ========================================
	// SYNC
	// ========================================
	// Sync banenr 
	app.route(routePath.sync_route)
		.get(sync.sync);

	// Sync banenr 
	app.route(routePath.sync_dailytracker)
		.get(sync.dailytracker);	

	if (config.debug) {
		var debugController = require('../system/debugController.js');
		app.route('/debug').get(debugController.main);
		app.route('/debug/agent').get(debugController.agent);
		app.route('/debug/banner').get(debugController.banner);
	}
};
