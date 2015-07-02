'use strict';

var Model = require('../config/db').Model;
var ImpLog = require('../config/mongodb').ImpLog;
var ClickLog = require('../config/mongodb').ClickLog;

var _ = require('lodash');

console.info("INFO: Start Cronjob script: Update AdBannerDailyTracker && AdzoneDailyTracker");

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

// =========================

console.time("TIMER: Start sync AdBannerDailyTracker data");

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

console.log(to.toISOString());

var reports_AdBannerDailyTracker = [];

ImpLog.find({
	"created":  {
			"$gte" : from.toISOString(), 
			"$lt"  : to.toISOString()
		}
	}, 

	function(err, rows) {
		if (err) console.log(err);
		else {
			reports_AdBannerDailyTracker = [];
			// TODO: optimise for meeeeeee

			// So, do some fucking loop
			
			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];

				// Current Banner 
				var banner_id = row.AdCampaignBannerID;
				// console.log(banner_id);

				// Check for exists in reports_AdBannerDailyTracker array
				var isExists = false;
				for (var j = 0; j < reports_AdBannerDailyTracker.length; j++) {
					
					if (!isExists && reports_AdBannerDailyTracker[j].AdCampaignBannerID == banner_id) {
						isExists = true;
						reports_AdBannerDailyTracker[j].ImpCount++;
					}
				}

				// If not exists in reports_AdBannerDailyTracker array
				if (isExists == false) {
					var report = {
						AdCampaignBannerID: banner_id,
						ImpCount: 1,
						ClickCount: 0, 
						Outcome: 0.0,
						DateCreated: new Date().toMysqlDate(),
						DateUpdated: new Date()
					}
					reports_AdBannerDailyTracker.push(report);
				}
			}

			// ===========================
			// Step 2

			ClickLog.find({
				"created":  {
						"$gte" : from.toISOString(), 
						"$lt"  : to.toISOString()
					}
				}, 

				function(err, rows) {
					if (err) console.log(err);
					else {
						for (var i = 0; i < rows.length; i++) {
							var row = rows[i];

							// Current Banner 
							var banner_id = row.AdCampaignBannerID;

							// Current prices
							var price = row.Price;

							// Check for exists in reports_AdBannerDailyTracker array
							var isExists = false;
							for (var j = 0; j < reports_AdBannerDailyTracker.length; j++) {
								
								if (!isExists && reports_AdBannerDailyTracker[j].AdCampaignBannerID == banner_id) {
									isExists = true;
									reports_AdBannerDailyTracker[j].ClickCount++;
									reports_AdBannerDailyTracker[j].Outcome += price;
								}
							}

							// If not exists in reports_AdBannerDailyTracker array
							if (isExists == false) {
								var report = {
									AdCampaignBannerID: banner_id,
									ImpCount: 0,
									ClickCount: 1, 
									Outcome: price,
									DateCreated: new Date().toMysqlDate(),
									DateUpdated: new Date()
								}
								reports_AdBannerDailyTracker.push(report);
							}
						}

						// ===================================
						// Step 3: Save to DB
						// console.log(reports_AdBannerDailyTracker);
						reports_AdBannerDailyTracker.forEach(function(report) {

							new AdBannerDailyTracker({
								AdCampaignBannerID: report.AdCampaignBannerID,
								DateCreated: report.DateCreated
							}).fetch()
							.then(function(model) {
								if (model) {
									model.set('ImpCount', report.ImpCount);
									model.set('ClickCount', report.ClickCount);
									model.set('Outcome', report.Outcome);
									model.set('DateUpdated', report.DateUpdated);
									model.save().then(function(m) {
										console.log("INFO: Update report banner to MySQL Server");	
									});
								} else {
									new AdBannerDailyTracker({
										AdCampaignBannerID: report.AdCampaignBannerID,
										DateCreated: report.DateCreated,
										ImpCount: report.ImpCount,
										ClickCount: report.ClickCount,
										Outcome: report.Outcome,
										DateUpdated: report.DateUpdated
									}).save().then(function(model) {
										console.log("xx",model);
										console.log("INFO: Save new report banner ["+ report.AdCampaignBannerID +"] to MySQL Server!");
									});
								}
							});

							/*
							console.error("=========> ", report);
							new AdBannerDailyTracker({
								AdCampaignBannerID: report.banner_id,
								DateCreated: report.DateCreated
							}).save({
								ImpCount: report.ImpCount,
								ClickCount: report.ClickCount,
								Outcome: report.Outcome,
								DateUpdated: report.DateUpdated
							}, {patch: true}).then(function(model) {
								// console.log(model);
								console.log("INFO: Save report to MySQL Server!");
							});
							*/
						});
						console.timeEnd("TIMER: Start sync AdBannerDailyTracker data");
						
					}
				});


		}
	});

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
		if (err) console.log(err);
		else {
			reports_AdzoneDailyTracker = [];

			// So, do some fucking loop
			
			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];

				// Current Banner 
				var adzone_id = row.PublisherAdZoneID;

				// Check for exists in reports_AdzoneDailyTracker array
				var isExists = false;
				for (var j = 0; j < reports_AdzoneDailyTracker.length; j++) {
					
					if (!isExists && reports_AdzoneDailyTracker[j].PublisherAdZoneID == adzone_id) {
						isExists = true;
						reports_AdzoneDailyTracker[j].ImpCount++;
					}
				}

				// If not exists in reports_AdzoneDailyTracker array
				if (isExists == false) {
					var report = {
						PublisherAdZoneID: adzone_id,
						ImpCount: 1,
						ClickCount: 0, 
						Income: 0.0,
						DateCreated: new Date().toMysqlDate(),
						DateUpdated: new Date()
					}
					reports_AdzoneDailyTracker.push(report);
				}
			}

			// ===========================
			// Step 2

			ClickLog.find({
				"created":  {
						"$gte" : from.toISOString(), 
						"$lt"  : to.toISOString()
					}
				}, 

				function(err, rows) {
					if (err) console.log(err);
					else {
						for (var i = 0; i < rows.length; i++) {
							var row = rows[i];

							// Current Banner 
							var adzone_id = row.PublisherAdZoneID;

							// Current prices
							var price = row.Price;

							// Check for exists in reports_AdzoneDailyTracker array
							var isExists = false;
							for (var j = 0; j < reports_AdzoneDailyTracker.length; j++) {
								
								if (!isExists && reports_AdzoneDailyTracker[j].PublisherAdZoneID == adzone_id) {
									isExists = true;
									reports_AdzoneDailyTracker[j].ClickCount++;
									reports_AdzoneDailyTracker[j].Income += price;
								}
							}

							// If not exists in reports_AdzoneDailyTracker array
							if (isExists == false) {
								var report = {
									PublisherAdZoneID: adzone_id,
									ImpCount: 0,
									ClickCount: 1, 
									Income: price,
									DateCreated: new Date().toMysqlDate(),
									DateUpdated: new Date()
								}
								reports_AdzoneDailyTracker.push(report);
							}
						}

						// ===================================
						// Step 3: Save to DB
						console.log(reports_AdzoneDailyTracker);
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
										DateUpdated: report.DateUpdated
									}).save().then(function(model) {
										console.log("xx",model);
										console.log("INFO: Save new report ["+ report.PublisherAdZoneID +"] to MySQL Server!");
									});
								}
							});
						});
						console.timeEnd("TIMER: Start sync AdzoneDailyTracker data");
						
					}
				});


		}
	});


