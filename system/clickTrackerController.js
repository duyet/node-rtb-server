'use strict';

var _ = require('lodash');

var BGateAgent = require('../helper/BgateAgent.js');

// http://ptnhttt.uit.edu.vn:8899/click_tracker
// ?pid=8&cid=8&type=click_tracker&impId=undefined&auctionId=undefined
// &page=undefined&width=468&height=60&LandingPageTLD=bda.vn&js=true
module.exports.tracker = function(req, res) {
	console.log("=============== REQUEST: Click Tracker ==================");
	console.time("TIMER: Update click tracker data");

	if (!req.query) return res.status(404).send(404);
	if (!BGateAgent || !BGateAgent.agents) return res.status(404).send();

	// TODO: update CLICK event to DB or Agent

	// Creative ID
	var cid = parseInt(req.query.cid) || 0;
	if (!cid || cid == 0) {
		console.error('ERR: Click tracker - cid error or not defined.');
		return res.status(404).send();
	}

	var targetUrl = req.query.LandingPageTLD || '';
	if (!targetUrl) {
		console.error('ERR: Click tracker - LandingPageTLD error or not found.');
		return res.status(404).send();
	}

	// Call update banner click couter
	updateBannerClickCounter(cid);

	// Update full url 
	var regex = /^http\:\/\/.*/;
	if (!regex.test(targetUrl)) targetUrl = 'http://' + targetUrl;

	console.info('INFO: Redirect to ' + targetUrl);
	res.redirect(targetUrl);

	console.timeEnd("TIMER: Update click tracker data");
}

var updateBannerClickCounter = function(bannerId) {
	return true;
}