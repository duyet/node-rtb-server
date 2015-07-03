'use strict';

var config = require('../config/config');

var BGateAgent = require('../helper/BgateAgent.js');
var tracker = require('pixel-tracker');
var ClickLog = require('../config/mongodb').ClickLog;
var BiddingMapLog = require('../config/mongodb').BiddingMapLog;
var AdvBanker = require('../config/mongodb').AdvBanker;
var Model = require('../config/db').Model;

var DemandCustomerInfo = Model.extend({
	tableName: 'DemandCustomerInfo',
	idAttribute: 'DemandCustomerInfoID'
});

// TODO: BGate chua chap nhan CPC, chua tinh Price & NetPrice cho CPC

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

	// TODO: Add prices
	clickData.Price = 0.0;
	clickData.NetPrice = 0.0;
	var banner = getBannerById(clickData.AdCampaignBannerID);
	if (!banner) {
		console.log("INFO: ["+ new Date() +"] Click tracker can not find info of creative " + clickData.AdCampaignBannerID);
	}
	
	if (banner.BidType == config.bid_type.CPC) {
		clickData.Price = banner.BidAmount;
		clickData.NetPrice = banner.BidAmount - banner.BidAmount * banner.CampaignMarkup;	
	}

	// Created time
	clickData.created = new Date();

	// Update full url 
	var regex = /^http\:\/\/.*/;
	if (!regex.test(clickData.TargetURL)) clickData.TargetURL = 'http://' + clickData.TargetURL;

	// Update counter in Bgate Agent memory
	updateClickCounterAndCurrentSpendInAgent(clickData);

	// Update Adv balance
	updateAgentCurrentSpend(clickData);

	// Call update banner click couter
	new ClickLog(clickData).save(function(err, model) {
		if (err) console.error(err);
		else console.log('[' + new Date() + "] Saved ClickLog id " + model.id + ' {'+ clickData.PublisherAdZoneID +', ' + clickData.AdCampaignBannerID + ', ' + clickData.UserIP +'}');
	});
	
	console.info("INFO: ["+ new Date() +"] Redirect to " + clickData.TargetURL);
	res.redirect(clickData.TargetURL);

	console.timeEnd("TIMER: Update click tracker data");
}

var updateClickCounterAndCurrentSpendInAgent = function(clickData) {
	if (!clickData || !clickData.AdCampaignBannerID) return false;
	if (!BGateAgent && !BGateAgent.agents) return false;

	var bannerId = clickData.AdCampaignBannerID;

	BGateAgent.agents.forEach(function(agent) {
		if (!agent.banner) return false;
		var campaignId = [];

		for (var i = 0; i < agent.banner.length; i++) {
			if (agent.banner[i].AdCampaignBannerPreviewID == bannerId) {
				// TODO: what's amount here?
				// By default, @lvduit using bidamount here
				//var amount = agent.banner[i].BidAmount;
				var amount = 0;
				if (parseInt(agent.banner[i].BidType) == 1) {
					amount = agent.banner[i].BidAmount;
				}

				// Update creative Counter
				agent.banner[i].ClickCounter++;

				// Update creative currentspend
				agent.banner[i].CurrentSpend += amount;
				console.error("DEBUG: Update CurrentSpend of Creative [" + bannerId + "]: " + agent.banner[i].CurrentSpend);

				// Check banner out of max
				if (agent.banner[i].CurrentSpend >= agent.banner[i].MaximumBudget && agent.banner[i].MaximumBudget > 0) {
					console.error("WARN: Creative ["+ agent.banner[i].AdCampaignBannerPreviewID +"] out of current spend, disactive it.");
					agent.banner[i].Active = 0;
				}

				// TODO: Check DailyBudget

				// Update AdCampaign current spend
				for (var j = 0; j < agent.campaign.length; j++) {
					if (agent.campaign[j].AdCampaignID == agent.banner[i].AdCampaignID) {
						agent.campaign[j].CampaignCurrentSpend += amount;
					}
				}

				// Save log 
				new AdvBanker({
					UserID: agent.UserID, 
					AdCampaignBannerID: agent.banner[i].AdCampaignBannerPreviewID,
					AdzoneMapBannerId: 0, // TODO: Fix there
					Price: amount,
					created: new Date()
				}).save(function(err, model) {
					if (err) return console.error(err);
					console.warn("INFO: ["+ new Date() +"] Adv Banker create transaction [UID: "+ agent.UserID +", Banner: "+ agent.banner[i].AdCampaignBannerPreviewID +", Price: "+ amount +"]");
				});

				return true;
			}
		}
	});

	return true;
};


var updateAgentCurrentSpend = function(clickData) {
	// Agent current spend = sum(campaign.currentspend)
	BGateAgent.agents.forEach(function(agent) {
		if (!agent.campaign) return false;
		agent.CurrentSpend = 0.0;
		agent.campaign.forEach(function(campaign) {
			agent.CurrentSpend += campaign.CampaignCurrentSpend;
		});

		console.warn("INFO: ["+ new Date() +"] Update Agent current spend [UID: "+ agent.UserID +", CurrentSpend: "+ agent.CurrentSpend +"]");

		// Check balance 
		if (agent.CurrentSpend >= agent.Balance) {
			console.error("WARN: ["+ new Date() +"] Agent ["+ agent.UserID +"] out of balance [CurrentSpend: "+ agent.CurrentSpend +"], disable agent.");
			agent.user_enabled = 0;

			// Update to MySQL
			new DemandCustomerInfo({DemandCustomerInfoID: agent.DemandCustomerInfoID})
			.save({MonthlyCurrentSpen: agent.CurrentSpend}, {patch: true}).then(function(model) {
				if (model) {
					console.info("SYNC: Sync Agent to MySQL");
				}
			});
		}
	});
};

var getBannerById = function(bannerId) {
	if (!BGateAgent || !BGateAgent.agents) return false;
	var isFounded = false;
	var result = {};

	BGateAgent.agents.forEach(function(agent) {
		// console.error(agent);
		if (isFounded) return false;
		if (!agent.banner) return false;

		agent.banner.forEach(function(banner) {
			if (isFounded) return false;
			if (banner.AdCampaignBannerPreviewID == bannerId) {
				isFounded = true;
				result = banner;
			}
		});
	});

	if (isFounded) return result;
	return false;
};