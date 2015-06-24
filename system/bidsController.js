'use strict';

var moment = require('moment');
var _ = require('lodash');
var config = require('../config/config');
var build = require('../helper/builder');

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

	console.info("============================================================");
	console.info("============================================================");
	console.log("TRACK: On Bid request - ", moment.utc().format());
	console.info("============================================================");
	console.info("============================================================");


	// ==================================
	// VALIDATE BIDS REQUEST
	// ==================================
	if (!req.body) return res.status(500).json("ERR: Can not parse bid request");
	if (!req.body.id) return res.status(500).json("ERR: Missing bid request id.");
	if (!req.body.imp || !_.isArray(req.body.imp)) return res.status(500).json("ERR: Missing bid request imp.");

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
			console.error("ERR: ["+ new Date() +"] site.cat must is array.");
			return res.status(500).json("ERR: site.cat must is array.");
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
			console.error("ERR: Adzone "+ newImp.id +" not exists!");
			isBreak = true; isError = true;
			//res.status(400).send();
		}

		bidReq.imp.push(newImp);

		console.log("========= REQUEST BANNER =========");
		console.log(newImp);
		console.log("==================================");

		// ==================================
		// PROCESSING BIDDING FOR EACH AGENT
		// ==================================
		
		_.map(BGateAgent.agents, _.curry(bid)(newImp, biddingQueue));

		console.log("Find banner with: width = " + newImp.banner.width + ", height = " + newImp.banner.height + ", bidfloor = " + newImp.bidfloor)
		
		/*
		var winBanners = [];
		BGateAgent.listBanner.forEach(function(banner) {
			if (!passSelfBannerFilter(banner)) return;
			if (banner.Width == newImp.banner.width && banner.Height == newImp.banner.height && banner.BidAmount >= newImp.bidfloor) {
				var b = banner;
				// Asign to request imp id
				b.impId = newImp.id;
				b.auctionId = build.AuctionId(b.AdCampaignBannerPreviewID);

				winBanners.push(b);
			}
		});
		//console.log('---> ', winBanners);

		// TODO: More filter
		// ...........................
		var banner = filterBannerResult(winBanners);
		results.push(banner);
		*/
	});

	// ==================================
	// WAITING FOR BIDDING FROM AGENT
	// ==================================
	console.time("TIMER: BIDDNG ...");
	var biddingTimeout = setTimeout(function() {
		//if (isError == true) {
		//	console.log("ERR: In error, empty response.");
		//	return false;
		//}
		// Choose win bidding
		//console.log("biddingQueue", biddingQueue);

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

		// TODO: Log win

		// console.log("BID RES:", win);

		// ==================================
		// GENERATE RESPONSE 
		// ==================================
		generateBidResponse(res, bidReq, win);

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
	console.time("TIMER: Generate Bid Response");

	isBidTimeout = true; // Generate response, also mean timeout for bidding
	if (!bidRes || !bidReq) {
		console.log("TRACK: ["+ new Date() +"] No response.");
		return generateEmptyResponse(res);
	}

	//console.log("Bid response data: ", bidRes);

	if (!bidRes.length) {
		console.log("INFO: ["+ new Date() +"] Generate empty response.");
		return generateEmptyResponse(res);
	}

	// TODO: Support multi bidding
	var bid_res = bidRes[0] || false;

	if (!bid_res) return generateEmptyResponse(res);

	bid_res.bgateSalt = build.genHash('123456');// bcrypt.genSaltSync(10);
	//console.log('BID RESPONSE DATA: ', bidRes);

	// ===============================================
	// BUILD RESPONSE
	// ===============================================
	var bidResponse = {};
	bidResponse.id = ""; // Bid response id 

	bidResponse.seatbid = [
		{
			bid: [
				{
					// Bid ID
					id : build.genHash(String(bid_res.AdCampaignBannerPreviewID)), // bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bid_res.bgateSalt)

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

	res.json(bidResponse);
	console.log("SEND BIDDING RESPONSE!!");
	console.info("============================================================");

    console.timeEnd("TIMER: Generate Bid Response")
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
				var currentHour = new Date().getHours();
				if (!(banner.FreCapTimeFromHr <= currentHour && currentHour <= banner.FreCapTimeToHr)) {
					console.info("INFO: [] Creative FrequencyCap set hour from " + banner.FreCapTimeFromHr + "h to " + banner.FreCapTimeToHr + "h, so skip me.");
					return false;
				}
			}

			// FrequencyCap x time in a day
			else if (banner.FreCapShowTime && banner.currentFreCapShowTime < 0) {
				console.info("INFO: ["+ new Date() +"] Creative " + banner.AdCampaignBannerPreviewID + " pass to FrequencyCap, so skip me.");
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
				console.info("INFO: ["+ new Date() +"] Banner with cat["+ banner.IABAudienceCategory +"] doesn't pass to imp cat request ", JSON.stringify(newImp.cat, null, 4));
				return false;
			}
		}

		// -------------------------------
		// Pass all, and gone here
		// -------------------------------
		// Asign to request imp id
		banner.impId = newImp.id;
		banner.auctionId = build.AuctionId(banner.AdCampaignBannerPreviewID);

		console.log("TRACK: ["+ new Date() +"] DO BID BANNER ", banner.AdCampaignBannerPreviewID, " of agent: ", agent.user_email);

		// Start do bidding
		doBid(banner, biddingQueue);
	});
}

var doBid = function(banner, biddingQueue) {
	if (!banner) return false;

	// console.log("BID BANNER: ", banner);
	biddingQueue.push(banner);
}