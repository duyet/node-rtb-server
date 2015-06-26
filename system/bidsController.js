'use strict';

var moment = require('moment');
var _ = require('lodash');
var config = require('../config/config');
var build = require('../helper/builder');
var BiddingMapLog = require('../config/mongodb').BiddingMapLog;

// ==================================
// INIT BID REQUEST PARAM
// ==================================


var bidTimeout = 1;
var isBidTimeout = false;

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
	var bidReq = {
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
	var biddingQueue = [];

	var logDatetime = new Date();

	console.info("============================================================");
	console.info("TRACK: ["+ logDatetime +"] On Bid request");

	// ==================================
	// VALIDATE BIDS REQUEST
	// ==================================
	if (!req.body) {
		console.error("ERR: ["+ logDatetime +"] Can not parse bid request");
		return res.status(500).json("ERR: ["+ logDatetime +"] Can not parse bid request");
	}
	if (!req.body.id) {
		console.error("ERR: ["+ logDatetime +"] Missing bid request id.");
		return res.status(500).json("ERR: ["+ logDatetime +"] Missing bid request id.");
	}
	if (!req.body.imp || !_.isArray(req.body.imp)) {
		console.error("ERR: ["+ logDatetime +"] Missing bid request imp.");
		return res.status(500).json("ERR: ["+ logDatetime +"] Missing bid request imp.");
	}

	// ==================================
	// COLLECT DATA
	// ==================================
	bidReq.id = req.body.id;
	bidReq.at = req.body.at || bidReq.at;
	if (req.body.device) {
		bidReq.device.ua = req.body.device.ua || bidReq.device.ua;
		bidReq.device.ip = req.body.device.ip || bidReq.device.ip;
	}
	if (req.body.site) {
		bidReq.site.id = req.body.site.id || bidReq.site.id;
		bidReq.site.domain = req.body.site.domain || bidReq.site.domain;
		bidReq.site.cat = req.body.site.cat || bidReq.site.cat;
		if (!_.isArray(bidReq.site.cat)) {
			console.error("ERR: ["+ logDatetime +"] Imp ID ["+ bidReq.id +"]: site.cat must is array.");
			return res.status(500).json("ERR: ["+ logDatetime +"] Imp ID ["+ bidReq.id +"]: site.cat must is array.");
		}

		bidReq.site.page = req.body.site.page || bidReq.site.page;
		if (req.body.site.publisher) bidReq.site.publisher = req.body.site.publisher;
	}

	// Local bidding require Adzone info 
	//if (req.body.adzone) bidReq.adzone = req.body.adzone;
	//if (!bidReq.adzone || !bidReq.adzone.id) {
	//	return res.status(500).json("ERR: Missing Adzone info.");
	//}

	// Bid Timeout 
	if (req.body.tmax && req.body.tmax > 0) bidReq.tmax = bidTimeout = req.body.tmax;

	var results = [];
	var isBreak = false; var isError = false;
	req.body.imp.forEach(function(i) {
		if (isBreak == true) return false;

		// ==================================
		// GOT BANNER FROM REQUEST
		// ==================================
		
		if (!i.id || i.id == '' || i.id == false) return;
		if (!_.isObject(i.banner) && !_.isObject(i.video)) return;

		var impType = _.isObject(i.banner) ? 'banner' : 'video';

		// TODO: now bgate only support banner
		if (impType != 'banner') return

		var newImp = {};
		newImp.id = _.trim(i.id);
		newImp.banner = {
			width: i.banner.w || 0,
			height: i.banner.h || 0,
			pos: i.banner.pos || 0
		};
		newImp.bidfloor = i.bidfloor || 0.0; // bidfloor is float (USD)
		newImp.cat = bidReq.site.cat;

		// Check adzone 
		if (!checkAdzoneId(newImp.id)) {
			console.error("ERR: ["+ logDatetime +"] Adzone ["+ newImp.id +"] not exists!");
			isBreak = true; isError = true;
			//res.status(400).send();
		}

		bidReq.imp.push(newImp);

		console.log("========= REQUEST "+ newImp.id +" =========");
		console.log(newImp);
		console.log("==================================");

		// ==================================
		// PROCESSING BIDDING FOR EACH AGENT
		// ==================================
		
		_.map(BGateAgent.agents, _.curry(bid)(newImp, biddingQueue));

		console.log("Find banner with: width = " + newImp.banner.width + ", height = " + newImp.banner.height + ", bidfloor = " + newImp.bidfloor)
	});

	// ==================================
	// WAITING FOR BIDDING FROM AGENT
	// ==================================
	console.time("TIMER: BIDDNG ...");
	var biddingTimeout = setTimeout(function() {

		// ==================================
		// WHO'S WIN?
		// ==================================
		if (!biddingQueue) return generateEmptyResponse(res);

		// console.log("##################", biddingQueue);
		var choosen = _.sortByOrder(
			biddingQueue, 
			['BidAmount'],
			[false]
		);

		// TODO: Log lose

		var win = [choosen[0]];

		// ==================================
		// GENERATE RESPONSE 
		// ==================================
		generateBidResponse(res, bidReq, win);

		// Save Bidding Mapper 
		console.time("TIMER: Save Bid Mapper to Database");
		biddingQueue.forEach(function(bidding) {
			new BiddingMapLog({
				impId: bidding.impId, 
				AdzoneMapBannerId: build.getAdzoneMapBannerId(bidReq.id, bidReq.site.id),
				PublisherAdZoneID: bidReq.site.id, 
				AdCampaignBannerID: bidding.AdCampaignBannerPreviewID,
				Price:  bidding.BidAmount || 0.0,
				status: '',
				created: logDatetime
			}).save(function(err, model) {
				if (err) console.error(err);
				else console.log('[' + logDatetime + "] Saved Bid Mapper id " + model.id + ' for ['+ bidReq.site.id +', '+ bidding.AdCampaignBannerPreviewID +']');
			});
		});
		console.timeEnd("TIMER: Save Bid Mapper to Database");

		// Save bid response
		console.timeEnd("TIMER: BIDDNG ...");
	}, bidTimeout);


	//clearTimeout(biddingTimeout);
};

