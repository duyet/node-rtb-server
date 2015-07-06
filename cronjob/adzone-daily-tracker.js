// TODO: Banner & Adzone daily counter with algorithms get out a large of fucking loop.
// TODO: Fix me!

'use strict';

var Model = require('../config/db').Model;
var Publisher = require('../helper/Publisher');
var ImpLog = require('../config/mongodb').ImpLog;
var ClickLog = require('../config/mongodb').ClickLog;

var _ = require('lodash');

console.info("INFO: Start Cronjob script: Update AdzoneDailyTracker");

// =========================================
// Database Model
// =========================================
var AdBannerDailyTracker = Model.extend({
	tableName: 'AdBannerDailyTracker',
	idAttribute: 'AdBannerDailyTrackerID'
});

var AdzoneDailyTracker = Model.extend({
	tableName: 'AdzoneDailyTracker',
	idAttribute: 'AdzoneDailyTrackerID'
});

var AdCampaignBannerPreview = Model.extend({
	tableName: 'AdCampaignBannerPreview',
	idAttribute: 'AdCampaignBannerPreviewID'
});

// ========================

function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 **/
Date.prototype.toMysqlDate = function() {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " 00:00:00";
};


// =========================================
// IMP Counter today
// =========================================
var from = new Date();
from.setHours(0); 
from.setMinutes(0);
from.setSeconds(0);
from.setMilliseconds(0);

var to = new Date();
to.setHours(23); 
to.setMinutes(59);
to.setSeconds(59);
to.setMilliseconds(999);

var reports_AdBannerDailyTracker = [];

// ====================================================================

console.time("TIMER: Start sync AdzoneDailyTracker data");
var reports_AdzoneDailyTracker = [];
ImpLog.find({
	"created":  {
			"$gte" : from.toISOString(), 
			"$lt"  : to.toISOString()
		}
	}, 

	function(err, rows) {
		if (err) console.log(">>>>>>", err);
		else {
			reports_AdzoneDailyTracker = [];

			rows.forEach(function(row) {
				// Current Banner 
				var adzone_id = row.PublisherAdZoneID;
				var adzone = getAdzoneById(adzone_id);
				if (!adzone) return false;

				// Check for exists in reports_AdzoneDailyTracker array
				var isExists = false;
				for (var j = 0; j < reports_AdzoneDailyTracker.length; j++) {
					if (!isExists && reports_AdzoneDailyTracker[j].PublisherAdZoneID == adzone.PublisherAdZoneID) {
						isExists = true;
						reports_AdzoneDailyTracker[j].ImpCount++;
						reports_AdzoneDailyTracker[j].Income += row.NetPrice || 0.0;
						reports_AdzoneDailyTracker[j].NetIncome += (row.NetPrice - row.NetPrice * adzone.DomainMarkup) || 0.0;
					}
				}

				// If not exists in reports_AdzoneDailyTracker array
				if (isExists == false) {
					var report = {
						PublisherAdZoneID: adzone_id,
						ImpCount: 1,
						ClickCount: 0, 
						Income: row.NetPrice || 0.0,
						NetIncome: (row.NetPrice - row.NetPrice * adzone.DomainMarkup) || 0.0,
						DateCreated: new Date().toMysqlDate(),
						DateUpdated: new Date()
					}
					reports_AdzoneDailyTracker.push(report);
				}

				ClickLog.find({
					"created":  {
							"$gte" : from.toISOString(), 
							"$lt"  : to.toISOString(),
						},
					"PublisherAdZoneID": row.PublisherAdZoneID,
					"AdCampaignBannerID": row.AdCampaignBannerID
					}, 

					function(err, rows2) {
						if (err) console.log(err);
						else {

							for (var i = 0; i < rows2.length; i++) {
								var row2 = rows2[i];

								// Current Banner 
								var adzone_id = row2.PublisherAdZoneID;

								// Check for exists in reports_AdzoneDailyTracker array
								var isExists = false;
								for (var j = 0; j < reports_AdzoneDailyTracker.length; j++) {
									
									if (!isExists && reports_AdzoneDailyTracker[j].PublisherAdZoneID == adzone_id) {
										isExists = true;
										reports_AdzoneDailyTracker[j].ClickCount++;
										reports_AdzoneDailyTracker[j].Income += row2.NetPrice || 0.0;
										reports_AdzoneDailyTracker[j].NetIncome += (row2.NetPrice - row2.NetPrice * adzone.DomainMarkup) || 0.0;
									}
								}

								// If not exists in reports_AdzoneDailyTracker array
								if (isExists == false) {
									var report = {
										PublisherAdZoneID: adzone_id,
										ImpCount: 0,
										ClickCount: 1, 
										Income: row2.NetPrice || 0.0,
										NetIncome: (row2.NetPrice - row2.NetPrice * adzone.DomainMarkup) || 0.0,
										DateCreated: new Date().toMysqlDate(),
										DateUpdated: new Date()
									}
									reports_AdzoneDailyTracker.push(report);
								}
							}

							// ===================================
							// Step 3: Save to DB
							console.log(reports_AdzoneDailyTracker);

							console.timeEnd("TIMER: Start sync AdzoneDailyTracker data");
							
						}
					});
			});

			// ===========================
			// Step 2

							reports_AdzoneDailyTracker.forEach(function(report) {
								new AdzoneDailyTracker({
									PublisherAdZoneID: report.PublisherAdZoneID,
									DateCreated: report.DateCreated
								}).fetch()
								.then(function(model) {
									if (model) {
										model.set('ImpCount', report.ImpCount);
										model.set('ClickCount', report.ClickCount);
										model.set('Income', report.Income);
										model.set('NetIncome', report.NetIncome);
										model.set('DateUpdated', report.DateUpdated);
										model.save().then(function(m) {
											console.log("INFO: Update report adzone to MySQL Server");	
										});
									} else {
										new AdzoneDailyTracker({
											PublisherAdZoneID: report.PublisherAdZoneID,
											DateCreated: report.DateCreated,
											ImpCount: report.ImpCount,
											ClickCount: report.ClickCount,
											Income: report.Income,
											NetIncome: report.NetIncome,
											DateUpdated: report.DateUpdated
										}).save().then(function(model) {
											console.log("xx",model);
											console.log("INFO: Save new report banner ["+ report.PublisherAdZoneID +"] to MySQL Server!");
										});
									}
								});
							});


		}
	});


// ================================================================
// Re-counter AdCampaignBannerPreview base on AdBannerDailyTracker


var getAdzoneById = function(adzoneId) {
	if (!Publisher || !Publisher.data) return false;

	var adzone = false;
	var isSkip = false;
	Publisher.data.forEach(function(pub) {
		if (isSkip) return false;
		if (!pub.Adzone) return false;
		pub.Adzone.forEach(function(adz) {
			if (isSkip) return false;
			if (adz.PublisherAdZoneID == adzoneId) {
				adzone = adz;
				isSkip = true;
			}
		});
	});

	return adzone;
}