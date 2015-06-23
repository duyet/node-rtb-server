'use strict';

var mongoConfig = {
	host: 'localhost',
	dbName: 'BGate-dev'
};

var mongoose = require('mongoose');
var connectString = 'mongodb://'+ mongoConfig.host +'/' + mongoConfig.dbName;

console.info("INFO: Connect to MongoDB Server.");
mongoose.connect(connectString, function(err) {
	if (err) {
		console.error("ERR: Can not connect to MongoDB ("+ connectString +")");
	}
});

// ===================================================
// DEFINE MONGO COLLECTION
// ===================================================

var ImpLog = mongoose.model('ImpLog', { PublisherAdZoneID: Number, AdCampaignBannerID: Number, UserIP: String, Country: String, Price: Number, created: Date });
var ClickLog = mongoose.model('ClickLog', { PublisherAdZoneID: Number, AdCampaignBannerID: Number, UserIP: String, Country: String, Price: Number, created: Date });


// ===================================================
module.exports.ImpLog 		= ImpLog;
exports.ClickLog 	= ClickLog;
module.exports 	= mongoose;