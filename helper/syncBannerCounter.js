'use strict';

var config = require('../config/config');
var Model = require('../config/db').Model;
var BGateAgent = require('./BgateAgent');

module.exports.sync = function() {
	if (!BGateAgent || !BGateAgent.agents) return false;

	for (var i = 0; i < BGateAgent.agents; i++) {
		var agent = BGateAgent.agents[i];
		if (!agent.banner) return false;

		for (var j = 0; j < agent.banner; j++) {
			var banner = agent.banner[j];

		}
	}
}