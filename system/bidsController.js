'use strict';

var moment = require('moment');
var openrtb = require('../lib/openrtb');


exports.index = function(req, res) {
	res.send("Hello!!");
};

exports.bids = function(req, res) {
	if (!req.body) {
		res.status(400).send("ERR");
	}

	if (!req.body.id) res.status(400).send("ERR: Missing bid request id");

    // ==================================
    // GENERATE RESPOSNE 
    // ==================================
    var builder = openrtb.getBuilder({builderType:'bidResponse'}); 
    builder
    .timestamp(moment.utc().format())
	.status(1)
    .bidderName('test-bidder')
    .seatbid([
        {
            bid: [
                {
                  status: 1,
                  clearPrice: 0.9,
                  adid: 1,
                  id: '819582c3-96b2-401a-b60d-7ac3c117a513',
                  impid: 'e317ae49-8cd1-47b0-b022-02a8830182ce',
                  price: 1.05,
                  nurl: 'http://trackwin.com/win?pid=784170&data=OuJifVtEK&price=${AUCTION_PRICE}',
                  adm: '{"native":{"assets":[{"id":0,"title":{"text":"Test Campaign"}},{"id":1,"img":{"url":"http://cdn.exampleimage.com/a/100/100/2639042","w":100,"h":100}},{"id":2,"img":{"url":"http://cdn.exampleimage.com/a/50/50/2639042","w":50,"h":50}},{"id":3,"data":{"value":"This is an amazing offer..."}},{"id":5,"data":{"value":"Install"}}],"link":{"url":"http://trackclick.com/Click?data=soDvIjYdQMm3WBjoORcGaDvJGOzgMvUap7vAw2"},"imptrackers":["http://trackimp.com/Pixel/Impression/?bidPrice=${AUCTION_PRICE}&data=OuJifVtEKZqw3Hw7456F-etFgvhJpYOu0&type=img"]}}',
                  cid: '9607',
                  crid: '335224',
                  iurl: 'http://cdn.testimage.net/1200x627.png',
                  adomain: ["example.com"] 
                } 
            ]
        }
    ])
    .build()
    .then(function(bidResponse){
        res.jsonp(bidResponse);
    });
};