'use strict';

var Model = require('../config/db').Model;
var tracker = require('pixel-tracker');

// ==================================
// DATABASE CONSTRUCT
// ==================================

var RawImp = Model.extend({
	tableName: 'RawImp',
	idAttribute: 'RawImpID'
});

// TODO: Fix duplicate impTracker
exports.tracker = function(req, res) {
	tracker.use(function (error, result) {
	    // console.log(JSON.stringify(result, null, 2));

	    var data = {
	    	PublisherAdZoneID : result.PublisherAdZoneID || 0,
	    	AdCampaignBannerID : result.AdCampaignBannerID || 0,
	    	UserIP : result.geo.ip || '',
	    	Country : JSON.stringify(result.language) || '',
	    	Price : result.Price || 0.0
	    };

	    //console.error("Call meeeeeeeeeeeeeeeeeeeeeee");

	    if (!data.PublisherAdZoneID || !data.AdCampaignBannerID) {
	    	console.error("ERROR: ImpTracker missing AdCampaignBannerID OR PublisherAdZoneID");
	    } else {
	    	new RawImp(data).save().then(function(model) {
	    		console.log("Saved ImpRaw id " + model.id);
	    		// console.error(model);
	    	});
	    }
	});

	res.header('Content-Type', 'image/gif');
	return tracker.middleware(req, res);
};