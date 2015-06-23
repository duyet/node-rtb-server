'use strict';

var config = require('../config/config');
var route = config.routes;

exports.AdmTag = function(bidReq, bid_res) {
	console.time("TIMER: Build Adm Tag");

	if (!bid_res) return '';
	
	/*********************************************************
	// USING JSDOM TO GENERATE, Take a lots of time to do it!!

	var jsdom = require("jsdom").jsdom;
	var window = jsdom().parentWindow;

	var admTag = window.document.createElement('iframe');
	
		var clickTag = window.document.createElement('a');
		clickTag.href = build.ClickTrackerUrl(bidReq, bid_res);

			var imgTag = window.document.createElement('img');
			imgTag.src = bid_res.AdUrl;

		clickTag.appendChild(imgTag);
	admTag.appendChild(clickTag);
	**********************************************************/

	// USING STRING CONCAT, It's save my life
	var admTag = "";
	admTag += "<iframe src=\"" + exports.BannerRenderLink(bidReq, bid_res) + "\" border=\"0\" width=\"" + bid_res.Width + "\" height=\"" + bid_res.Height + "\" style=\"margin:0;padding:0;border:0\" scrolling=\"no\" seamless=\"seamless\">";
	admTag += "</iframe>";
	
	console.timeEnd("TIMER: Build Adm Tag");

	return admTag;
}

exports.WinBidUrl = function(bidReq, bid_res) {
	var url = '';
	url += config.domain + ':' + config.port + '' + route.win;
	url += '?pid='+ exports.genHash(String(bid_res.AdCampaignBannerPreviewID)); //bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bid_res.bgateSalt);
	url += '&cid=' + bid_res.AdCampaignBannerPreviewID;
	url += '&type=win';
	url += '&impId=' + bid_res.impId;
	url += '&PublisherAdZoneID=' + bid_res.id || 0;
	url += '&auctionId=' + bid_res.auctionId;
	url += '&site=' + bidReq.site.page;
	url += '&data=OuJifVtEK&price=${AUCTION_PRICE}';

	return url;
}

exports.ClickTrackerUrl = function(banner, reqInfo) {
	console.time("TIMER: Build Click Tracker URL");
	if (!banner.LandingPageTLD) return '';

	var url = '';
	url += config.domain + ':' + config.port + '' + route.click_tracker;
	url += '?pid='+ exports.genHash(String(banner.AdCampaignBannerPreviewID));//bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bid_res.bgateSalt);
	url += '&cid=' + banner.AdCampaignBannerPreviewID;
	url += '&PublisherAdZoneID=' + reqInfo.PublisherAdZoneID || 0;
	url += '&type=click_tracker';
	url += '&impId=' + reqInfo.impId || '';
	url += '&auctionId=' + reqInfo.auctionId || '';
	url += '&page=' + reqInfo.page || '';
	url += '&width=' + reqInfo.width || 0;
	url += '&height=' + reqInfo.height || 0;
	url += '&LandingPageTLD=' + banner.LandingPageTLD || '';
	url += '&js=' + (reqInfo.js && reqInfo.js != 'true' ? 'false' : 'true');

	console.timeEnd("TIMER: Build Click Tracker URL")

	return url;
}

exports.ImpTrackerUrl = function(banner, PublisherAdZoneID) {
	console.time("TIMER: Build Imp Tracker URL");
	if (!banner.LandingPageTLD) return '';

	var url = '';
	url += config.domain + ':' + config.port + '' + route.imp_tracker;
	url += '?pid='+ exports.genHash(String(banner.AdCampaignBannerPreviewID));//bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bid_res.bgateSalt);
	url += '&PublisherAdZoneID=' + PublisherAdZoneID;
	url += '&AdCampaignBannerID=' + banner.AdCampaignBannerPreviewID;
	url += '&type=imp_tracker';
	//url += '&impId=' + banner.impId || '';
	
	console.timeEnd("TIMER: Build Imp Tracker URL");
	return url;
}

exports.genHash = function(string) {
	// TODO: hash function here

	return string;
}

exports.AuctionId = function(bannerId) {
	var id = exports.genHash(String(bannerId) + "" + String(new Date())); // bcrypt.hashSync(String(bannerId) + "/" + String(moment()), bcrypt.genSaltSync(10))
	// TODO: Save auctionId to db

	return id;
};

exports.BannerRenderLink = function(bidReq, bid_res) {
	if (!bidReq || !bid_res) return '';

//	console.error("I got -----------> ", bidReq, '------------->' , bid_res);
	
	var url = config.domain + ':' + config.port + '' + route.banner_render;
	url += '?type=banner';
	url += '&bidId=' + bidReq.id || 'none';
	url += '&PublisherAdZoneID=' + bidReq.id || 0; 
	url += '&bannerId=' + bid_res.AdCampaignBannerPreviewID || 0;
	url += '&width=' + bid_res.Width || 0;
	url += '&height=' + bid_res.Height || 0;
	url += '&name=' + bid_res.Name || '';
	url += '&link_type=render';
	url += '&js=true';
	//url += '&i=' + bid_res.AdUrl || '';

	return url;
}

exports.BannerPreviewLink = function(banner) {
	if (!banner) return '';

	var url = config.domain + ':' + config.port + '' + '/banner_preview'; //route.banner_preview;
	url += '?type=preview&uname=bgate';
	url += '&Width=' + banner.Width || 0;
	url += '&Height=' + banner.Height || 0;
	url += '&AdUrl=' + banner.AdUrl;
	url += '&banner_type=img';
	url += '&link_type=preview';
	url += '&js=true';

	return url;
}