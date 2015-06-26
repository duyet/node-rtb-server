'use strict';

var hash = require('string-hash');
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

exports.WinBidUrlForRubiCon = function(bidReq, bid_res) {
	var url = '';
	url += config.domain + ':' + config.port + '' + route.win;
	url += '?pid='+ exports.genHash(String(bid_res.AdCampaignBannerPreviewID)); //bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bid_res.bgateSalt);
	url += '&crid=' + bid_res.AdCampaignBannerPreviewID || 0;
	url += '&cid=' + bid_res.AdCampaignID || 0;
	url += '&type=win_notice_rubicon';
	url += '&impId=' + bidReq.id;
	url += '&PublisherAdZoneID=' + bid_res.id || 0;
	// url += '&auctionId=' + bid_res.auctionId;
	url += '&site=' + bidReq.site.page;
	url += '&price=${AUCTION_PRICE:BF}';

	return url;
}

exports.WinBidUrl = function(bidReq, bid_res) {
	var url = '';
	url += config.domain + ':' + config.port + '' + route.win;
	url += '?pid='+ exports.genHash(String(bid_res.AdCampaignBannerPreviewID)); //bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bid_res.bgateSalt);
	url += '&crid=' + bid_res.AdCampaignBannerPreviewID || 0;
	//url += '&cid=' + bid_res.AdCampaignID || 0;
	url += '&type=win_notice';
	url += '&bidReqId=' + bidReq.id;
	url += '&impId=' + bid_res.impId;
	url += '&mapper=' + bid_res.mapperId;
	url += '&PublisherAdZoneID=' + parseInt(bidReq.site.id) || 0;
	// url += '&auctionId=' + bid_res.auctionId;
	url += '&site=' + encodeURIComponent(bidReq.site.page);
	url += '&price=' + bid_res.BidAmount;
	url += '&data=' + exports.genHash(String(bid_res.BidAmount) + String(bid_res.AdCampaignBannerPreviewID))

	return url;
}

// http://ptnhttt.uit.edu.vn:8899/click_tracker?pid=9
// &cid=9&PublisherAdZoneID=12&type=click_tracker&impId=undefined
// &auctionId=undefined&page=undefined&width=120&height=600
// &LandingPageTLD=http://lvduit.com&js=true

exports.ClickTrackerUrl = function(banner, reqInfo) {
	console.time("TIMER: Build Click Tracker URL");
	if (!banner.LandingPageTLD) return '';

	//console.info("============= BUILD CLICK TRACKER INFO, I GOT: ");
	//console.info(banner);
	var url = '';
	url += config.domain + ':' + config.port + '' + route.click_tracker;
	url += '?type=click_tracker';
	url += '&pid='+ exports.genHash(String(banner.AdCampaignBannerPreviewID));//bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bid_res.bgateSalt);
	url += '&crid=' + banner.AdCampaignBannerPreviewID;
	url += '&cid=' + banner.AdCampaignID;
	url += '&PublisherAdZoneID=' + reqInfo.PublisherAdZoneID || 0;
	url += '&impId=' + reqInfo.bidId || '';
	// url += '&auctionId=' + reqInfo.auctionId || '';
	url += '&page=' + (!reqInfo.page ? 'na' : reqInfo.page);
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
	//console.warn("GENHASH: ", string);
	// TODO: hash function here
	string = hash(string);

	return string;
}

exports.getAdzoneMapBannerId = function(bidReqId, adzone) {
	return exports.genHash(String(bidReqId) + String(adzone) + 'bgate');
}

exports.AuctionId = function(bannerId) {
	var id = exports.genHash(String(bannerId) + "" + String(new Date())); // bcrypt.hashSync(String(bannerId) + "/" + String(moment()), bcrypt.genSaltSync(10))
	// TODO: Save auctionId to db

	return id;
};

exports.BannerRenderLink = function(bidReq, bid_res) {
	if (!bidReq || !bid_res) return '';

	// console.error("I got -----------> ", bidReq, '------------->' , bid_res);
	
	var url = config.domain + ':' + config.port + '' + route.banner_render;
	url += '?type=banner';
	url += '&bidId=' + bidReq.id || 'none';
	url += '&PublisherAdZoneID=' + parseInt(bidReq.site.id) || 0; 
	url += '&bannerId=' + bid_res.AdCampaignBannerPreviewID || 0;
	url += '&width=' + bid_res.Width || 0;
	url += '&height=' + bid_res.Height || 0;
	url += '&name=' + encodeURIComponent(bid_res.Name) || '';
	url += '&link_type=render';
	url += '&js=true';
	url += '&price=${AUCTION_PRICE:BF}'; // Require by rubicon
	//url += '&i=' + bid_res.AdUrl || '';

	return url;
}

exports.BannerPreviewLink = function(banner) {
	if (!banner) return '';

	var url = config.domain + ':' + config.port + '' + '/banner_preview'; //route.banner_preview;
	url += '?type=preview&uname=bgate';
	url += '&Width=' + banner.Width || 0;
	url += '&Height=' + banner.Height || 0;
	url += '&AdUrl=' + encodeURIComponent(banner.AdUrl)	;
	url += '&banner_type=img';
	url += '&link_type=preview';
	url += '&js=true';

	return url;
}