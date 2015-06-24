'use strict';

var _ = require('lodash');
var moment = require('moment');
var Promise = require('es6-promise').Promise;

var config = require('../config/config');
var Model = require('../config/db').Model;

var mysql      = require('mysql');
var connection = mysql.createConnection(config.db);
connection.connect();

var BGateAgent = {
	agents : [],
	listBanner : [],

	init : function(next) {
		var q = "SELECT * FROM (SELECT * FROM auth_Users WHERE DemandCustomerInfoID IS NOT NULL) AS tb1 INNER JOIN (SELECT * FROM `DemandCustomerInfo`) AS tb2 ON tb1.DemandCustomerInfoID = tb2.DemandCustomerInfoID INNER JOIN (SELECT * FROM `AdCampaignBannerPreview`) AS tb3 ON tb1.user_id = tb3.UserID;";

		connection.query(q, function(err, rows, fields) {
			if (err || !rows) throw err;
			//console.log("==== query ok =====");

			for (var i in rows) {
				//console.log("==== IN ROW "+ i +" ====================================");
				var row = rows[i];

				// Check user is in agent list ?
				var isExists = false;
				for (var jj in BGateAgent.agents) {
					if (isExists) return false;
					if (BGateAgent.agents[jj].UserID == row.user_id) isExists = true;
				}

				if (!isExists) {
					var agent = {
						UserID: row.user_id,
						user_email: row.user_email,
						user_enabled: row.user_enabled,
						user_verified: row.user_verified,
						user_agreement_accepted: row.user_agreement_accepted,
						locale: row.locale,
						Name: row.Name,
						Website: row.Website,
						Company: row.Company,
						PartnerType: row.PartnerType,
						Balance: row.Balance,
						banner: []
					};

					for (var j in rows) {
						//console.log("==== GET BANNER OF "+ i +" ====");
						// Check banner is in array 
						if (rows[j].user_id == row.user_id) {
							//console.log("PASS USER ", row.user_id);
							var isExists = false;
							for (var z in agent.banner) {
								if (isExists == true) return false;
								if (agent.banner[z].AdCampaignBannerPreviewID == rows[j].AdCampaignBannerPreviewID) {
									isExists = true;
									return false;
								}
							}

							if (!isExists) {
								
								var _rowBanner = rows[j];
								var banner = {
									AdCampaignBannerPreviewID: _rowBanner.AdCampaignBannerPreviewID,
									AdCampaignPreviewID: _rowBanner.AdCampaignPreviewID,
									ImpressionType: _rowBanner.ImpressionType,
									Name: _rowBanner.Name, 
									StartDate: _rowBanner.StartDate, 
									EndDate: _rowBanner.EndDate,
									IsMobile: _rowBanner.IsMobile, 
									IABSize: _rowBanner.IABSize,
									Height: _rowBanner.Height,
									Width: _rowBanner.Width,
									Weight: _rowBanner.Weight,
									BidAmount: _rowBanner.BidAmount,
									DeliveryType: _rowBanner.DeliveryType,
									LandingPageTLD: _rowBanner.LandingPageTLD,
									ImpressionsCounter: _rowBanner.ImpressionsCounter,
									BidsCounter: _rowBanner.BidsCounter,
									CurrentSpend: _rowBanner.CurrentSpend,
									Active: _rowBanner.Active,
									DateCreated: _rowBanner.DateCreated,
									DateUpdated: _rowBanner.DateUpdated,
									ChangeWentLive: _rowBanner.ChangeWentLive,
									WentLiveDate: _rowBanner.WentLiveDate, 
									AdUrl: _rowBanner.AdUrl,
									Label: _rowBanner.Label,
									BidType: _rowBanner.BidType,
									TargetDaily: _rowBanner.TargetDaily,
									TargetMax: _rowBanner.TargetMax,
									DailyBudget: _rowBanner.DailyBudget,
									MaximumBudget: _rowBanner.MaximumBudget,
									IABAudienceCategory: _rowBanner.IABAudienceCategory,
									GEOCountry: _rowBanner.GEOCountry, 
									TimeZone: _rowBanner.TimeZone,
									FrequencyCap: _rowBanner.FrequencyCap, 
									FreCapShowTime: _rowBanner.FreCapShowTime,
									FreCapTimeFromHr: _rowBanner.FreCapTimeFromHr,
									FreCapTimeToHr: _rowBanner.FreCapTimeToHr, 
									FreCapCampaignApply: _rowBanner.FreCapCampaignApply,
									FreCapZoneApply: _rowBanner.FreCapZoneApply,
									AdTagType: _rowBanner.AdTagType,
									InAnIframe: _rowBanner.InAnIframe,
									MultiNestedIframe: _rowBanner.MultiNestedIframe,
									AdPostLeft: _rowBanner.AdPostLeft,
									AdPostTop: _rowBanner.AdPostTop,
									ResolutionMinW: _rowBanner.ResolutionMinW,
									ResolutionMaxW: _rowBanner.ResolutionMaxW, 
									ResolutionMinH: _rowBanner.ResolutionMinH,
									ResolutionMaxH: _rowBanner.ResolutionMaxH,
									HttpLang: _rowBanner.HttpLang,
									BrowerAgentGrep: _rowBanner.BrowerAgentGrep,
									CookieGrep: _rowBanner.CookieGrep,
									PmpEnable: _rowBanner.PmpEnable,
									Secure: _rowBanner.Secure,
									FoldPosition: _rowBanner.FoldPosition,
								};

								banner = initBannerAttributes(banner);

								if (passSelfBannerFilter(banner))
									agent.banner.push(banner);
								
							}
						}
					}

					BGateAgent.agents.push(agent);
				}
			}

			//console.log(BGateAgent.agents);

			if (next) next();
		});
	}
};



var passSelfBannerFilter = function(banner) {
	if (!banner) return false;

	if (banner.StartDate) {
		var startDate = moment(banner.StartDate);
		if (moment().diff(startDate, "seconds") < 0) return false; 
	}

	if (banner.EndDate) {
		var endDate = moment(banner.EndDate);
		if (moment().diff(endDate, "seconds") > 0) return false; 
	}

	return true;
};

var initBannerAttributes = function(banner) {
	if (!banner) return banner;

	if (banner.FrequencyCap == 1) {
		banner.FrequencyCapCountToday = banner.FrequencyCapCountToday || 0;
		banner.FreCapShowTime = parseInt(banner.FreCapShowTime);
		if (!banner.FreCapShowTime || banner.FreCapShowTime == 0) {
			banner.currentFreCapShowTime = 300; // default 3 time in day
		} else {
			banner.currentFreCapShowTime = banner.FreCapShowTime;
		}
	}

	// TODO: All attributes for banner, ex: todayImp, totalImp, clickCounter, ...
	return banner;
};


BGateAgent.init(function() {
	if (1 == 2) {
		setTimeout(function() {
			require('fs').writeFile("bgate_agent.txt", JSON.stringify(BGateAgent.agents, null, 4), null);
		}, 2000);
	}
});

module.exports = BGateAgent;