'use strict';

var build = require('../helper/builder');
var BiddingMapLog = require('../config/mongodb').BiddingMapLog;
var BGateAgent = require('../helper/BgateAgent');

/*
http://ptnhttt.uit.edu.vn:8899/win_notice?pid=5859629&crid=19&cid=undefined&
type=win&impId=bgate_1435339442520&PublisherAdZoneID=undefined
&site=http://blog.lvduit.com/2015/05/php-cai-dat-apc-alterdnative-php-cache-c
ho-xampp-tren-linux.html#.VY2KXXW1Gkr&price=8&data=193367797
*/

exports.index = function(req, res) {
	var logDatetime = new Date();
	console.log("=================== Win Notice ===================");
	
	if (!req.query) {
		console.error("ERR: ["+ logDatetime +"] Missing query param.");
		return res.status(404).send();
	}
	if (!BGateAgent || !BGateAgent.agents) {
		console.error("ERR: ["+ logDatetime +"] Missing BGateAgent or error.");
		return res.status(404).send();
	}

	if (!req.query.crid) {
		console.error("ERR: ["+ logDatetime +"] Missing Creative ID in query param.");
		return res.status(404).send();
	}
	var crid = parseInt(req.query.crid);
	
	if (!req.query.impId) {
		console.error("ERR: ["+ logDatetime +"] Missing impId in query param.");
		return res.status(404).send();
	}
	var impId = req.query.impId;
	
	if (!req.query.PublisherAdZoneID) {
		console.error("ERR: ["+ logDatetime +"] Missing PublisherAdZoneID in query param.");
		return res.status(404).send();
	}
	var PublisherAdZoneID = parseInt(req.query.PublisherAdZoneID);
	
	if (!req.query.mapper) {
		console.error("ERR: ["+ logDatetime +"] Missing mapper ID in query param.");
		return res.status(404).send();
	}
	var mapperID = parseInt(req.query.mapper);

	// Mapper error
	if (mapperID != build.getAdzoneMapBannerId(impId, PublisherAdZoneID)) {
		console.error("ERR: ["+ logDatetime +"] Error mapper ID in query param.", mapperID , build.getAdzoneMapBannerId(impId, PublisherAdZoneID));
		return res.status(404).send();
	}

	BiddingMapLog.find({
		AdzoneMapBannerId: mapperID
	}, function(err, biddingQueue) {
		if (err) {
			console.error("ERR: ["+ logDatetime +"] Could not load BiddingMapLog.");
			return res.status(404).send();
		}

		console.error(biddingQueue);
	});

}