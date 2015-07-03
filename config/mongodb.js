'use strict';

var mongoConfig = {
	host: 'localhost',
	dbName: 'BGate-dev'
};

var mongoose = require('mongoose');
var connectString = 'mongodb://'+ mongoConfig.host +'/' + mongoConfig.dbName;

console.info("INFO: ["+ new Date() +"] Connect to MongoDB Server.");
mongoose.connect(connectString, function(err) {
	if (err) {
		console.error("ERR: ["+ new Date() +"] Can not connect to MongoDB ("+ connectString +")");
	}
});

// ===================================================
// DEFINE MONGO COLLECTION
// ===================================================

var ImpLog = mongoose.model('ImpLog', { impId: String, PublisherAdZoneID: Number, AdCampaignBannerID: Number, UserIP: String, Country: String, Price: Number, NetPrice: Number, created: Date });
var ClickLog = mongoose.model('ClickLog', { impId: String, PublisherAdZoneID: Number, AdCampaignBannerID: Number, TargetURL: String, UserIP: String, Country: String, Price: Number, NetPrice: Number, created: Date });
var BiddingMapLog = mongoose.model('BidddingMapLog', {impId: String, AdzoneMapBannerId: String, PublisherAdZoneID: Number, AdCampaignBannerID: Number, Price: Number, status: String, created: Date})
var AdvBanker = mongoose.model('AdvBanker', { UserID: Number, AdCampaignBannerID: Number, AdzoneMapBannerId: String, Price: Number, created: Date });

// ===================================================

module.exports 	= {
	ImpLog: ImpLog,
	ClickLog: ClickLog,
	BiddingMapLog: BiddingMapLog,
	AdvBanker: AdvBanker
};