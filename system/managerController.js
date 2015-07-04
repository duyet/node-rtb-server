'use strict';

var config = require('../config/config');
var BGateAgent = require('../helper/BgateAgent');
var PublisherAgent = require('../helper/Publisher');

exports.agent = function(req, res) {
	console.log("REQ: ["+ new Date() +"] Fetch Agent info from REST API");
	if (!req.query || !req.query.s || req.query.s != config.trigger_token || !BGateAgent) {
		return res.status(404).send("Not Found");
	}

	var agents = [];
	for (var i = 0; i < BGateAgent.agents.length; i++) {
		var current = BGateAgent.agents[i];
		//current.banner = current.banner.length;
		agents.push(current);
	}

	res.json(agents);
};

exports.agent_all = function(req, res) {
	if (!req.query || !req.query.s || req.query.s != config.trigger_token || !BGateAgent) {
		return res.status(404).send("Not Found");
	}

	res.json(BGateAgent.agents);
};

exports.banner = function(req, res) {
	console.log("REQ: ["+ new Date() +"] Fetch Banner info from REST API");
	if (!req.query || !req.query.s || req.query.s != config.trigger_token || !BGateAgent) {
		return res.status(404).send("Not Found");
	}

	var banners = [];
	for (var i = 0; i < BGateAgent.agents.length; i++) {
		var current = BGateAgent.agents[i];
		for (var j = 0; j < current.banner.length; j++) {
			var current_banner = current.banner[j];
			banners.push({
				user_id: current_banner.UserID,
				banner_id: current_banner.AdCampaignBannerPreviewID,
				banner_name: current_banner.Name,
				campain_id: current_banner.AdCampaignPreviewID,
				IABSize: current_banner.IABSize,
				BidAmount: current_banner.BidAmount,
				BidsCounter: current_banner.BidsCounter,
				ImpressionsCounter: current_banner.ImpressionsCounter,
				AdUrl: current_banner.AdUrl,
			});
		}
		
	}

	res.json(banners);
};

exports.publisher = function(req, res) {
	console.log("REQ: ["+ new Date() +"] Fetch Agent info from REST API");
	if (!req.query || !req.query.s || req.query.s != config.trigger_token || !PublisherAgent) {
		return res.status(404).send("Not Found");
	}

	res.json(PublisherAgent.data);
};