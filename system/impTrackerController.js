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

var lastImp = {
	PublisherAdZoneID: 0,
	AdCampaignBannerID: 0, 
	UserIP: '',
	Country: '',
};

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

		if (lastImp) {
			if (lastImp.PublisherAdZoneID == data.PublisherAdZoneID 
				&& lastImp.AdCampaignBannerID == data.AdCampaignBannerID 
				&& lastImp.UserIP == data.UserIP 
				&& lastImp.Country == data.Country)
				return false;
		}

		lastImp = data;

	    //console.error("Call meeeeeeeeeeeeeeeeeeeeeee");

	    if (!data.PublisherAdZoneID || !data.AdCampaignBannerID) {
	    	console.error("ERROR: ImpTracker missing AdCampaignBannerID OR PublisherAdZoneID");
	    } else {
	    	new RawImp(data).save().then(function(model) {
	    		console.log('[' + new Date() + "] Saved ImpRaw id " + model.id + '{'+ data.PublisherAdZoneID +', '+ data.UserIP +'}');
	    		// console.error(model);
	    	});
	    }
	});

	res.header('Content-Type', 'image/gif');
	return tracker.middleware(req, res);
};