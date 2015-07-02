'use strict';

var config = require('../config/config');
var BGateAgent = require('../helper/BgateAgent');
var Model = require('../config/db').Model;

var AdCampaignBannerPreview = Model.extend({
	tableName: 'AdCampaignBannerPreview',
	idAttribute: 'AdCampaignBannerPreviewID'
});

var AdCampaignPreview = Model.extend({
	tableName: 'AdCampaignPreview',
	idAttribute: 'AdCampaignPreviewID'
});

exports.sync = function(req, res) {
	if (!BGateAgent || !BGateAgent.agents) return false;

	for (var i = 0; i < BGateAgent.agents.length; i++) {
		var agent = BGateAgent.agents[i];
		if (!agent.banner) return false;

		// Sync BidsCounter, ImpressionsCounter, CurrentSpend
		for (var j = 0; j < agent.banner.length; j++) {
			var banner = agent.banner[j];
			new AdCampaignBannerPreview({AdCampaignBannerPreviewID: banner.AdCampaignBannerPreviewID, AdCampaignPreviewID: banner.AdCampaignID})
				.save({BidsCounter: banner.BidsCounter, ImpressionsCounter: banner.ImpressionsCounter, CurrentSpend: banner.CurrentSpend, ClickCounter: banner.ClickCounter}, {patch: true})
				.then(function(model) {
					if (model) {
						console.log("SYNC: ["+ new Date() +"] Sync Creative counter, Creative ["+ model.attributes.AdCampaignBannerPreviewID + "] --> {BidsCounter: " +  banner.BidsCounter + ", ImpsCounter: " + banner.ImpressionsCounter + ", CurrentSpend: " + banner.CurrentSpend +"} ");
					}
				});
		}

		for (var j = 0; j < agent.campaign.length; j++) {
			var campaign = agent.campaign[j];
			new AdCampaignPreview({AdCampaignPreviewID: campaign.AdCampaignID})
			.save({CurrentSpend: campaign.CampaignCurrentSpend, ImpressionsCounter: campaign.CampaignImpressionsCounter}, {patch: true}).then(function(model) {
				if (model) {
					console.info("SYNC: ["+ new Date() +"] Sync Campaign counter, Creative ["+ model.attributes.AdCampaignPreviewID +"] --> {CurrentSpend: "+  campaign.CampaignCurrentSpend +", ImpsCounter: "+ campaign.CampaignImpressionsCounter +"} ");
				}
			})
		}
	}

	res.send("ok");
}