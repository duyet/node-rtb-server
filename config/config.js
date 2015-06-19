'use stricts';

exports.db = require('./db.js');
exports.global = require('./global.js');
var _ = require('lodash');
var glob = require('glob');

module.exports = {
	domain: 'http://ptnhttt.uit.edu.vn',	
	port: process.env.PORT || 8899,
	bidsPath: 'bids',
	winPath: 'win',
	lossPath: 'loss',
	impTrackerPath: 'imptracker',
	clickTrackerPath: 'click_tracker',

	sessionSecret: 'LvDuit',
	sessionCollection: 'sessions',
	tmpDir: 'tmp/',
	uploadPath: 'public/uploads'
}

module.exports.global = require('./global.js');

module.exports.getGlobbedFiles = function(globPatterns, removeRoot) {
	// For context switching
	var _this = this;

	// URL paths regex
	var urlRegex = new RegExp('^(?:[a-z]+:)?\/\/', 'i');

	// The output array
	var output = [];

	// If glob pattern is array so we use each pattern in a recursive way, otherwise we use glob 
	if (_.isArray(globPatterns)) {
		globPatterns.forEach(function(globPattern) {
			output = _.union(output, _this.getGlobbedFiles(globPattern, removeRoot));
		});
	} else if (_.isString(globPatterns)) {
		if (urlRegex.test(globPatterns)) {
			output.push(globPatterns);
		} else {
			glob(globPatterns, {
				sync: true
			}, function(err, files) {
				if (removeRoot) {
					files = files.map(function(file) {
						return file.replace(removeRoot, '');
					});
				}

				output = _.union(output, files);
			});
		}
	}

	return output;
};