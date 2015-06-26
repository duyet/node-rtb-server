'use strict';

var _ = require('lodash');

var BGateAgent = require('../helper/BgateAgent.js');
var tracker = require('pixel-tracker');
var ClickLog = require('../config/mongodb').ClickLog;

/*
	http://ptnhttt.uit.edu.vn:8899/click_tracker?type=click_tracker&pid=9&
	crid=9&cid=undefined&PublisherAdZoneID=12&impId=bgate_1435079460115&page=na
	&width=120&height=600&LandingPageTLD=http://lvduit.com&js=true
*/
module.exports.tracker = function(req, res) {
	console.log("REQUEST: ["+ new Date() +"] Click Tracker ==================");
	console.time("TIMER: Update click tracker data");

	if (!req.query) return res.status(404).send(404);
	if (!BGateAgent || !BGateAgent.agents) return res.status(404).send();

	var clickData = {};

	// Creative ID (AdCampaignBannerID) - required 
	if (!req.query.crid || req.query.crid == 0) {
		console.error("ERR: ["+ new Date() +"] Click tracker - crid error or not defined.");
		return res.status(404).send();
	}
	clickData.AdCampaignBannerID = parseInt(req.query.crid) || 0;

	// impId - required
	if (!req.query.impId) {
		console.error("ERR: ["+ new Date() +"] Click tracker - impId error or not defined.");
		return res.status(404).send();
	}
	clickData.impId = req.query.impId || '';

	// Adzone ID - required
	if (!req.query.PublisherAdZoneID) {
		console.error("ERR: ["+ new Date() +"] Click tracker - PublisherAdZoneID error or not defined.");
		return res.status(404).send();
	}
	clickData.PublisherAdZoneID = req.query.PublisherAdZoneID;

	// Target URL - required
	if (!req.query.LandingPageTLD) {
		console.error("ERR: ["+ new Date() +"] Click tracker - LandingPageTLD error or not found.");
		return res.status(404).send();
	}
	clickData.TargetURL = req.query.LandingPageTLD || '';

	// User IP
	clickData.UserIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

	// User Country - TODO: Get user country
	clickData.Country = "";

	// Prices
	clickData.Price = 0.0;

	// Created time
	clickData.created = new Date();

	// Update full url 
	var regex = /^http\:\/\/.*/;
	if (!regex.test(clickData.TargetURL)) clickData.TargetURL = 'http://' + clickData.TargetURL;

	// Call update banner click couter
	new ClickLog(clickData).save(function(err, model) {
		if (err) console.error(err);
		else console.log('[' + new Date() + "] Saved ClickLog id " + model.id + ' {'+ clickData.PublisherAdZoneID +', ' + clickData.AdCampaignBannerID + ', ' + clickData.UserIP +'}');
	});

	// Update counter in Bgate Agent memory
	updateBannerClickCounterInAgent(clickData.AdCampaignBannerID);
	
	console.info("INFO: ["+ new Date() +"] Redirect to " + clickData.TargetURL);
	res.redirect(clickData.TargetURL);

	console.timeEnd("TIMER: Update click tracker data");
}

var updateBannerClickCounterInAgent = function(bannerId) {
	if (!BGateAgent && !BGateAgent.agents) return false;

	BGateAgent.agents.forEach(function(agent) {
		if (!agent.banner) return false;
		for (var i = 0; i < agent.banner.length; i++) {
			if (agent.banner[i].AdCampaignBannerPreviewID == bannerId) {
				agent.banner[i].BidsCounter++;
				return true;
			}
		}
	});

	return true;
}