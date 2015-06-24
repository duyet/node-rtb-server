'use strict';

var config = require('../config/config');
var Model = require('../config/db').Model;


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
		Publishers.data = [];
		new PublisherAdZone().fetchAll().then(function(pub) {
			if (pub) {
				pub.forEach(function(p) {
					Publishers.data.push(p.attributes);
				})
			}
			
		});
		if (next) next();
	}
};

Publishers.init();

module.exports = Publishers;