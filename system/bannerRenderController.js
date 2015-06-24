'use strict';

var BGateAgent = require('../helper/BgateAgent.js');
var builder = require('../helper/builder.js');

exports.render = function(req, res, next) {
	console.log("=================== AD BANNER RENDER ===================");
	
	if (!req.query) {
		console.error("ERR: Missing query param.");
		return res.status(404).send();
	}
	if (!BGateAgent || !BGateAgent.agents) {
		console.error("ERR: Missing BGateAgent or error.");
		return res.status(404).send();
	}
	
	var PublisherAdZoneID = req.query.PublisherAdZoneID || 0;
	var bannerId = req.query.bannerId || 0;
	var bidId = req.query.bidId || 0;
	var type = req.query.type || '';
	var width = req.query.width || 0;
	var height = req.query.height || 0;

	if (!bannerId) {
		console.error("ERR: Missing bannerId.");
		return res.status(404).send();
	}
	if (!PublisherAdZoneID) {
		console.error("ERR: Missing PublisherAdZoneID.");
		return res.status(404).send();
	}

	var finishLoop = false;
	var isRendered = false;
	BGateAgent.agents.forEach(function(agent) {
		if (agent && agent.banner) {
			agent.banner.forEach(function(banner) {
				if (finishLoop) return true;
				if (banner && banner.AdCampaignBannerPreviewID == bannerId) {
					if (banner.Width != width || banner.Height != height) return res.status(404).send(404);
					//console.log(banner);

					finishLoop = true;
					isRendered = true;
					// res.header("Content-Type", "text/html");
					return res.send(renderAdContent(banner, null, req.query));
				}
			})
		}
	});
	
	// if (!isRendered) return res.status(404).send(404);
	// next();
};

var renderAdContent = function(banner, trackerLink, reqInfo) {
	if (!banner) return '';
	
	console.info("============= reqInfo ===========");
	console.info(reqInfo);

	var PublisherAdZoneID = parseInt(reqInfo.PublisherAdZoneID) || 0;
	var impTrackerLink = builder.ImpTrackerUrl(banner, PublisherAdZoneID);

	var trackerLink = trackerLink || builder.ClickTrackerUrl(banner, reqInfo);

	var ad = '<!doctype html>\
		<html>\
		<head><title>Bgate by ISLab</title>\
		<style>* {margin:0; padding:0} .bgateAdmLogo {background: url(//3.bp.blogspot.com/-FWZ8ppmaUpk/VYQ9Oe6h6OI/AAAAAAAACjU/qyGoayEtu58/s1600/adxlogo-2.png) no-repeat top left;display: block;width: 35px;height: 20px;z-index: 999;position: absolute;top: 0px;right: 0px;} .bgateAdmLogo:hover {  width: 103px; background: url(//3.bp.blogspot.com/-r87fGsSXmWA/VYfab3YV-0I/AAAAAAAACjs/hn-ylyS1Kzk/s1600/adxlogo-2-hover.png) no-repeat top left;}</style>\
		</head>\
		<body>\
		<!-- px tracker -->\
		<img src="'+ impTrackerLink +'" width="0" height="0" style="display:none" />\
		<div style="position:relative;width:'+ banner.Width +'px;height:'+ banner.Height +'px;">\
		<a href="'+ trackerLink +'" target=\"_top\"><img src="'+ banner.AdUrl +'" width="'+ banner.Width +'" height="'+ banner.Height +'" /></a>\
		<a href="#" class="bgateAdmLogo"><span></span></a>\
		</div>\
		</body>\
		</html>';
		
	return ad;
}


// ===================================================
// GENERATE PREVIEW LINK
// ===================================================

exports.generate_preview_link = function(req, res) {
	console.log("=============== REQUEST: Generate Preview Link ==================");
	console.time("TIMER: Generator preview link");

	if (!req.query) return res.status(404).send(404);

	var banner = {
		AdUrl : req.query.AdUrl || '',
		Width : req.query.Width || 500,
		Height : req.query.Height || 500
	};

	if (!banner.AdUrl) {
		console.error("ERR: Missing AdUrl");
		return res.status(400).json({err: 'Missing AdUrl'});
	}

	var builder = require('../helper/builder.js');
	var url = builder.BannerPreviewLink(banner);
	console.info("## Generate: ", url);
	res.json({url:url});
	console.timeEnd("TIMER: Generator preview link");
}

// ===================================================
// PREVIEW
// ===================================================

exports.preview = function(req, res) {
	console.log("======================= AD BANNER PREVIEW ======================");
	console.time("TIMER: Ad banner preview");
	
	if (!req.query) return res.status(404).send(404);
	
	var banner = {
		AdUrl : req.query.AdUrl || '',
		Width : req.query.Width || 500,
		Height : req.query.Height || 500
	};
	var bannerId = req.query.bannerId || 0;

	if (!bannerId && banner.AdUrl) {
		return res.send(renderAdPreviewContent(banner));
	};

	if (!banner.AdUrl) {
		console.error("ERR: Missing AdUrl");
		return res.status(400).json({err: 'Missing AdUrl'});
	}

	if (!BGateAgent || !BGateAgent.agents) return res.status(404).send(404);

	BGateAgent.agents.forEach(function(agent) {
		if (agent && agent.banner) {
			agent.banner.forEach(function(banner) {
				if (banner && banner.AdCampaignBannerPreviewID == bannerId) {
					if (banner.Width != width || banner.Height != height) return res.status(404).send(404);
					//console.log(banner);
					return res.send(renderAdPreviewContent(banner));
				}
			})
		}
	});
	
	return res.status(404).send(404);
	console.timeEnd("TIMER: Ad banner preview");
}

var renderAdPreviewContent = function(banner) {
	var ad = '<!doctype html>\
		<html>\
		<head><title>Bgate by ISLab</title>\
		<style>* {margin:0; padding:0} .bgateAdmLogo {background: url(//3.bp.blogspot.com/-FWZ8ppmaUpk/VYQ9Oe6h6OI/AAAAAAAACjU/qyGoayEtu58/s1600/adxlogo-2.png) no-repeat top left;display: block;width: 35px;height: 20px;z-index: 999;position: absolute;top: 0px;right: 0px;} .bgateAdmLogo:hover {  width: 103px; background: url(//2.bp.blogspot.com/-Aq6P-ulojEE/VYQ9OBptyGI/AAAAAAAACjQ/6CU-UonIo-Q/s1600/adxlogo-2-hover.png) no-repeat top left;}</style>\
		</head>\
		<body>\
		<!-- px tracker -->\
		<div style="position:relative;width:'+ banner.Width +'px;height:'+ banner.Height +'px;">\
		<a href="#"><img src="'+ banner.AdUrl +'" width="'+ banner.Width +'" height="'+ banner.Height +'" /></a>\
		<a href="#" class="bgateAdmLogo"><span></span></a>\
		</div>\
		</body>\
		</html>';
		
	return ad;
}