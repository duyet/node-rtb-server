'use stricts';

exports.db = require('./db.js');
exports.global = require('./global.js');

module.exports = {
	domain: 'http://ptnhttt.uit.edu.vn',	
	port: process.env.PORT || 8899,
	
	debug: true,

	sessionSecret: 'LvDuit',
	sessionCollection: 'sessions',
	tmpDir: 'tmp/',
	
	routes : {
		bids: '/bids',
		imptracker: '/imptracker',
		click_tracker: '/click_tracker',
		banner_render: '/banner_render',
		banner_preview: '/banner_preview',
		banner_generate_preview_link: '/banner_generate_preview_link',
		ping: '/ping',
		bidrequest: '/bidrequest',
		win: '/win',
		config_agent: '/config_agent',
		config_banner: '/config_banner'
	}
}

