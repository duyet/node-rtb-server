'use strict';

var _ = require('lodash');

var Model = require('../config/db').Model;
var bcrypt   = require('bcrypt');

exports.tracker = function(req, res) {
	res.send("OK");
};