'use strict';

var uuid = require('uuid');
var moment = require('moment');
var ce = require('cloneextend');  

var _ = require('lodash');
var config = require('../config/config');
var build = require('../helper/builder');
var BiddingMapLog = require('../config/mongodb').BiddingMapLog;

// ==================================
// INIT BID REQUEST PARAM
// ==================================

var bidTimeout = 120;
var isBidTimeout = false;

var lastBidId = "";

// ==================================
// LOAD ALL BANNER TO CACHE
// ==================================
var BGateAgent = require('../helper/BgateAgent.js');
var Publisher = require('../helper/Publisher.js');

exports.index = function(req, res) {
	console.log("Send: ", "ERR: ["+ new Date() +"] POST method only.");
	res.send("ERR: POST method only.");
	//res.jsonp(BGateAgent.agents);
	//res.send("Hello!!");
};

// ==================================
// BID LISTENER
// ==================================
exports.bids = function(req, res) {
	var __x = ce.clone(BGateBidding);

	return __x.init(req, res);
}

var BGateBidding = {

	biddingQueue : {},

	init: function(req, res) {
		var biddingID = uuid.v1();
		var bidReq = bidReq || {};
		bidReq[biddingID] = {
			id: '',
			imp: [],
			tmax: 120,
			site: {
				"id": "-1",
				"domain" : "",
				"cat" : [],
				"page" : "",
				"publisher" : {}
			},
			user: {"id": ""},
			device: {"ua": "", "ip": ""},
			at: 0,
			cur: ["USD"]
		};

		isBidTimeout = false;

		// Reset bidding queue
		BGateBidding.biddingQueue[biddingID] = {created: 0, data: []};

		var logDatetime = new Date();

		var bgate_client_req = req.body;

		console.info("============================================================");
		console.info("TRACK: ["+ logDatetime +"] On Bid request");
		// ==================================
		// VALIDATE BIDS REQUEST
		// ==================================
		if (!bgate_client_req) {
			console.error("ERR: ["+ logDatetime +"] Can not parse bid request");
			return res.status(500).json("ERR: ["+ logDatetime +"] Can not parse bid request");
		}
		else if (!bgate_client_req.id) {
			console.error("ERR: ["+ logDatetime +"] Missing bid request id.");
			return res.status(500).json("ERR: ["+ logDatetime +"] Missing bid request id.");
		}
		else if (!bgate_client_req.imp || !_.isArray(bgate_client_req.imp)) {
			console.error("ERR: ["+ logDatetime +"] Missing bid request imp.");
			return res.status(500).json("ERR: ["+ logDatetime +"] Missing bid request imp.");
		}

		// ==================================
		// COLLECT DATA
		// ==================================
		bidReq[biddingID].id = bgate_client_req.id;
		if (lastBidId && lastBidId == bidReq[biddingID].id) {
			var s = "ERR: ["+ logDatetime +"] "+ lastBidId +" is aldready in process.";
			console.error(s);
			res.status(500).json(s).end();
			return false;
		}
		lastBidId = bidReq[biddingID].id;

		bidReq[biddingID].at = bgate_client_req.at || bidReq[biddingID].at;
		if (bgate_client_req.device) {
			bidReq[biddingID].device.ua = bgate_client_req.device.ua || bidReq[biddingID].device.ua;
			bidReq[biddingID].device.ip = bgate_client_req.device.ip || bidReq[biddingID].device.ip;
		}
		if (bgate_client_req.site) {
			bidReq[biddingID].site.id = bgate_client_req.site.id || bidReq[biddingID].site.id;
			bidReq[biddingID].site.domain = bgate_client_req.site.domain || bidReq[biddingID].site.domain;
			bidReq[biddingID].site.cat = bgate_client_req.site.cat || bidReq[biddingID].site.cat;
			if (!_.isArray(bidReq[biddingID].site.cat)) {
				console.error("ERR: ["+ logDatetime +"] Imp ID ["+ bidReq[biddingID].id +"]: site.cat must is array.");
				return res.status(500).json("ERR: ["+ logDatetime +"] Imp ID ["+ bidReq[biddingID].id +"]: site.cat must is array.");
			}

			bidReq[biddingID].site.page = bgate_client_req.site.page || bidReq[biddingID].site.page;
			if (bgate_client_req.site.publisher) bidReq[biddingID].site.publisher = bgate_client_req.site.publisher;
		}

		// Local bidding require Adzone info 
		//if (bgate_client_req.adzone) bidReq.adzone = bgate_client_req.adzone;
		//if (!bidReq.adzone || !bidReq.adzone.id) {
		//	return res.status(500).json("ERR: Missing Adzone info.");
		//}

		// Bid Timeout 
		if (bgate_client_req.tmax && bgate_client_req.tmax > 0) bidReq[biddingID].tmax = bgate_client_req.tmax || bidTimeout;

		var results = [];
		var isBreak = false; var isError = false;
		bgate_client_req.imp.forEach(function(i) {
			if (isBreak == true) return false;

			// ==================================
			// GOT BANNER FROM REQUEST
			// ==================================
			
			if (!i.id || i.id == '' || i.id == false) return;
			if (!_.isObject(i.banner) && !_.isObject(i.video)) return;

			var impType = _.isObject(i.banner) ? 'banner' : 'video';

			// TODO: now bgate only support banner
			if (impType != 'banner') return false;

			var newImp = newImp || {};
			newImp[biddingID] = {};
			newImp[biddingID].id = parseInt(i.id);
			newImp[biddingID].banner = {
				width: i.banner.w || 0,
				height: i.banner.h || 0,
				pos: i.banner.pos || 0
			};
			newImp[biddingID].bidfloor = i.bidfloor || 0.0; // bidfloor is float (USD)
			newImp[biddingID].cat = bidReq[biddingID].site.cat;

			// Check adzone 
			var adzoneInfo = BGateBidding.getAdzone(newImp[biddingID].id);
			// console.error("adzoneInfo", adzoneInfo);
			if (adzoneInfo == null) {
				isBreak = true; isError = true;
				console.error("ERR: ["+ logDatetime +"] Adzone ["+ newImp[biddingID].id +"] not exists! Close bidding and send out empty response.");
				res.status(400).end();
				return false;
			}

			// Reload banner size 
			newImp[biddingID].banner.width = adzoneInfo.Width;
			newImp[biddingID].banner.height = adzoneInfo.Height;

			// Adzone Bid req counter 
			adzoneInfo.TotalRequests++;
			
			bidReq[biddingID].imp.push(newImp[biddingID]);

			console.log("========= REQUEST "+ newImp[biddingID].id +" =========");
			console.log(newImp[biddingID]);
			console.log("===============================");

			// ==================================
			// PROCESSING BIDDING FOR EACH AGENT
			// ==================================
			_.map(BGateAgent.agents, _.curry(BGateBidding.bid)(cloneObject(newImp[biddingID]), biddingID));

			console.log("Find banner with: width = " + newImp[biddingID].banner.width + ", height = " + newImp[biddingID].banner.height + ", bidfloor = " + newImp[biddingID].bidfloor)
		});

		// ==================================
		// WAITING FOR BIDDING FROM AGENT
		// ==================================
		console.time("TIMER: BIDDNG ...");
		var timeoutQueue = timeoutQueue || {};
		timeoutQueue[biddingID] = setTimeout(function() {
			if (isBreak == true) return false;

			// ==================================
			// WHO'S WIN?
			// ==================================
			if (!BGateBidding.biddingQueue[biddingID].data) return BGateBidding.generateEmptyResponse(res);

			// var choosen = BGateBidding.biddingQueue[biddingID].data;
			var choosen = choosen || {};
			choosen[biddingID] = _.sortByOrder(
				BGateBidding.biddingQueue[biddingID].data, 
				['BidAmount'],
				[false]
			);

			// ==================================
			// GENERATE RESPONSE 
			// ==================================
			// console.log("|||||||||||||||||||||||||||=============> Gen Response for req ["+ biddingID +"]: ", win[0].impId)
			//console.error("-----------------------------------------------------> ", bidReq.id, " - ", win[0].impId)
			
			// console.error("Current queue: ", JSON.stringify(biddingQueue));

			BGateBidding.generateBidResponse(res, bidReq[biddingID], [choosen[biddingID][0]], biddingID);

			// Save Bidding Mapper 
			console.time("TIMER: Save Bid Mapper to Database");
			BGateBidding.biddingQueue[biddingID].data.forEach(function(bidding) {
				new BiddingMapLog({
					impId: bidding.impId, 
					AdzoneMapBannerId: build.getAdzoneMapBannerId(bidReq[biddingID].id, bidReq[biddingID].site.id),
					PublisherAdZoneID: bidReq[biddingID].site.id, 
					AdCampaignBannerID: bidding.AdCampaignBannerPreviewID,
					Price:  bidding.BidAmount || 0.0,
					status: 'error', 
					created: logDatetime
				}).save(function(err, model) {
					if (err) console.error(err);
					else console.log('[' + logDatetime + "] Saved Bid Mapper id " + model.id + ' for ['+ bidReq[biddingID].site.id +', '+ bidding.AdCampaignBannerPreviewID +']');
				});
			});
			console.timeEnd("TIMER: Save Bid Mapper to Database");

			// Save bid response
			console.timeEnd("TIMER: BIDDNG ...");
		}, bidReq[biddingID].tmax); // 


		//clearTimeout(biddingTimeout);
	},


	/**
	 * Bidding 
	 */
	bid : function(newImp, biddingID, agent) {
		var logDatetime = new Date();
		
		if (isBidTimeout) return false; // Bidding timeout
		if (!agent || !newImp) return false;
		if (!agent.banner) return false;

		if (! agent.user_enabled || parseInt(agent.user_enabled) == 0) {
			console.info("INFO: ["+ logDatetime +"] Agent ["+ agent.UserID +"] is disactive, skip.");
			return false;
		}

		console.log("TRACK: Run Agent " + agent.user_email + " ["+ agent.UserID +"]");

		agent.banner.forEach(function(banner) {
			// Banner is disactive 
			if ((!banner.Active || banner.Active == 0)) {
				console.info("INFO: ["+ logDatetime +"] Agent ["+ agent.UserID +"] Creative "+ banner.AdCampaignBannerPreviewID +" is disactive ["+ banner.Approval +"], skip me.");
				return false;
			}

			// Check bid type 
			//if (banner.BidType) {
				
				// console.info("INFO: ["+ logDatetime +"] Creative "+ banner.AdCampaignBannerPreviewID +" bidtype: ", config.bid_type[banner.BidType]);
			//}

			banner.BidType = parseInt(banner.BidType);

			// CPM Only 
			if (banner.BidType != config.bid_type.CPM) {
				console.error("INFO: ["+ logDatetime +"] Creative "+ banner.AdCampaignBannerPreviewID +", CPM bid type only, skip me.");
				return false;
			}

			// Check bid floor
			if (newImp.bidfloor && newImp.bidfloor > 0)
			{
				if ( 
					(banner.BidType == config.bid_type.CPM && banner.BidAmountCPM < newImp.bidfloor)
				||	(banner.BidType == config.bid_type.CPC && banner.BidAmount < newImp.bidfloor)
				) {
					console.info("INFO: ["+ logDatetime +"] Agent ["+ agent.UserID +"] Creative "+ banner.AdCampaignBannerPreviewID +" is not pass bidfloor ()");
					return false;
				}
			}

			// Check width and height
			if (banner.Width != newImp.banner.width || banner.Height != newImp.banner.height) return false;

			// Check `FrequencyCap`
			if (banner.FrequencyCap) {

				// FrequencyCap from hour to hour
				if (banner.FreCapTimeFromHr && banner.FreCapTimeToHr && (banner.FreCapShowTime == 0 || !banner.FreCapShowTime)) {
					var currentHour = logDatetime.getHours();
					if (!(banner.FreCapTimeFromHr <= currentHour && currentHour <= banner.FreCapTimeToHr)) {
						console.info("INFO: ["+ logDatetime +"] Agent ["+ agent.UserID +"] Creative "+ banner.AdCampaignBannerPreviewID +" FrequencyCap set hour from " + banner.FreCapTimeFromHr + "h to " + banner.FreCapTimeToHr + "h, so skip me.");
						return false;
					}
				}

				// FrequencyCap x time in a day
				else if (banner.FreCapShowTime && banner.currentFreCapShowTime < 0) {
					console.info("INFO: ["+ logDatetime +"] Agent ["+ agent.UserID +"] Creative " + banner.AdCampaignBannerPreviewID + " pass to FrequencyCap, so skip me.");
					return false;
				}

				// Else
				else if (banner.FreCapShowTime) banner.currentFreCapShowTime--;
			}

			// Check IAB Cat
			if (newImp.cat.length && banner.IABAudienceCategory) {
				var ok = false;
				for (var i = 0; i < newImp.cat.length; i++) {
					if (banner.IABAudienceCategory == newImp.cat[i]) ok = true;
				}
				if (!ok) {
					console.info("INFO: ["+ logDatetime +"] Agent ["+ agent.UserID +"] Creative "+ banner.AdCampaignBannerPreviewID +" with cat["+ banner.IABAudienceCategory +"] doesn't pass to imp cat request ", JSON.stringify(newImp.cat, null, 4));
					return false;
				}
			}

			// Check MaximumBudget
			if (banner.MaximumBudget > 0 && banner.CurrentSpend >= banner.MaximumBudget) {
				console.error("INFO: ["+ logDatetime +"] Agent ["+ agent.UserID +"] Creative "+ banner.AdCampaignBannerPreviewID +" pass to MaximumBudget, skip me.");
				return false;
			}

			// TODO: TargetDaily

			// Check TargetMax

			// -------------------------------
			// Pass all, and gone here
			// -------------------------------
			// Asign to request imp id
			banner.impId = newImp.id;
			// console.error("------------------------------------ CLONE IMPID: ", banner.impId);

			console.log("TRACK: ["+ logDatetime +"] DO BID BANNER ", banner.AdCampaignBannerPreviewID, " of agent: ", agent.user_email);

			// Increase bid counter 
			banner.BidsCounter++;

			// Start do bidding
			BGateBidding.doBid(banner, biddingID);
		});
	},


	/**
	 * Do Bidding
	 *
	 * @param banner BannerObject
	 * @param biddingID int
	 */
	doBid : function(banner, biddingID) {
		if (!banner) return false;

		console.info("DOBID: Creative ["+ banner.AdCampaignBannerPreviewID +"] bid [$"+ banner.BidAmount +"] as ", BGateBidding.getBidType(banner.BidType));

		// console.log("BID BANNER: ", banner);
		BGateBidding.biddingQueue[biddingID].data.push(banner);
	},

	generateEmptyResponse : function(res) {
		isBidTimeout = true; // Generate response, also mean timeout for bidding
		res.status(204).send().end();

		console.log(">>>> INFO: ["+ new Date() +"] Generate empty response.");
		console.info("============================================================");
	},

	generateBidResponse : function(res, bidReq, bidRes, biddingID) {
		var logDatetime = new Date();
		console.time("TIMER: Generate Bid Response");

		// console.error("-----------------------------------------------------> ", bidReq.id, " - ", bidRes[0].impId)

		isBidTimeout = true; // Generate response, also mean timeout for bidding
		if (!bidRes || !bidReq) {
			
			return BGateBidding.generateEmptyResponse(res);
		}

		//console.log("Bid response data: ", bidRes);

		if (!bidRes.length) {
			return BGateBidding.generateEmptyResponse(res);
		}

		// TODO: Support multi bidding
		var bid_res = bidRes[0] || false;

		// Not bid response
		if (!bid_res) return BGateBidding.generateEmptyResponse(res);

		bid_res.bgateSalt = build.genHash('123456');// bcrypt.genSaltSync(10);
		bid_res.mapperId = build.getAdzoneMapBannerId(
									bidReq.id, // Bid Request ID 
									bidReq.site.id); // Adzone ID ~ impId
		//console.log('BID RESPONSE DATA: ', bidRes);

		// ===============================================
		// BUILD RESPONSE
		// ===============================================
		var bidResponse = {};
		bidResponse.id = bidReq.id; // Bid response id 

		bidResponse.seatbid = [
			{
				bid: [
					{
						// Bid ID
						id : bid_res.mapperId,

						// Imp ID
						impid: bid_res.impId,

						// Price
						price: bid_res.BidAmount || 0.0,

						// Adm - Ad tag
						adm: build.AdmTag(bidReq, bid_res),

						// Domain 
						adomain: [bid_res.LandingPageTLD || ""],

						// Creative ID for reporting content issues or defects. This could also be used as a
						// reference to a creative ID that is posted with an exchange.
						crid: bid_res.AdCampaignBannerPreviewID.toString(),

						// Campaign ID or similar that appears within the ad markup.
						cid: bid_res.AdCampaignID.toString(),

						// Win Notice
						nurl: build.WinBidUrl(bidReq, bid_res), 

						// Sample image URL (without cache busting) for content checking
						lurl: '',

						// TODO: ext later 
						ext: {},

						next_highest_bid_price: 0.0,

						// Status 
						status: 1,

						adid: bid_res.AdCampaignBannerPreviewID || 0,
					}
				]
			}
		];

		// Debug isolation multi bid
		// console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`> bidResponse ["+ biddingID +"] ", bidResponse.seatbid[0]);

		res.json(bidResponse).end();
		console.log(">>> ["+ logDatetime +"] SEND BIDDING RESPONSE!!");
		console.info("============================================================");

	    console.timeEnd("TIMER: Generate Bid Response");
	},

	filterBannerResult : function(winBanners) {
		if (!winBanners) return [];

		// TODO: More filter here

		return winBanners[0];
	},

	getAdzone : function(adzoneId) {
		adzoneId = parseInt(adzoneId);

		if (!Publisher || !Publisher.data) return null;

		//console.info(JSON.stringify(Publisher.data, null, 4));

		var isBreak = false;
		var result = null;
		Publisher.data.forEach(function(pub) {
			if (isBreak || !pub.Adzone) return false;

			pub.Adzone.forEach(function(adzone) {
				if (adzone.PublisherAdZoneID == adzoneId) {
					result = adzone;
					isBreak = true;
				}
			})

		});

		// console.info("Checking Adzone id ", adzoneId, ": ", result);

		return result;
	},

	getBidType : function(bidTypeId) {
		if (bidTypeId == config.bid_type.CPM) return 'CPM';

		return 'CPC';
	}
}

var cloneObject = function(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
 
    var temp = obj.constructor(); // give temp the original obj's constructor
    for (var key in obj) {
        temp[key] = cloneObject(obj[key]);
    }
 
    return temp;
}