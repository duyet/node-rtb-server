'use strict';

var Model = require('../config/db').Model;
var PublisherAgent = require('../helper/Publisher');
var BGateAgent = require('../helper/BgateAgent');

console.info("INFO: Start Cronjob script: Update InternalTransaction");

function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 **/
Date.prototype.toMysqlDate = function() {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " 00:00:00";
};


// =========================================
// Database Model
// =========================================
var InternalTransaction = Model.extend({
	tableName: 'InternalTransaction',
	idAttribute: 'InternalTransactionID'
});

var AdBannerDailyTracker = Model.extend({
	tableName: 'AdBannerDailyTracker',
	idAttribute: 'AdBannerDailyTrackerID'
});

var AdzoneDailyTracker = Model.extend({
	tableName: 'AdzoneDailyTracker',
	idAttribute: 'AdzoneDailyTrackerID'
});

var date = new Date(), y = date.getFullYear(), m = date.getMonth();
var from = new Date(y, m, 1);
var to = new Date(y, m + 1, 0);

// ==================================
// Clear all InternalTransaction in that month
InternalTransaction.query(function(qb) {
	qb.where('DateCreated', '>', from.toMysqlDate()).andWhere('DateCreated', '<=', to.toMysqlDate())
}).fetchAll().then(function(model) {

});

/**
 * InternalTransaction for Campaign 
 */
AdBannerDailyTracker.query(function(qb) {
	// Select record from AdBannerDailyTracker in all this month
	qb.where('DateCreated', '>', from.toMysqlDate()).andWhere('DateCreated', '<=', to.toMysqlDate())
}).fetchAll().then(function(model) {
	if (model && model.models && BGateAgent && BGateAgent.agents) {
		var BannerDaily = model.models;

		var campaignStat = [];
		BGateAgent.agents.forEach(function(agent) {
			if (!agent || !agent.banner || !agent.campaign) return false;

			agent.campaign.forEach(function(campaign) {
				var campaignObject = {
					PolymorphicID 		: campaign.AdCampaignID,  // AdCampaignID
					PolymorphicType 	: 'campaign',   // Type AdCampaign
					TransactionType 	: 'income',
					UserID 				: campaign.UserID,
					GrossMoney 			: 0.0,
					NetMoney 			: 0.0,
					Markup 				: 0.0,
					DateCreated 		: new Date().toMysqlDate(),
					DateUpdated 		: new Date(),
				};

				agent.banner.forEach(function(banner) {
					if (banner.AdCampaignID == campaign.AdCampaignID) {
						var bannerID = banner.AdCampaignBannerPreviewID;
						// Tim tat ca bannerID, cong lai
						BannerDaily.forEach(function(banner_daily) {
							var bd = banner_daily.attributes;
							if (bd.AdCampaignBannerID == bannerID) {
								campaignObject.GrossMoney += bd.Outcome;
								campaignObject.NetMoney += bd.NetOutcome;
								campaignObject.Markup = campaignObject.Markup + bd.Outcome - bd.NetOutcome;
							}
						})
					}
				});

				campaignStat.push(campaignObject);
			});
		});

		// console.info(campaignStat);
		// Here I got data
		campaignStat.forEach(function(campaign) {
			new InternalTransaction({
				PolymorphicID 		: campaign.PolymorphicID,
				PolymorphicType 	: campaign.PolymorphicType,
				TransactionType		: campaign.TransactionType,
				DateCreated 		: campaign.DateCreated,
				UserID 				: campaign.UserID
			}).fetch()
			.then(function(model) {
				if (model) {
					model.set('GrossMoney', 	campaign.GrossMoney);
					model.set('NetMoney', 		campaign.NetMoney);
					model.set('Markup', 		campaign.Markup);
					model.set('DateUpdated', 	campaign.DateUpdated);
					model.save().then(function() {
						console.log("INFO: Update InternalTransaction to MySQL Server");	
					});
				} else {
					new InternalTransaction(campaign).save().then(function(model) {
						console.log("INFO: Save new InternalTransaction ["+ campaign.PolymorphicID +"] to MySQL Server!");
					});
				}
			});
		});
	}
}); 

/**
 * InternalTransaction for Website 
 */
AdzoneDailyTracker.query(function(qb) {
	qb.where('DateCreated', '>', from.toMysqlDate()).andWhere('DateCreated', '<=', to.toMysqlDate())
}).fetchAll().then(function(model) {
	if (model && model.models && PublisherAgent && PublisherAgent.data) {
		var AdzoneDaily = model.models;

		var websiteStat = [];
		PublisherAgent.data.forEach(function(publisher) {
			if (!publisher || !publisher.Website || !publisher.Adzone) return false;

			publisher.Website.forEach(function(Website) {
				var WebsiteObject = {
					PolymorphicID 		: Website.PublisherWebsiteID,  // PublisherWebsiteID
					PolymorphicType 	: 'website',   // Type AdCampaign
					TransactionType 	: 'outcome',
					UserID 				: Website.PublisherInfoID,
					GrossMoney 			: 0.0,
					NetMoney 			: 0.0,
					Markup 				: 0.0,
					DateCreated 		: new Date().toMysqlDate(),
					DateUpdated 		: new Date(),
				};

				publisher.Adzone.forEach(function(adzone) {
					if (adzone.PublisherWebsiteID == Website.PublisherWebsiteID) {
						var adzoneID = adzone.PublisherAdZoneID;
						// Tim tat ca adzoneID, cong lai
						AdzoneDaily.forEach(function(adzone_daily) {
							var ad = adzone_daily.attributes;
							if (ad.PublisherAdZoneID == adzoneID) {
								WebsiteObject.GrossMoney += ad.Income;
								WebsiteObject.NetMoney += ad.NetIncome;
								WebsiteObject.Markup = WebsiteObject.Markup + ad.Income - ad.NetIncome;
							}
						})
					}
				});

				websiteStat.push(WebsiteObject);
			});
		});

		// console.info(websiteStat);
		// Here I got data
		websiteStat.forEach(function(Website) {
			new InternalTransaction({
				PolymorphicID 		: Website.PolymorphicID,
				PolymorphicType 	: Website.PolymorphicType,
				TransactionType		: Website.TransactionType,
				DateCreated 		: Website.DateCreated,
				UserID 				: Website.UserID
			}).fetch()
			.then(function(model) {
				if (model) {
					model.set('GrossMoney', 	Website.GrossMoney);
					model.set('NetMoney', 		Website.NetMoney);
					model.set('Markup', 		Website.Markup);
					model.set('DateUpdated', 	Website.DateUpdated);
					model.save().then(function() {
						console.log("INFO: Update InternalTransaction to MySQL Server");	
					});
				} else {
					new InternalTransaction(Website).save().then(function(model) {
						console.log("INFO: Save new InternalTransaction ["+ Website.PolymorphicID +"] to MySQL Server!");
					});
				}
			});
		});
	}
});