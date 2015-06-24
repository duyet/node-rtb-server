'use strict';

var config = require('../config/config');
var BGateAgent = require('../helper/BgateAgent.js');
var Model = require('../config/db').Model;

var AdCampaignBannerPreview = Model.extend({
	tableName: 'AdCampaignBannerPreview',
	idAttribute: 'AdCampaignBannerPreviewID'
});

exports.banner = function(req, res) {
	if (!BGateAgent || !BGateAgent.agents) return false;

	for (var i = 0; i < BGateAgent.agents.length; i++) {
		var agent = BGateAgent.agents[i];
		if (!agent.banner) return false;

		for (var j = 0; j < agent.banner.length; j++) {
			var banner = agent.banner[j];
			new AdCampaignBannerPreview({AdCampaignBannerPreviewID: banner.AdCampaignBannerPreviewID, AdCampaignPreviewID: banner.AdCampaignPreviewID})
				.save({BidsCounter: banner.BidsCounter, ImpressionsCounter: banner.ImpressionsCounter}, {patch: true})
				.then(function(model) {
					if (model) {
						console.log("UPDATE: ["+ new Date() +"] Success ", model.attributes.AdCampaignBannerPreviewID);
					}
				});
		}
	}

	res.send("ok");
}