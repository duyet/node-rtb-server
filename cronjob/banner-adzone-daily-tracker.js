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
				console.log(banner_id);

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
						DateUpdated: null
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
									DateUpdated: null
								}
								reports_AdBannerDailyTracker.push(report);
							}
						}

						// ===================================
						// Step 3: Save to DB
						console.log(reports_AdBannerDailyTracker);
						reports_AdBannerDailyTracker.forEach(function(report) {
							new AdBannerDailyTracker(report).save().then(function(model) {
								// console.log(model);
								console.log("INFO: Save report to MySQL Server!");
							});
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
						DateUpdated: null
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
									DateUpdated: null
								}
								reports_AdzoneDailyTracker.push(report);
							}
						}

						// ===================================
						// Step 3: Save to DB
						console.log(reports_AdzoneDailyTracker);
						reports_AdzoneDailyTracker.forEach(function(report) {
							new AdzoneDailyTracker(report).save().then(function(model) {
								// console.log(model);
								console.log("INFO: Save report to MySQL Server!");
							});
						});
						console.timeEnd("TIMER: Start sync AdzoneDailyTracker data");
						
					}
				});


		}
	});