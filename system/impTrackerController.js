'use strict';

var Model = require('../config/db').Model;
var tracker = require('pixel-tracker');
var ImpLog = require('../config/mongodb').ImpLog;
var BGateAgent = require('../helper/BgateAgent');
var PublisherAgent = require('../helper/Publisher');

// ==================================
// DATABASE CONSTRUCT
// ==================================

var lastImp = {
	impId: '',
	PublisherAdZoneID: 0,
	AdCampaignBannerID: 0, 
	UserIP: '',
	Country: '',
};

exports.tracker = function(req, res) {
	tracker.use(function (error, result) {
	    // console.log(JSON.stringify(result, null, 2));

	    var data = {
	    	impId: result.impId || '',
	    	PublisherAdZoneID : result.PublisherAdZoneID || 0,
	    	AdCampaignBannerID : result.AdCampaignBannerID || 0,
	    	UserIP : result.geo.ip || '',
	    	Country : JSON.stringify(result.language) || '',
	    	Price : 0.0,
	    	created: new Date()
	    };

    	var banner = getBannerById(data.AdCampaignBannerID);
		if (!banner) {
			console.log("INFO: ["+ new Date() +"] Click tracker can not find info of creative [" + banner.AdCampaignBannerID + "]");
		}
		data.Price = banner.BidAmount;

		if (lastImp) {
			if (
				lastImp.impId == data.impId 
				&& lastImp.PublisherAdZoneID == data.PublisherAdZoneID 
				&& lastImp.AdCampaignBannerID == data.AdCampaignBannerID 
				&& lastImp.UserIP == data.UserIP 
				&& lastImp.Country == data.Country
			)
				return false;
		}

		lastImp = data;

		// Update counter for creative and campaign in Bgate Agent 
		updateImpCounterInBGateAgent(data.AdCampaignBannerID);

		// Update counter for adzone in Publisher Agent
		updateCounterInPublisherAgent(data.PublisherAdZoneID, data.Price);

		// Update counter in DB
	    if (!data.PublisherAdZoneID || !data.AdCampaignBannerID) {
	    	console.error("ERROR: ImpTracker missing AdCampaignBannerID OR PublisherAdZoneID");
	    } else {
	    	new ImpLog(data).save(function(err, model) {
	    		if (err) console.error(err);
	    		else console.info('INFO: [' + new Date() + "] Saved ImpLog [" + model.id + '] {['+ data.PublisherAdZoneID +'], [' + data.AdCampaignBannerID + '], [' + data.UserIP +']}');
	    	});
	    }
	});

	res.header('Content-Type', 'image/gif');
	return tracker.middleware(req, res);
};

var updateImpCounterInBGateAgent = function(bannerId) {
	if (!BGateAgent && !BGateAgent.agents) return false;

	BGateAgent.agents.forEach(function(agent) {
		if (!agent.banner) return false;
		for (var i = 0; i < agent.banner.length; i++) {
			if (agent.banner[i].AdCampaignBannerPreviewID == bannerId) {
				// Update banner counter
				agent.banner[i].ImpressionsCounter++;

				// Update campagin counter
				for (var j = 0; j < agent.campaign.length; j++) {
					if (agent.campaign[j].AdCampaignID == agent.banner[i].AdCampaignID) {
						agent.campaign[j].CampaignImpressionsCounter++;

						// TODO: Check max impression of agent
						if (agent.campaign[j].CampaignImpressionsCounter >= agent.campaign[j].MaxImpressions) {
							console.error("WARN: Campaign ["+ agent.campaign[j].AdCampaignID +"] out of max expression ["+ agent.campaign[j].MaxImpressions +"], disable this campaign.");
							agent.campaign[j].Active = 0;
							// Disable all banner of this campaign
							for (var ii = 0; ii < agent.banner.length; ii++) {
								if (agent.banner[ii].AdCampaignID == agent.campaign[j].AdCampaignID) {
									agent.banner[ii].Active = 0;
									console.error("WARN: Campaign ["+ agent.campaign[j].AdCampaignID +"] out of max expression ["+ agent.campaign[j].MaxImpressions +"], disable banner ["+ agent.banner[ii].AdCampaignBannerPreviewID +"].");
								}
							}
						}
					}
				}

				return true;
			}
		}
	});

	return true;
}

var updateCounterInPublisherAgent = function(adzoneId, price) {
	if (!PublisherAgent || !PublisherAgent.data) return false;

	var updated = false;
	PublisherAgent.data.forEach(function(pub) {
		if (!pub || !pub.Adzone) return false;

		if (updated) return false;
		pub.Adzone.forEach(function(adzone) {
			if (adzone.PublisherAdZoneID == adzoneId) {
				adzone.TotalImpressions ++; // Update impression counter
				adzone.TotalAmount += price || 0.0;

				pub.Balance += price || 0.0; // Update Balance

				updated = true;
			} 
		})
	});

	return true;
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