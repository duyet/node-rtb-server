'use strict';

var moment = require('moment');
var openrtb = require('../lib/openrtb');
var _ = require('lodash');

var config = require('../config/config');

var Model = require('../config/db').Model;
var checkit  = require('checkit');
var Promise  = require('bluebird');
var bcrypt   = require('bcrypt');

var AdCampaignBannerPreview = Model.extend({
	tableName: 'AdCampaignBannerPreview',
	idAttribute: 'AdCampaignBannerPreviewID'
});

// ==================================
// LOAD ALL BANNER TO CACHE
// ==================================
var BGateAgent = {
	listBanner : [],

	init : function() {
		new AdCampaignBannerPreview().fetchAll().then(function(collection) {
			collection.forEach(function(banner) {
				BGateAgent.listBanner.push(banner.attributes);
			});
		}).then(function() {
			BGateAgent.listBanner = _.sortBy(BGateAgent.listBanner, function(n) {
				return n.BidAmount;
			});

			console.log("Number of banner in memmory: " + _.size(BGateAgent.listBanner));
			console.log(BGateAgent.listBanner);
		})		
	}

};

BGateAgent.init();

exports.index = function(req, res) {
	res.send("Hello!!");
};

exports.bids = function(req, res) {
	console.log("TRACK: On Bid request - ", moment.utc().format());

    // ==================================
    // INIT PARAM
    // ==================================
    var bidReq = {
    	id: '',
    	imp: [],
    };

	// ==================================
	// VALIDATE BIDS REQUEST
	// ==================================
	if (!req.body) return res.status(500).json("ERR: Can not parse bid request");
	if (!req.body.id) return res.status(500).json("ERR: Missing bid request id.");
	if (!req.body.imp || !_.isArray(req.body.imp)) return res.status(500).json("ERR: Missing bid request imp.");

	// ==================================
	// COLLECT DATA
	// ==================================
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

		console.log("Find banner with: width = " + newImp.banner.width + ", height = " + newImp.banner.height + ", bidfloor = " + newImp.bidfloor)
		var winBanners = [];
		BGateAgent.listBanner.forEach(function(banner) {
			if (!passSelfBannerFilter(banner)) return;
			if (banner.Width == newImp.banner.width && banner.Height == newImp.banner.height && banner.BidAmount >= newImp.bidfloor) {
				var b = banner;
				// Asign to request imp id
				b.impId = newImp.id;

				winBanners.push(b);
			}
		});
		console.log('---> ', winBanners);

		// TODO: More filter
		// ...........................
		var banner = filterBannerResult(winBanners);
		results.push(banner);
	});

	// ==================================
	// GENERATE RESPONSE 
	// ==================================
	generateBidResponse(res, bidReq, results);
};

var generateBidResponse = function(res, bidReq, bidRes) {
	if (!bidRes || !bidReq) {
		console.log('TRACK: No response.');
		return res.status(204).send();
	}

	console.log("Bid response data: ", bidRes);

    var builder = openrtb.getBuilder({builderType:'bidResponse'}); 

    var bgateSalt = bcrypt.genSaltSync(10);

    var bids = [];
    bidRes.forEach(function(bid_res) {
    	if (!bid_res) return;
    	var bid = {
			status: 1,
			clearPrice: 0.9,
			adid: 1,
			id: bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bgateSalt),
			impid: bid_res.impId,
			price: bid_res.BidAmount || 0,
			nurl: config.domain + ':' + config.port + '/' + config.winPath + '?pid='+ bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bgateSalt) +'&data=OuJifVtEK&price=${AUCTION_PRICE}',
			adm: '{"native":{"assets":[{"id":0,"title":{"text":"Test Campaign"}},{"id":1,"img":{"url":"http://cdn.exampleimage.com/a/100/100/2639042","w":100,"h":100}},{"id":2,"img":{"url":"http://cdn.exampleimage.com/a/50/50/2639042","w":50,"h":50}},{"id":3,"data":{"value":"This is an amazing offer..."}},{"id":5,"data":{"value":"Install"}}],"link":{"url":"http://trackclick.com/Click?data=soDvIjYdQMm3WBjoORcGaDvJGOzgMvUap7vAw2"},"imptrackers":["http://trackimp.com/Pixel/Impression/?bidPrice=${AUCTION_PRICE}&data=OuJifVtEKZqw3Hw7456F-etFgvhJpYOu0&type=img"]}}',
			cid: '9607',
			crid: '335224',
			iurl: 'http://cdn.testimage.net/1200x627.png',
			adomain: [bid_res.LandingPageTLD || ""] 
		};

        bids.push(bid);
    });

	if (!bids.length) {
		console.log('TRACK: No response.');
		return res.status(204).send();
	}

    builder
    .timestamp(moment.utc().format())
	.status(1)
    .bidderName('test-bidder')
    .seatbid([{
		bid: bids
	}])
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
		if (moment().diff(startDate, "seconds") > 0)
	}
}