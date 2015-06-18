'use strict';

var mysql = require('mysql');
var Promise = require('bluebird');

var config = {
    host     : 'sv5.lvduit.com',
    user     : 'root',
    password : '',
    database : 'bgate_demo',
    charset  : 'utf8'
};

var knex = require('knex')({
  client: 'mysql',
  connection: config
});

var bookshelf = require('bookshelf')(knex);

module.exports.config = config;
module.exports = bookshelf;