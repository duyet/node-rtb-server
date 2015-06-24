'use stricts';

exports.db = require('./db.js');
exports.mongo = require('./mongodb.js');
exports.global = require('./global.js');

module.exports = {
	domain: 'http://ptnhttt.uit.edu.vn',	
	port: process.env.PORT || 8899,
	
	debug: true,

	sessionSecret: 'LvDuit',
	sessionCollection: 'sessions',
	tmpDir: '/tmp',
	logDir: '/logs',

	trigger_token: '73a90acaae2b1ccc0e969709665bc62f',
	trigger_key: 'lvduit',
	
	routes : {
		// Manual for API REST
		man: '/man',

		bids: '/bids',
		imp_tracker: '/imp_tracker',
		click_tracker: '/click_tracker',
		banner_render: '/banner_render',
		banner_preview: '/banner_preview',
		banner_generate_preview_link: '/banner_generate_preview_link',
		ping: '/ping',
		bidrequest: '/bidrequest',
		win: '/win',

		manager_agent: '/manager/agent',
		manager_banner: '/manager/banner',

		// Trigger refresh
		trigger_reset_agent: '/trigger/refresh/agent',
		trigger_reset_publisher: '/trigger/refresh/publisher',
		trigger_reset_all: '/trigger/refresh/all',

		// Trigger get agent

	}
}

