'use strict';

var mysql = require('mysql');
var Promise = require('bluebird');

var config = require('./config').db;

var knex = require('knex')({
  client: 'mysql',
  connection: config
});

console.info("INFO: Connect to MySQL Server.");
var bookshelf = require('bookshelf')(knex);

module.exports.config = config;
module.exports = bookshelf;