var generateEmptyResponse = function(res) {
	isBidTimeout = true; // Generate response, also mean timeout for bidding
	console.log('TRACK: No response.');
	console.info("============================================================");
	return res.status(204).send();
}

var generateBidResponse = function(res, bidReq, bidRes) {
	var logDatetime = new Date();
	console.time("TIMER: Generate Bid Response");

	isBidTimeout = true; // Generate response, also mean timeout for bidding
	if (!bidRes || !bidReq) {
		console.log("TRACK: ["+ logDatetime +"] No response.");
		return generateEmptyResponse(res);
	}

	//console.log("Bid response data: ", bidRes);

	if (!bidRes.length) {
		console.log("INFO: ["+ logDatetime +"] Generate empty response.");
		return generateEmptyResponse(res);
	}

	// TODO: Support multi bidding
	var bid_res = bidRes[0] || false;

	// Not bid response
	if (!bid_res) return generateEmptyResponse(res);

	bid_res.bgateSalt = build.genHash('123456');// bcrypt.genSaltSync(10);
	bid_res.mapperId = build.getAdzoneMapBannerId(
								bidReq.id, // Bid Request ID 
								bidReq.site.id); // Adzone ID
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
					cid: bid_res.AdCampaignPreviewID.toString(),

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

	res.json(bidResponse).end();
	console.log("SEND BIDDING RESPONSE!!");
	console.info("============================================================");

    console.timeEnd("TIMER: Generate Bid Response");
}

var filterBannerResult = function(winBanners) {
	if (!winBanners) return [];

	// TODO: More filter here

	return winBanners[0];
};

var checkAdzoneId = function(adzoneId) {
	adzoneId = parseInt(adzoneId);

	if (!Publisher || !Publisher.data) return false;

	//console.info(JSON.stringify(Publisher.data, null, 4));

	var isBreak = false;
	var result = false;
	Publisher.data.forEach(function(pub) {
		if (isBreak) return false;

		if (pub.PublisherAdZoneID == adzoneId) {
			result = true;
			isBreak = true;
		}
	});

	console.info("Checking Adzone id ", adzoneId, ": ", result);

	return result;
}

var bid = function(newImp, biddingQueue, agent) {
	var logDatetime = new Date();
	console.log("TRACK: Run Agent ", agent.user_email);

	if (isBidTimeout) return false; // Bidding timeout
	if (!agent || !newImp) return false;
	if (!agent.banner) return false;

	agent.banner.forEach(function(banner) {
		// Check bid floor
		if (banner.BidAmount < newImp.bidfloor) return false;

		// Check width and height
		if (banner.Width != newImp.banner.width || banner.Height != newImp.banner.height) return false;

		// Check `FrequencyCap`
		if (banner.FrequencyCap) {

			// FrequencyCap from hour to hour
			if (banner.FreCapTimeFromHr && banner.FreCapTimeToHr && (banner.FreCapShowTime == 0 || !banner.FreCapShowTime)) {
				var currentHour = logDatetime.getHours();
				if (!(banner.FreCapTimeFromHr <= currentHour && currentHour <= banner.FreCapTimeToHr)) {
					console.info("INFO: ["+ logDatetime +"] Creative "+ banner.AdCampaignBannerPreviewID +" FrequencyCap set hour from " + banner.FreCapTimeFromHr + "h to " + banner.FreCapTimeToHr + "h, so skip me.");
					return false;
				}
			}

			// FrequencyCap x time in a day
			else if (banner.FreCapShowTime && banner.currentFreCapShowTime < 0) {
				console.info("INFO: ["+ logDatetime +"] Creative " + banner.AdCampaignBannerPreviewID + " pass to FrequencyCap, so skip me.");
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
				console.info("INFO: ["+ logDatetime +"] Creative "+ banner.AdCampaignBannerPreviewID +" with cat["+ banner.IABAudienceCategory +"] doesn't pass to imp cat request ", JSON.stringify(newImp.cat, null, 4));
				return false;
			}
		}

		// -------------------------------
		// Pass all, and gone here
		// -------------------------------
		// Asign to request imp id
		banner.impId = newImp.id;
		console.error("~~~~~>", newImp);
		// banner.auctionId = build.AuctionId(banner.AdCampaignBannerPreviewID);

		console.log("TRACK: ["+ logDatetime +"] DO BID BANNER ", banner.AdCampaignBannerPreviewID, " of agent: ", agent.user_email);

		// Start do bidding
		doBid(banner, biddingQueue);
	});
}

var doBid = function(banner, biddingQueue) {
	if (!banner) return false;

	// console.log("BID BANNER: ", banner);
	biddingQueue.push(banner);
}