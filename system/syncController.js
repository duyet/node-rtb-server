'use strict';

var exec = require('child_process').exec;

var config = require('../config/config');
var BGateAgent = require('../helper/BgateAgent');
var PublisherAgent = require('../helper/Publisher');
var Model = require('../config/db').Model;

var AdCampaignBannerPreview = Model.extend({
	tableName: 'AdCampaignBannerPreview',
	idAttribute: 'AdCampaignBannerPreviewID'
});

var AdCampaignPreview = Model.extend({
	tableName: 'AdCampaignPreview',
	idAttribute: 'AdCampaignPreviewID'
});

var PublisherInfo = Model.extend({
	tableName: 'PublisherInfo',
	idAttribute: 'PublisherInfoID'
});

var PublisherAdZone = Model.extend({
	tableName: 'PublisherAdZone',
	idAttribute: 'PublisherAdZoneID'
});

exports.counter = function(req, res) {
	if (!BGateAgent || !BGateAgent.agents) return false;
	if (!PublisherAgent || !PublisherAgent.data) return false;

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
			.save({CurrentSpend: campaign.CampaignCurrentSpend, ImpressionsCounter: campaign.CampaignImpressionsCounter}, {patch: true})
			.then(function(model) {
				if (model) {
					console.info("SYNC: ["+ new Date() +"] Sync Campaign counter, Creative ["+ model.attributes.AdCampaignPreviewID +"] --> {CurrentSpend: "+  campaign.CampaignCurrentSpend +", ImpsCounter: "+ campaign.CampaignImpressionsCounter +"} ");
				}
			})
		}
	}

	PublisherAgent.data.forEach(function(pub) {
		// Sync publisher Balance
		new PublisherInfo({PublisherInfoID: pub.PublisherInfoID})
		.save({Balance: pub.Balance}, {patch: true})
		.then(function(model) {
			if (model) {
				console.info("SYNC: ["+ new Date() +"] Sync Publisher ["+ model.attributes.PublisherInfoID +"] balance [$"+ model.attributes.Balance +"]");
			}
		});

		// Sync Adzone: TotalRequests, TotalImpressions, TotalAmount
		if (pub.Adzone) {
			pub.Adzone.forEach(function(adzone) {
				if (!adzone) return false;

				new PublisherAdZone({PublisherAdZoneID: adzone.PublisherAdZoneID})
				.save({
					TotalRequests: adzone.TotalRequests,
					TotalImpressions: adzone.TotalImpressions, 
					TotalAmount: adzone.TotalAmount
				}, {patch: true})
				.then(function(model) {
					if (model) {
						console.info("SYNC: ["+ new Date() +"] Sync Adzone ["+ model.attributes.PublisherAdZoneID +"] -> {request: "+ model.attributes.TotalRequests +", imp: "+ model.attributes.TotalImpressions +", amount: $"+ adzone.TotalAmount +"}");
					}
				})
			});
		}
	});

	res.send("ok");
}

exports.dailytracker = function(req, res) {
	if (!req.query || !req.query.s || req.query.s != config.trigger_token) {
		return res.status(404).send("Not Found");
	}

	console.info("SYNC: ["+ new Date() +"] Sync daily tracker.");
	console.info('node '+ __dirname +'/../cronjob/banner-adzone-daily-tracker.js');
	exec('node '+ __dirname +'/../cronjob/banner-adzone-daily-tracker.js', function(error, stdout, stderr) {
		console.log(error, stdout, stderr);
	});
	res.send('ok');
}

exports.internaltransaction = function(req, res) {
	if (!req.query || !req.query.s || req.query.s != config.trigger_token) {
		return res.status(404).send("Not Found");
	}

	console.info("SYNC: ["+ new Date() +"] Sync internal transaction.");
	console.info('node '+ __dirname +'/../cronjob/internal-transaction-monthly.js');
	exec('node '+ __dirname +'/../cronjob/banner-adzone-daily-tracker.js', function(error, stdout, stderr) {
		console.log(error, stdout, stderr);
	});
	res.send('ok');
}