'use strict';

var WebTorrent = require('webtorrent');
var async = require('async');
var fs = require('fs');

var TorrentServer;

module.exports = TorrentServer = function(dir){
  this.dir = dir.resolve('./torrents');
  if(!fs.existsSync(this.dir.filename)) fs.mkdir(this.dir.filename);

  this.client = new WebTorrent([
    {
      dht: true,   // Enable DHT (default=true), or options object for DHT
      maxConns: 100,      // Max number of connections per torrent (default=55)
      tracker: false,      // Whether or not to enable trackers (default=true)
    },
  ]);

};

TorrentServer.prototype.setPackages = function(packages){
  if(this.packages) throw new Error('packages already exists');
  this.packages = packages;
  var client = this.client;

  packages.on('add', function(key, item){
    client.seed(item.filename, function(){
    });
  });

  packages.get().then(function(plist){
    return Promise.all(plist.map(function(item){
      return new Promise(function(res){
        client.seed(item.filename, function(){
          res();
        });
      });
    }));
  });
};

TorrentServer.prototype.listen = function(port){
  var client = this.client;
  return new Promise(function(res){
    client.listen(port, function(){
      res();
    });
  });
};
