'use strict';

var BGateAgent = require('../helper/BgateAgent.js');

exports.main = function(req, res) {

}

exports.agent = function(req, res) {
	if (BGateAgent.agents) res.json(BGateAgent.agents);
	else res.json();
}

exports.banner = function(req, res) {
	if (!BGateAgent.agents) return res.json([]);

	var listBanner = [];
	BGateAgent.agents.forEach(function(agent) {
		if (!agent || !agent.banner) return false;
		agent.banner.forEach(function(banner) {
			listBanner.push(banner);
		});
	});

	return res.json(listBanner);
}
