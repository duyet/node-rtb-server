'use strict';

var moment = require('moment');
var openrtb = require('../lib/openrtb');
var builder = openrtb.getBuilder({builderType:'bidRequest'}); 


exports.generate = function(req, res) {
	builder
	.timestamp(moment.utc().format())
	.id('1234')
	.at(2)
	.imp([
	  {
	      "id":"1",
	      "native":{
	        "request": {
	          "ver": 1,
	          "layout": 6,
	          "assets": [
	            { "id": 0, "req": 1, "title": { "len": 25 } }, 
	            { "id": 1, "req": 1, "img": { "type": 3, "wmin": 100, "hmin": 100 } },
	            { "id": 3, "req": 0, "data": { "type": 2, "len": 90 } }
	          ]
	        }
	      },
	      "tagid": "eb09ff2a287598302fd631493949169b0d17f815",
	      "bidfloor": 1.3
	  }
	])
	.app({
	  "id":"55",
	  "name":"Test App",
	  "cat":["IAB3-1"],
	  "storeurl": "http://www.example.com",
	  "publisher":{  
	      "id": "6332"
	  }
	})
	.device({
	    "dnt":0,
	    "ua":"Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
	    "ip":"76.174.49.222",
	    "connectiontype":2,
	    "devicetype":1,
	    "didsha1": "bbc9ff2a287598302fd631693949169b0d17f215",
	    "carrier": "o2",
	    "make": "samsung GT-I9300",
	    "model": "Android",
	    "language": "en",
	    "os": "Android",
	    "osv": "5.1.1",
	    "geo": {
	        "country": "UK"
	    }
	})
	.user({
	    "id":"55816b39711f9b5acf3b90e313ed29e51665623f",
	    "yob": 1987,
	    "gender": "M"
	})
	.ext({
	    'extra': '1234'
	})
	.build()
	.then(function(bidRequest){
	    res.send(bidRequest);
	});
};