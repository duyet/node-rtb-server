'use strict';

var _ = require('lodash');
var moment = require('moment');
var Promise = require('es6-promise').Promise;

var config = require('../config/config');
var Model = require('../config/db').Model;
var ClickLog = require('../config/mongodb').ClickLog;

var mysql      = require('mysql');
var connection = mysql.createConnection(config.db);
connection.connect();

var BGateAgent = {
	agents : [],
	listBanner : [],
	campaignSkip: [],

	init : function(next) {
		console.info("INFO: ["+ new Date() +"] Init BGate Agent Data.");

		BGateAgent.agents = []; // reset empty

		//var q = "SELECT * FROM (SELECT * FROM auth_Users WHERE DemandCustomerInfoID IS NOT NULL) AS tb1 INNER JOIN (SELECT * FROM `DemandCustomerInfo`) AS tb2 ON tb1.DemandCustomerInfoID = tb2.DemandCustomerInfoID INNER JOIN (SELECT * FROM `AdCampaignBannerPreview`) AS tb3 ON tb1.user_id = tb3.UserID;";
		var q = "SELECT * FROM (SELECT * FROM auth_Users WHERE DemandCustomerInfoID IS NOT NULL) AS tb1 INNER JOIN (SELECT * FROM `DemandCustomerInfo`) AS tb2 ON tb1.DemandCustomerInfoID = tb2.DemandCustomerInfoID INNER JOIN (SELECT * FROM `AdCampaignBannerPreview`) AS tb3 ON tb1.user_id = tb3.UserID INNER JOIN (SELECT AdCampaignPreviewID As AdCampaignID, UserID, `Name` As CampaignName, CampaignMarkup, StartDate as CampaignStartDate, EndDate As CampaignEndDate, ImpressionsCounter as CampaignImpressionsCounter, MaxImpressions as CampaignMaxImpressions, CurrentSpend as CampaignCurrentSpend, MaxSpend as CampaignMaxSpend, CPMTarget as CampaignCPMTarget, CPMTargetValue as CampaignCPMTargetValue, Active as CampaignActive, Deleted as CampaignDeleted, DateCreated as CampaignDateCreated, DateUpdated as CampaignDateUpdated, ChangeWentLive as CampaignChangeWentLive, WentLiveDate as CampaignWentLiveDate, Approval as CampaignApproval FROM AdCampaignPreview) AS tb4 ON (tb3.UserID = tb4.UserID AND tb3.AdCampaignPreviewID = tb4.AdCampaignID);";

		connection.query(q, function(err, rows, fields) {
			if (err || !rows) throw err;
			// console.log("==== query ok =====");

			rows.forEach(function(row, i) {
			//for (var i in rows) {
				// console.log("==== IN ROW "+ i +" ====================================", row);
				// var row = rows[i];

				// Check user is in agent list ?
				var isExists = false;
				for (var jj in BGateAgent.agents) {
					if (isExists) return false;
					if (BGateAgent.agents[jj].UserID == row.user_id) isExists = true;
				}

				if (!isExists) {
					var agent = {
						UserID 					: row.user_id,
						DemandCustomerInfoID 	: row.DemandCustomerInfoID,
						user_email 				: row.user_email,
						user_enabled 			: row.user_enabled,
						user_status 			: "",
						user_verified 			: row.user_verified,
						user_agreement_accepted	: row.user_agreement_accepted,
						locale					: row.locale,
						Name 					: row.Name,
						Website 				: row.Website,
						Company 				: row.Company,
						PartnerType 			: row.PartnerType,
						Balance 				: row.Balance,
						CurrentSpend 			: row.MonthlyCurrentSpen,
						banner 					: [], 
						campaign 				: []
					};

					// TODO: Calc currentSpend from Mongodb
					
					// Disable agent if balance low
					if (agent.Balance <= config.agentMinBalanceToDisable) {
						console.error("WARN: Agent ["+ agent.UserID +"] balance ($"+ agent.Balance +") is below an amount that bgate system specify, so disactive.");
						agent.user_enabled = 0;
						agent.user_status = "Balance ($"+ agent.Balance +") is below an amount that bgate system specify";
					}

					// Load campaign
					var agentCampaign = [];
					for (var jjj in rows) {
						if (rows[jjj].user_id == row.user_id) {
							var _isExistsCampaign = false;
							agentCampaign.forEach(function(campaign) {
								if (_isExistsCampaign == true) return false;
								if (campaign.AdCampaignID == rows[jjj].AdCampaignID) _isExistsCampaign = true;
							});
							if (!_isExistsCampaign) {
								BGateAgent.campaignSkip.forEach(function(skipCampaign) {
									// Exists in skip campaign list
									if (skipCampaign == rows[jjj].AdCampaignID) _isExistsCampaign = true;
								});	
							}
							
							if (!_isExistsCampaign) {
								var _rowCampaign = rows[jjj];

								var campaign = initCampainAttributes({
									AdCampaignID 					: _rowCampaign.AdCampaignID,
									CampaignName 					: _rowCampaign.CampaignName,
									CampaignMarkup 					: _rowCampaign.CampaignMarkup,
									CampaignStartDate 				: _rowCampaign.CampaignStartDate,
									CampaignEndDate 				: _rowCampaign.CampaignEndDate,
									CampaignImpressionsCounter 		: _rowCampaign.CampaignImpressionsCounter,
									CampaignMaxImpressions 			: _rowCampaign.CampaignMaxImpressions,
									CampaignCurrentSpend 			: _rowCampaign.CampaignCurrentSpend,
									CampaignMaxSpend 				: _rowCampaign.CampaignMaxSpend,
									CampaignCPMTarget 				: _rowCampaign.CampaignCPMTarget,
									CampaignCPMTargetValue			: _rowCampaign.CampaignCPMTargetValue,
									// CampaignActive 					: _rowCampaign.CampaignActive,
									CampaignDateCreated 			: _rowCampaign.CampaignDateCreated,
									CampaignDateUpdated 			: _rowCampaign.CampaignDateUpdated,
									CampaignChangeWentLive 			: _rowCampaign.CampaignChangeWentLive,
									CampaignWentLiveDate 			: _rowCampaign.CampaignWentLiveDate,
									
									CampaignApproval 				: _rowCampaign.CampaignApproval,
									CampaignDeleted 				: _rowCampaign.CampaignDeleted,
								});

								if (passSelfCampaignFilter(campaign)) {
									agentCampaign.push(campaign);
								}
							}
						}
					}
					agent.campaign = agentCampaign;

					// Load banner 
					for (var j in rows) {
						//console.log("==== GET BANNER OF "+ i +" ====");
						// Check banner is in array 
						if (rows[j].user_id == row.user_id) {
							//console.log("PASS USER ", row.user_id);
							var _isExists = false;
							agent.banner.forEach(function(banner) {
								if (_isExists == true) return false;
								if (banner.AdCampaignBannerPreviewID == rows[j].AdCampaignBannerPreviewID) {
									_isExists = true;
									// return false;
								}
							});

							if (!_isExists) {
								
								var _rowBanner = rows[j];
								var banner = initBannerAttributes({
									AdCampaignBannerPreviewID: _rowBanner.AdCampaignBannerPreviewID,
									AdCampaignID: _rowBanner.AdCampaignID,
									ImpressionType: _rowBanner.ImpressionType,
									Name: _rowBanner.Name, 
									StartDate: _rowBanner.StartDate, 
									EndDate: _rowBanner.EndDate,
									IsMobile: _rowBanner.IsMobile, 
									IABSize: _rowBanner.IABSize,
									Height: _rowBanner.Height,
									Width: _rowBanner.Width,
									Weight: _rowBanner.Weight,
									DeliveryType: _rowBanner.DeliveryType,
									LandingPageTLD: _rowBanner.LandingPageTLD,
									
									BidsCounter: _rowBanner.BidsCounter,
									ClickCounter: _rowBanner.ClickCounter,
									ImpressionsCounter: _rowBanner.ImpressionsCounter,
									
									CurrentSpend: _rowBanner.CurrentSpend,
									MaximumBudget: _rowBanner.MaximumBudget,

									Active: _rowBanner.Active,  // Banner Active status

									DateCreated: _rowBanner.DateCreated,
									DateUpdated: _rowBanner.DateUpdated,
									ChangeWentLive: _rowBanner.ChangeWentLive,
									WentLiveDate: _rowBanner.WentLiveDate, 
									AdUrl: _rowBanner.AdUrl,
									Label: _rowBanner.Label,
									
									BidType: _rowBanner.BidType, // 1 = CPM, 2 = CPC
									BidAmount: _rowBanner.BidAmount,
									BidAmountCPM: _rowBanner.BidAmount,

									TargetDaily: _rowBanner.TargetDaily,
									TargetMax: _rowBanner.TargetMax,
									DailyBudget: _rowBanner.DailyBudget,

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
								});

								if (passSelfBannerFilter(banner)) {
									agent.banner.push(banner);
								}

							}
						}
					}

					BGateAgent.agents.push(agent);
				}
			});
			// console.log(BGateAgent.agents);

			if (next) next();
		});
	}, 

	updateCampaignStatus: updateCampaignStatus,
	updateBannerStatus: updateBannerStatus,
	getBannerById: getBannerById
};



