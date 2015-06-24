var http = require('http');
var url = require('url');
var config = require('../config/config');

console.log("INFO: Start Cronjob sync");

var p = url.parse(config.domain);
var options = {
  host: p.host,
  port: config.port,
  path: config.routes.sync_banner + '?s=' + config.trigger_token,
  method: 'GET'
};

http.request(options, function(res) {
  console.log('STATUS: ' + res.statusCode);
  console.log('HEADERS: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', function (chunk) {
    console.log('BODY: ' + chunk);
  });
}).end();