
'use strict';

var WebTorrent = require('webtorrent');
var async = require('async');
module.exports = function(tors, port){
  var client = new WebTorrent([
    {
      dht: true,   // Enable DHT (default=true), or options object for DHT
      maxConns: 100,      // Max number of connections per torrent (default=55)
      tracker: false,      // Whether or not to enable trackers (default=true)
    },
  ]);

  tors.getChildren().then(function(children){
    return new Promise(function(res, rej){
      async.each(children, function(child, next){
        client.seed(child, function(){
          next();
        });
      },

      function(err){
        if(err) return rej(err);
        client.listen(port, function(){
          res(client);
        });
      });
    });
  });
};