var passSelfBannerFilter = function(banner) {
	if (!banner) return false;

	// Deny banner CPC
	if (banner.BidType != config.bid_type.CPM) {
		console.error("WARN: BGate now accept Bid CPM Only, disable creative ["+ banner.AdCampaignBannerPreviewID +"]");
		return false;
	}

	// Banner from [date] to [date]
	if (banner.StartDate) {
		var startDate = moment(banner.StartDate);
		if (moment().diff(startDate, "seconds") < 0) return false; 
	}
	if (banner.EndDate) {
		var endDate = moment(banner.EndDate);
		if (moment().diff(endDate, "seconds") > 0) return false; 
	}

	// Check campaign status, if campaign is disable ==> disable me
	var campaign = getCampaignById(banner.AdCampaignID);
	if (!campaign) {
		// not found campaign, opp
		// console.error("passSelfBannerFilter: not found campaign ", banner.AdCampaignID);
		// return false;
	}
	else if (!campaign.CampaignActive || campaign.CampaignActive == 0) {
		banner.BannerActive = 0;
		// If return false here ==> do not add this banner to agents
		return false;
	}

	return true;
};

var initBannerAttributes = function(banner) {
	if (!banner) return banner;

	banner.BidType = parseInt(banner.BidType);

	// Convert CPM to CPC
	if (parseInt(banner.BidType) == 1) {
		// banner.BidAmount = config.cpm_to_cpc_rate * banner.BidAmount;
		banner.BidAmountCPM = banner.BidAmount;
		banner.BidAmount = banner.BidAmount / 1000;
	}

	// Delected 
	if (parseInt(banner.Deleted) == 1) {
		return false;
	}	

	if (banner.FrequencyCap == 1) {
		banner.FrequencyCapCountToday = banner.FrequencyCapCountToday || 0;
		banner.FreCapShowTime = parseInt(banner.FreCapShowTime);
		if (!banner.FreCapShowTime || banner.FreCapShowTime == 0) {
			banner.currentFreCapShowTime = 300; // default 3 time in day
		} else {
			banner.currentFreCapShowTime = banner.FreCapShowTime;
		}
	}

	// Banner status 
	banner.BannerActive = 1;
	banner.BannerActiveStatus = "";

	// TODO: All attributes for banner, ex: todayImp, totalImp, clickCounter, ...
	return banner;
};

