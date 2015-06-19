'use strict';

var moment = require('moment');
//var openrtb = require('../lib/openrtb');
var _ = require('lodash');

var config = require('../config/config');

var Model = require('../config/db').Model;

var build = require('../helper/builder');

// ==================================
// INIT BID REQUEST PARAM
// ==================================
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

var bidTimeout = 1;
var biddingQueue = [];
var isBidTimeout = false;

// ==================================
// LOAD ALL BANNER TO CACHE
// ==================================
var BGateAgent = require('../helper/BgateAgent.js');


exports.index = function(req, res) {
	res.jsonp(BGateAgent.agents);
	//res.send("Hello!!");
};

// ==================================
// BID LISTENER
// ==================================
exports.bids = function(req, res) {
	isBidTimeout = false;

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
		bidReq.site.page = req.body.site.page || bidReq.site.page;
		if (req.body.site.publisher) bidReq.site.publisher = req.body.site.publisher;
	}

	// Bid Timeout 
	if (req.body.tmax && req.body.tmax > 0) bidReq.tmax = bidTimeout = req.body.tmax;

	var results = [];
	req.body.imp.forEach(function(i) {
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

		console.log("========= REQUEST BANNER =========");
		console.log(newImp);
		console.log("==================================");

		// ==================================
		// PROCESSING FINDconsole.log('---> ', winBanners);
		// ==================================
		
		/*var result = _.result(_.find(BGateAgent.listBanner, function(banner) {
			//console.log("Find banner with: width = " + newImp.banner.width + ", height = " + newImp.banner.height + ", bidfloor = " + newImp.bidfloor)
			console.log("BANNER >> width = " + banner.Width + ", height = " + banner.Height + ", BidAmount = " + banner.BidAmount);
			if (banner.Width == newImp.banner.width && banner.Height == newImp.banner.height) console.log("Got size match!!");
			if (banner.BidAmount >= newImp.bidfloor) console.log("Got bidfloor match!!");
			return banner.Width == newImp.banner.width && banner.Height == newImp.banner.height && banner.BidAmount >= newImp.bidfloor;
		}), 'Width,Height');*/

		_.map(BGateAgent.agents, _.curry(bid)(newImp));

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
		// Choose win bidding
		//console.log("biddingQueue", biddingQueue);

		// ==================================
		// WHO'S WIN?
		// ==================================
		if (!biddingQueue) return generateEmptyResponse(res);
		var results = [biddingQueue[0]];

		// ==================================
		// GENERATE RESPONSE 
		// ==================================
		generateBidResponse(res, bidReq, results);

		console.timeEnd("TIMER: BIDDNG ...");
	}, bidTimeout);


	//clearTimeout(biddingTimeout);
};

var generateEmptyResponse = function(res) {
	isBidTimeout = true; // Generate response, also mean timeout for bidding
	console.log('TRACK: No response.');
	console.info("============================================================");
	console.info("============================================================");
	return res.status(204).send();
}

var generateBidResponse = function(res, bidReq, bidRes) {
	console.time("TIMER: Generate Bid Response");

	isBidTimeout = true; // Generate response, also mean timeout for bidding
	if (!bidRes || !bidReq) {
		console.log('TRACK: No response.');
		return generateEmptyResponse(res);
	}

	//console.log("Bid response data: ", bidRes);

	if (!bidRes.length) return generateEmptyResponse(res);

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
					crid: bid_res.AdCampaignBannerPreviewID,

					// Campaign ID or similar that appears within the ad markup.
					cid: bid_res.AdCampaignPreviewID,

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

	console.log("SEND BIDDING RESPONSE!!");
	console.info("============================================================");
	console.info("============================================================\n\n");

    res.jsonp(bidResponse);

	/*
    builder
    .timestamp(moment.utc().format())
	.status(1)
    .bidderName('bgate')
    .seatbid([
        {
            bid: [
                {
					status: 1,
					adid: bid_res.AdCampaignBannerPreviewID || 0,
					id: bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bid_res.bgateSalt),
					impid: bid_res.impId,
					price: bid_res.BidAmount || 0,
					nurl: build.WinBidUrl(bidReq, bid_res), // Win Notice
					adm: build.AdmTag(bid_res), // Ad tag
					cid: bid_res.impId,
					crid: bid_res.impId,
					iurl: bid_res.AdUrl, // Image URL
					adomain: [bid_res.LandingPageTLD || ""]
                } 
            ]
        }
    ])
    .build()
    .then(function(bidResponse){
    	
    });
	*/

    console.timeEnd("TIMER: Generate Bid Response")
}

var filterBannerResult = function(winBanners) {
	if (!winBanners) return [];

	// More filter here

	return winBanners[0];
}

var bid = function(newImp, agent) {
	if (isBidTimeout) return false; // Bidding timeout
	if (!agent || !newImp) return false;
	if (!agent.banner) return false;

	agent.banner.forEach(function(banner) {
		// Check bid floor
		if (banner.BidAmount < newImp.bidfloor) return false;

		// Check width and height
		if (banner.Width != newImp.banner.width || banner.Height != newImp.banner.height) return false;


		// -------------------------------
		// Pass all, and gone here
		// -------------------------------
		// Asign to request imp id
		banner.impId = newImp.id;
		banner.auctionId = build.AuctionId(banner.AdCampaignBannerPreviewID);

		// Start do bidding
		doBid(banner);
	});
}

var doBid = function(banner) {
	if (!banner) return false;

	console.log("TRACK: DO BID!");
	biddingQueue.push(banner);
}