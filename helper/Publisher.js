'use strict';

var _ = require('lodash');
var moment = require('moment');

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
		new PublisherAdZone({}).fetchAll().then(function(pub) {
			Publishers.data.push(pub);
		});
		if (next) next();
	}
};

Publishers.init();

module.exports = Publishers;