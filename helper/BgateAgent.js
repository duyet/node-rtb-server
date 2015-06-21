'use strict';

var _ = require('lodash');
var moment = require('moment');

var config = require('../config/config');
var Model = require('../config/db').Model;


// ==================================
// DATABASE CONSTRUCT
// ==================================

var DemandCustomerInfo = Model.extend({
	tableName: 'DemandCustomerInfo',
	idAttribute: 'DemandCustomerInfoID'
});

var auth_Users = Model.extend({
	tableName: 'auth_Users',
	idAttribute: 'user_id'
});

var AdCampaignPreview = Model.extend({
	tableName: 'AdCampaignPreview',
	idAttribute: 'AdCampaignPreviewID'
});

var AdCampaignBannerPreview = Model.extend({
	tableName: 'AdCampaignBannerPreview',
	idAttribute: 'AdCampaignBannerPreviewID'
});

var passSelfBannerFilter = function(banner) {
	if (!banner) return false;

	if (banner.StartDate) {
		var startDate = moment(banner.StartDate);
		if (moment().diff(startDate, "seconds") < 0) return false; 
	}

	if (banner.EndDate) {
		var endDate = moment(banner.EndDate);
		if (moment().diff(endDate, "seconds") > 0) return false; 
	}

	return true;
}

var initBannerAttributes = function(banner) {
	// TODO: All attributes for banner, ex: todayImp, totalImp, clickCounter, ...
	return banner;
}

var BGateAgent = {
	agents : [],
	listBanner : [],

	init : function(next) {
		new DemandCustomerInfo({}).fetchAll().then(function(_demandUsers) {
			if (!_demandUsers) return;

			_demandUsers.forEach(function(_demandUser) {
				var demandUser = _demandUser.attributes;
				var adv = {};

				new auth_Users({
					DemandCustomerInfoID: demandUser.DemandCustomerInfoID, 
					user_enabled: 1, 
					user_verified: 1, 
					user_agreement_accepted: 1
				}).fetch().then(function(user) {
					if (!user) return false;
					var user = user.attributes;

					if (!user) return false;
					user.banner = [];

					new AdCampaignBannerPreview({UserID: user.UserID}).fetchAll().then(function(collection) {
						collection.forEach(function(banner) {
							banner = banner.attributes;
							// Filter me 
							if (!passSelfBannerFilter(banner)) return;
							
							initBannerAttributes(banner);

							user.banner.push(banner);

							//BGateAgent.listBanner.push(banner);
						});

						//console.log(_.merge(user, demandUser));
						BGateAgent.agents.push(_.merge(user, demandUser));
					});

				});

			});
		}).then(function() {
			next();	
		});
	},

	getAgents: function() {
		return BGateAgent.agents;
	}
};

BGateAgent.init(function() {
	console.log(BGateAgent.agents);
});

module.exports = BGateAgent;