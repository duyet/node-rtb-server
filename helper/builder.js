'use strict';

var config = require('../config/config');

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
	admTag += "<iframe src=\"" + exports.BannerRenderLink(bidReq, bid_res) + "\" border=\"0\" width=\"" + bid_res.Width + "\" height=\"" + bid_res.Height + "\">";
	admTag += "<a href=\""+ exports.ClickTrackerUrl(bidReq, bid_res) +"\">";
	admTag += "<img src=\"" + bid_res.AdUrl + "\" />";
	admTag += "</a>";
	admTag += "</iframe>";
	
	console.timeEnd("TIMER: Build Adm Tag");

	return admTag;
}

exports.WinBidUrl = function(bidReq, bid_res) {
	var url = '';
	url += config.domain + ':' + config.port + '/' + config.winPath;
	url += '?pid='+ exports.genHash(String(bid_res.AdCampaignBannerPreviewID)); //bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bid_res.bgateSalt);
	url += '&cid=' + bid_res.AdCampaignBannerPreviewID;
	url += '&type=win';
	url += '&impId=' + bid_res.impId;
	url += '&auctionId=' + bid_res.auctionId;
	url += '&site=' + bidReq.site.page;
	url += '&data=OuJifVtEK&price=${AUCTION_PRICE}';

	return url;
}

exports.ClickTrackerUrl = function(bidReq, bid_res) {
	console.time("TIMER: Build Click Tracker URL");
	var url = '';
	url += config.domain + ':' + config.port + '/' + config.winPath;
	url += '?pid='+ exports.genHash(String(bid_res.AdCampaignBannerPreviewID));//bcrypt.hashSync(String(bid_res.AdCampaignBannerPreviewID), bid_res.bgateSalt);
	url += '&cid=' + bid_res.AdCampaignBannerPreviewID;
	url += '&type=click_tracker';
	url += '&impId=' + bid_res.impId || '';
	url += '&auctionId=' + bid_res.auctionId || '';
	url += '&site=' + bidReq.site.page || '';
	url += '&data=OuJifVtEK&price=${AUCTION_PRICE}';

	console.timeEnd("TIMER: Build Click Tracker URL")

	return url;
}

exports.genHash = function(string) {
	// TODO: hash function here

	return string;
}

exports.AuctionId = function(bannerId) {
	var id = exports.genHash(String(bannerId) + "/" + String(new Date())); // bcrypt.hashSync(String(bannerId) + "/" + String(moment()), bcrypt.genSaltSync(10))
	// TODO: Save auctionId to db

	return id;
};

exports.BannerRenderLink = function(bidReq, bid_res) {
	if (!bidReq || !bid_res) return '';

	var url = '';
	url += config.domain + ':' + config.port + '/' + config.bannerRenderPath;
	url += '?type=banner';
	url += '&bidId=' + bidReq.id || 'none';
	url += '&bannerId=' + bid_res.AdCampaignBannerPreviewID || 0;
	url += '&width=' + bid_res.Width || 0;
	url += '&height=' + bid_res.Height || 0;
	url += '&name=' + bid_res.Name || '';
	//url += '&i=' + bid_res.AdUrl || '';

	return url;
}