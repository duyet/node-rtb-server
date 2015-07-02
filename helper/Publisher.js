'use strict';

var config = require('../config/config');
var Model = require('../config/db').Model;

var mysql      = require('mysql');
var connection = mysql.createConnection(config.db);
connection.connect();

// ==================================
// DATABASE CONSTRUCT
// ==================================

var PublisherAdZone = Model.extend({
	tableName: 'PublisherAdZone',
	idAttribute: 'PublisherAdZoneID'
});

var Publishers = {
	data: [],

	init: function(next) {
		console.info("INFO: ["+ new Date() +"] Init Publisher Agent Data.");

		var q = "";
		q += "SELECT * FROM ";
		q += 	"(SELECT * FROM `PublisherInfo`) AS tb1 ";
		q += "INNER JOIN ";
		q += 	"(SELECT * FROM `PublisherAdZone`) AS tb2 ";
		q += "ON tb1.PublisherInfoID = tb2.AdOwnerID ";
		q += "INNER JOIN ";
		q += 	"(SELECT *, `DateCreated` as `WebsiteDateCreated`, `DateUpdated` as `WebsiteDateUpdated` FROM `PublisherWebsite`) AS tb3 ";
		q +=  "ON tb3.DomainOwnerID = tb1.PublisherInfoID";

		connection.query(q, function(err, rows, fields) {
			if (err || !rows) throw err;

			rows.forEach(function(row, i) {
				var isExists = false;
				for (var jj in Publishers.data) {
					if (isExists) return false;
					if (Publishers.data[jj].PublisherInfoID == row.PublisherInfoID) isExists = true;
				}

				if (isExists) return false;

				var publisher = {
					PublisherInfoID 	: row.PublisherInfoID, 
					Name 				: row.Name, 
					Email 				: row.Email, 
				//	Domain 				: row.Domain, 
					IABCategory 		: row.IABCategory, 
					DateCreated 		: row.DateCreated, 
					DateUpdated 		: row.DateUpdated, 
					FirstName 			: row.FirstName, 
					LastName 			: row.LastName, 
				//	Country 			: row.Country, 
				//	City 				: row.City, 
				//	Addr 				: row.Addr, 
				//	DomainDescribe 		: row.DomainDescribe, 
					Balance 			: row.Balance,
					Website 			: [],
					Adzone 				: [],
				};

				var publisherWebsite = [];
				for (var jjj in rows) {
					if (rows[jjj].PublisherInfoID == row.PublisherInfoID) {
						var _isExistsWebsite = false;
						publisherWebsite.forEach(function(web) {
							if (_isExistsWebsite) return false;
							if (web.PublisherWebsiteID == rows[jjj].PublisherWebsiteID) _isExistsWebsite = true;
						});
						if (!_isExistsWebsite) {
							var _websiteRow = rows[jjj];
							var website = {
								PublisherWebsiteID 	: _websiteRow.PublisherWebsiteID, 
								PublisherInfoID 	: _websiteRow.PublisherInfoID,
								WebDomain 			: _websiteRow.WebDomain, 
								DomainMarkup 		: _websiteRow.DomainMarkup, 
								DomainOwnerID 		: _websiteRow.DomainOwnerID, 								
								ApprovalFlag 		: _websiteRow.ApprovalFlag, 
								IABCategory 		: _websiteRow.IABCategory, 
								IABSubCategory 		: _websiteRow.IABSubCategory, 
								Description 		: _websiteRow.Description, 
								DateCreated 		: _websiteRow.WebsiteDateCreated, 
								DateUpdated 		: _websiteRow.WebsiteDateUpdated
							};

							if (websiteFilter(website)) {
								publisherWebsite.push(website);
							}
						}
					}
				}
				publisher.Website = publisherWebsite;


				var publisherAdzone = [];
				for (var jjj in rows) {
					if (rows[jjj].PublisherInfoID == row.PublisherInfoID) {
						var _isExistsAdzone = false;
						publisherAdzone.forEach(function(adzone) {
							if (_isExistsAdzone) return false;
							if (adzone.PublisherAdZoneID == rows[jjj].PublisherAdZoneID) _isExistsAdzone = true;
						});

						// console.error("Check adzone of ["+ rows[jjj].PublisherInfoID +"]["+ rows[jjj].PublisherAdZoneID +"] => " , _isExistsAdzone);

						if (!_isExistsAdzone) {
							var _adzoneRow = rows[jjj];
							var adzone = {
								PublisherAdZoneID 		: _adzoneRow.PublisherAdZoneID, 
								PublisherWebsiteID 		: _adzoneRow.PublisherWebsiteID, 
								PublisherAdZoneTypeID 	: _adzoneRow.PublisherAdZoneTypeID, 
								
								AdOwnerID 				: _adzoneRow.AdOwnerID, 
								PublisherInfoID 		: _adzoneRow.PublisherInfoID, // Same to AdOwner ID 

								ImpressionType 			: _adzoneRow.ImpressionType, 
								AdName 					: _adzoneRow.AdName, 
								Description 			: _adzoneRow.Description, 
								PassbackAdTag 			: _adzoneRow.PassbackAdTag, 
								AdStatus 				: _adzoneRow.AdStatus, 
								AutoApprove 			: _adzoneRow.AutoApprove, 
								AdTemplateID 			: _adzoneRow.AdTemplateID, 
								IsMobileFlag 			: _adzoneRow.IsMobileFlag, 
								Width 					: _adzoneRow.Width, 
								Height 					: _adzoneRow.Height, 
								FloorPrice 				: _adzoneRow.FloorPrice, 
								TotalRequests 			: _adzoneRow.TotalRequests,  // Update when bids req
								TotalImpressions 		: _adzoneRow.TotalImpressions,  // Update when impTracker
								TotalAmount 			: _adzoneRow.TotalAmount,  // Update when impTracker and clickTracker
								DateCreated 			: _adzoneRow.DateCreated,  
								DateUpdated 			: _adzoneRow.DateUpdated
							};

							if (adzoneFilter(adzone)) {
								publisherAdzone.push(adzone);
							}
						}
					}
				}
				publisher.Adzone = publisherAdzone;

				// console.log(publisher);

				Publishers.data.push(publisher);
			});
		});

		/*
		Publishers.data = [];
		new PublisherAdZone().fetchAll().then(function(pub) {
			if (pub) {
				pub.forEach(function(p) {
					var pub = initPublisherAttributes(p.attributes);

					if (publisherFilter(pub)) {
						Publishers.data.push(pub);
					}

				})
			}
			
		});
		*/
		if (next) next();
	}
};

var initPublisherAttributes = function(publisher) {

	return publisher;
}

var publisherFilter = function(publisher) {
	// Adzone status
	// 1 = auto approve, 2 = stop, 3 = running, 4 = banned
	if (!pub.AdStatus) return false;
	pub.AdStatus = parseInt(pub.AdStatus);
	if (pub.AdStatus != 1 && pub.AdStatus != 3) {
		console.error("WARN: Adzone ["+ pub.PublisherAdZoneID +"] is stopped or banned, skip.");
		return false;
	}

	return true;
};

var websiteFilter = function(website) {

	return true;
};

var adzoneFilter = function(adzone) {
	return true;
}

Publishers.init(function() {
	if (config.debug) {
		setTimeout(function() {
			require('fs').writeFile("logs/publisher_agent.txt", JSON.stringify(Publishers.data, null, 4), null);
		}, 2000);
	}
});

module.exports = Publishers;