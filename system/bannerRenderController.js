'use strict';

var BGateAgent = require('../helper/BgateAgent.js');

exports.render = function(req, res) {
	console.log("============================================================");
	console.log("Ad banner render");
	
	if (!req.query) return res.status(404).send(404);
	if (!BGateAgent || !BGateAgent.agents) return res.status(404).send(404);
	
	var bannerId = req.query.bannerId || 0;
	var bidId = req.query.bidId || 0;
	var type = req.query.type || '';
	var width = req.query.width || 0;
	var height = req.query.height || 0;
	
	if (!bannerId) return res.status(404).send();
	
	BGateAgent.agents.forEach(function(agent) {
		if (agent && agent.banner) {
			agent.banner.forEach(function(banner) {
				if (banner && banner.AdCampaignBannerPreviewID == bannerId) {
					if (banner.Width != width || banner.Height != height) return res.status(404).send(404);
					//console.log(banner);
					return res.send(renderAdContent(banner));
				}
			})
		}
	});
	
	return res.status(404).send(404);
};

var renderAdContent = function(banner) {
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
