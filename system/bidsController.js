'use strict';

var moment = require('moment');
var openrtb = require('../lib/openrtb');
var _ = require('lodash');

var config = require('../config/config');

var Model = require('../config/db').Model;
var checkit  = require('checkit');
var bcrypt   = require('bcrypt');

var DemandCustomerInfo = Model.extend({
	tableName: 'DemandCustomerInfo',
	idAttribute: 'DemandCustomerInfoID'
});

var auth_Users = Model.extend({
	tableName: 'auth_Users',
	idAttribute: 'user_id'
});

var AdCampaignPreview = Model.extend({
	tableName: 'AdCampaignPreview',
	idAttribute: 'AdCampaignPreviewID'
});

var AdCampaignBannerPreview = Model.extend({
	tableName: 'AdCampaignBannerPreview',
	idAttribute: 'AdCampaignBannerPreviewID'
});

// ==================================
// LOAD ALL BANNER TO CACHE
// ==================================
var BGateAgent = {
	agents : [],
	listBanner : [],

	init : function(next) {
		new DemandCustomerInfo({}).fetchAll().then(function(_demandUsers) {
			if (!_demandUsers) return;



			_demandUsers.forEach(function(_demandUser) {
				var demandUser = _demandUser.attributes;
				var adv = {};

				new auth_Users({
					DemandCustomerInfoID: demandUser.DemandCustomerInfoID, 
					user_enabled: 1, 
					user_verified: 1, 
					user_agreement_accepted: 1
				}).fetch().then(function(user) {
					if (!user) return false;
					var user = user.attributes;

					if (!user) return false;
					user.banner = [];

					new AdCampaignBannerPreview({UserID: user.UserID}).fetchAll().then(function(collection) {
						collection.forEach(function(banner) {
							user.banner.push(banner.attributes);

							BGateAgent.listBanner.push(banner.attributes);
						});

						//console.log(_.merge(user, demandUser));
						BGateAgent.agents.push(_.merge(user, demandUser));
					});

				});

			});
		}).then(function() {
			next();	
		});
	},

	getAgents: function() {
		return BGateAgent.agents;
	}
};

BGateAgent.init(function() {
	console.log(BGateAgent.agents);
});


exports.index = function(req, res) {
	res.jsonp(BGateAgent.agents);
	//res.send("Hello!!");
};

// ==================================
// INIT BID REQUEST PARAM
// ==================================
var bidReq = {
	id: '',
	imp: [],
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
// BID LISTENER
// ==================================
exports.bids = function(req, res) {
	isBidTimeout = false;

	console.log("TRACK: On Bid request - ", moment.utc().format());

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
				b.auctionId = buildAuctionId(b.AdCampaignBannerPreviewID);

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
	var biddingTimeout = setTimeout(function() {
		// Choose win bidding
		console.log("biddingQueue", biddingQueue);

		// ==================================
		// WHO'S WIN?
		// ==================================
		if (!biddingQueue) return generateEmptyResponse(res);
		var results = [biddingQueue[0]];

		// ==================================
		// GENERATE RESPONSE 
		// ==================================
		generateBidResponse(res, bidReq, results);

	}, bidTimeout);

	//clearTimeout(biddingTimeout);
};

var generateEmptyResponse = function(res) {
	isBidTimeout = true; // Generate response, also mean timeout for bidding
	console.log('TRACK: No response.');
	return res.status(204).send();
}

var generateBidResponse = function(res, bidReq, bidRes) {
	isBidTimeout = true; // Generate response, also mean timeout for bidding
	if (!bidRes || !bidReq) {
		console.log('TRACK: No response.');
		return generateEmptyResponse(res);
	}

	//console.log("Bid response data: ", bidRes);

    var builder = openrtb.getBuilder({builderType:'bidResponse'}); 
	if (!bidRes.length) return generateEmptyResponse(res);

	// TODO: Support multi bidding
	var bid_res = bidRes[0] || false;

	if (!bid_res) return generateEmptyResponse(res);

	bid_res.bgateSalt = bcrypt.genSaltSync(10);
	//console.log('BID RESPONSE DATA: ', bidRes);

	// Build response
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
					nurl: buildWinBidUrl(bid_res), // Win Notice
					adm: buildAdmTag(bid_res), // Ad tag
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
    	console.log("SEND BIDDING RESPONSE!!");
        res.jsonp(bidResponse);
    });
}

var filterBannerResult = function(winBanners) {
	if (!winBanners) return [];

	// More filter here

	return winBanners[0];
}

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
}

var buildWinBidUrl = function(bid_res) {
	var url = '';
	url += config.domain + ':' + config.port + '/' + config.winPath;
	url += '?pid='+ bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bid_res.bgateSalt);
	url += '&cid=' + bid_res.AdCampaignBannerPreviewID;
	url += '&type=win';
	url += '&impId=' + bid_res.impId;
	url += '&auctionId=' + bid_res.auctionId;
	url += '&site=' + bidReq.site.page;
	url += '&data=OuJifVtEK&price=${AUCTION_PRICE}';

	return url;
}

var buildClickTrackerUrl = function(bid_res) {
	var url = '';
	url += config.domain + ':' + config.port + '/' + config.winPath;
	url += '?pid='+ bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bid_res.bgateSalt);
	url += '&cid=' + bid_res.AdCampaignBannerPreviewID;
	url += '&type=click_tracker';
	url += '&impId=' + bid_res.impId;
	url += '&auctionId=' + bid_res.auctionId;
	url += '&site=' + bidReq.site.page;
	url += '&data=OuJifVtEK&price=${AUCTION_PRICE}';

	return url;
}

var buildAuctionId = function(bannerId) {
	var id = bcrypt.hashSync(String(bannerId) + "/" + String(moment()), bcrypt.genSaltSync(10))
	// TODO: Save auctionId to db

	return id;
};

var buildAdmTag = function(bid_res) {
	if (!bid_res) return '';
	
	var jsdom = require("jsdom").jsdom;
	var window = jsdom().parentWindow;

	var admTag = window.document.createElement('iframe');
	
		var clickTag = window.document.createElement('a');
		clickTag.href = buildClickTrackerUrl(bid_res);

			var imgTag = window.document.createElement('img');
			imgTag.src = bid_res.AdUrl;

		clickTag.appendChild(imgTag);
	admTag.appendChild(clickTag);

	return admTag.outerHTML;
}

var bid = function(newImp, agent) {
	if (isBidTimeout) return false; // Bidding timeout
	if (!agent || !newImp) return false;
	if (!agent.banner) return false;

	agent.banner.forEach(function(banner) {
		if (!passSelfBannerFilter(banner)) return;

		// Check bid floor
		if (banner.BidAmount < newImp.bidfloor) return false;

		// Check width and height
		if (banner.Width != newImp.banner.width || banner.Height != newImp.banner.height) return false;

		// -------------------------------
		// Pass all, and gone here
		// -------------------------------
		// Asign to request imp id
		b.impId = newImp.id;
		b.auctionId = buildAuctionId(b.AdCampaignBannerPreviewID);

		// Start do bidding
		doBid(b);
	});
}

var doBid = function(banner) {
	if (!banner) return false;

	console.log("TRACK: DO BID!");
	biddingQueue.push(banner);
}

