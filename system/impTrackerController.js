'use strict';

var config = require('../config/config');
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
	    	NetPrice: 0.0,
	    	created: new Date()
	    };

    	var banner = getBannerById(data.AdCampaignBannerID);
		if (!banner) {
			console.log("INFO: ["+ new Date() +"] Imp tracker can not find info of creative [" + banner.AdCampaignBannerID + "]");
		}

		if (banner.BidType == config.bid_type.CPM) {
			data.Price = banner.BidAmount;
			data.NetPrice = banner.BidAmount - banner.BidAmount * banner.CampaignMarkup;	
		}

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
		updateImpCounterInBGateAgent(data.AdCampaignBannerID, data.Price);

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

var updateImpCounterInBGateAgent = function(bannerId, price) {
	if (!BGateAgent && !BGateAgent.agents) return false;

	BGateAgent.agents.forEach(function(agent) {
		if (!agent.banner) return false;
		for (var i = 0; i < agent.banner.length; i++) {
			if (agent.banner[i].AdCampaignBannerPreviewID == bannerId) {
				// Update banner counter
				agent.banner[i].ImpressionsCounter++;

				// Update current spend 
				if (agent.banner[i].BidType == config.bid_type.CPM) {
					agent.banner[i].CurrentSpend += price;
				}

				// Update campagin counter and check max 
				for (var j = 0; j < agent.campaign.length; j++) {
					if (agent.campaign[j].AdCampaignID == agent.banner[i].AdCampaignID) {
						agent.campaign[j].CampaignImpressionsCounter++;
						agent.campaign[j].CurrentSpend += price;
						agent.campaign[j].MonthlySpend += price;

						// TODO: Check max impression of agent
						if (agent.campaign[j].CampaignImpressionsCounter >= agent.campaign[j].MaxImpressions) {
							console.error("WARN: Campaign ["+ agent.campaign[j].AdCampaignID +"] out of max impression ["+ agent.campaign[j].MaxImpressions +"], disable this campaign.");
							agent.campaign[j].CampaignApproval = 1;
							// Disable all banner of this campaign
							for (var ii = 0; ii < agent.banner.length; ii++) {
								if (agent.banner[ii].AdCampaignID == agent.campaign[j].AdCampaignID) {
									agent.banner[ii].Approval = 1;
									campaignCurrentSpend += agent.banner[ii].CurrentSpend;
									console.error("WARN: Campaign ["+ agent.campaign[j].AdCampaignID +"] out of max expression ["+ agent.campaign[j].MaxImpressions +"], disable banner ["+ agent.banner[ii].AdCampaignBannerPreviewID +"].");
								}
							}
						}

						// Check max spend campaign
						if (agent.campaign[j].MaxSpend > 0) {
							if (agent.campaign[j].CurrentSpend >= agent.campaign[j].MaxSpend) {
								console.error("WARN: Campaign ["+ agent.campaign[j].AdCampaignID +"] out of max spend ["+ agent.campaign[j].MaxSpend +"], disable this campaign.");
								agent.campaign[j].CampaignApproval = 1;
								// Disable all banner of this campaign
								for (var ii = 0; ii < agent.banner.length; ii++) {
									if (agent.banner[ii].AdCampaignID == agent.campaign[j].AdCampaignID) {
										agent.banner[ii].Approval = 1;
										campaignCurrentSpend += agent.banner[ii].CurrentSpend;
										console.error("WARN: Campaign ["+ agent.campaign[j].AdCampaignID +"] out of max spend ["+ agent.campaign[j].MaxSpend +"], disable banner ["+ agent.banner[ii].AdCampaignBannerPreviewID +"].");
									}
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

	console.log(">>>>>> Run update counter in Publisher agent")

	var updated = false;
	PublisherAgent.data.forEach(function(pub) {
		if (!pub || !pub.Adzone) return false;

		if (updated) return false;
		pub.Adzone.forEach(function(adzone) {
			if (adzone.PublisherAdZoneID == adzoneId) {
				adzone.TotalImpressions ++; // Update impression counter
				adzone.TotalAmount += price || 0.0;

				pub.Balance += price || 0.0; // Update Balance

			//	console.info(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Current Balance [$"+ pub.Balance +"]");

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