var passSelfCampaignFilter = function(campaign) {
	// TODO: Check campagin conditions


	//CampaignApproval 				: _rowCampaign.CampaignApproval,
	//CampaignDeleted 				: _rowCampaign.CampaignDeleted,

	// CampaignApproval
	// Approval: "0" => Banned, "1" => Stop, "2" => Running, "3" => Auto Approved
	campaign.CampaignApproval = parseInt(campaign.CampaignApproval);
	if (campaign.CampaignApproval != 2 || campaign.CampaignApproval != 3) {
		BGateAgent.campaignSkip.push(campaign.AdCampaignID);
		console.error("WARN: Campaign ["+ campaign.AdCampaignID +"] was banned or stopped, skip.")
		return false;
	}

	// CampaignDeleted
	// Deleted: "0" => Exist, "1" => Deleted
	campaign.CampaignDeleted = parseInt(campaign.CampaignDeleted);
	if (campaign.CampaignDeleted != 0) {
		BGateAgent.campaignSkip.push(campaign.AdCampaignID);
		console.error("WARN: Campaign ["+ campaign.AdCampaignID +"] was deleted, skip.")
		return false;
	}

	return true;
}

var initCampainAttributes = function(campaign) {
	// TODO: Add campaign attr

	return campaign;
}

// =====================================================================
// HELPER FUNCTION
// =====================================================================
// Get Campaign by ID 
// TODO: Duyet, you must to learning hard about async in Nodejs =="
var getCampaignById = function(campaignId) {
	if (!BGateAgent || !BGateAgent.agents) return false;
	var isFounded = false;
	var result = {};

	BGateAgent.agents.forEach(function(agent) {
		// console.error(agent);
		if (isFounded) return false;
		if (!agent.campaign) return false;

		agent.campaign.forEach(function(campaign) {
			if (isFounded) return false;
			if (campaign.AdCampaignID == campaignId) {
				isFounded = true;
				result = campaign;
			}
		});
	});

	if (isFounded) return result;
	return false;
};

// Get banner by ID 
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

// ====================================================================
// ====================================================================
var updateCampaignStatus = function(updateToMySql) {
	if (!BGateAgent || !BGateAgent.agents) return false;

	var updateToMySql = updateToMySql || true;
};

var updateBannerStatus = function(updateToMySql) {
	if (!BGateAgent || !BGateAgent.agents) return false;

	var updateToMySql = updateToMySql || true;

	BGateAgent.agents.forEach(function(agent, agentId) {
		if (!agent || !agent.campaign) return false;
		agent.campaign.forEach(function(campaign) {
			// If my campaign is disactive, disactive all banner of me		
			// BGateAgent.agents[agentId].
		});
	});

}


BGateAgent.init(function() {
	if (config.debug) {
		setTimeout(function() {
			require('fs').writeFile("bgate_agent.txt", JSON.stringify(BGateAgent.agents, null, 4), null);
		}, 2000);
	}
});

module.exports = BGateAgent;