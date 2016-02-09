'use strict';

var WebTorrent = require('webtorrent');
var Server = require('bittorrent-tracker/server');
var tar = require('tar-fs');
var concatStream = require('concat-stream');

var fs = require('fs');

var TorrentServer;

module.exports = TorrentServer = function(dir){
  this.dir = dir.resolve('./torrents');
  if(!fs.existsSync(this.dir.filename)) fs.mkdir(this.dir.filename);

  this.client = new WebTorrent({ dht: false });

  this.torrents = {};
  this.server = new Server({ udp:true, http: false, ws: false, filter: function(infoHash, params, cb){
      // get the number of seeders for a particular torrent
      cb(true);
    },
  });
};

TorrentServer.prototype.setPackages = function(packages){
  if(this.packages) throw new Error('packages already exists');
  this.packages = packages;

  var _this = this;

  packages.on('add', function(key, item){
    return _this.addPackage(item);
  });

  packages.on('remove', function(key, item){
    return _this.removePackage(item);
  });

  return packages.get().then(function(plist){
    return Promise.all(plist.map(function(item){
      return _this.addPackage(item);
    }));
  });
};

TorrentServer.prototype.addPackage = function(item){
  var client = this.client;
  var torrents = this.torrents;
  var serverPort = this.__port;
  var serverhostname = this.__hostname;
  var directory = this.dir;

  return new Promise(function(res){
    tar.pack(item.filename).pipe(concatStream(function(buff){
      res(buff);
    }));
  }).then(function(buffer){
    new Promise(function(res){
      client.seed(buffer, {
        name: `${item.name}.tar`,            // name of the torrent (default = basename of `path`)
        // comment: String,         // free-form textual comments of the author
        createdBy: 'Distribution-Server',       // name and version of program used to create torrent
        // creationDate: Date       // creation time in UNIX epoch format (default = now)
        // private: Boolean,        // is this a private .torrent? (default = false)
        // pieceLength: Number      // force a custom piece length (number of bytes)
        announceList: [[`udp://${serverhostname}:${serverPort}`]], // custom trackers (array of arrays of strings) (see [bep12](http://www.bittorrent.org/beps/bep_0012.html))
        path: directory.filename,

        // urlList: [String]        // web seed urls (see [bep19](http://www.bittorrent.org/beps/bep_0019.html))
      }, function(torrent){
        torrents[item.name] = torrent;
        res(torrent);
      });
    });
  });
};

TorrentServer.prototype.removePackage = function(item){
  var client = this.client;
  var torrents = this.torrents;
  return new Promise(function(res, rej){
    client.remove(torrents[item.name], function(err){
      if(err) return rej(err);
      delete torrents[item.name];
    });
  });
};

TorrentServer.prototype.listen = function(port, hostname){
  var server = this.server;
  this.__port = port;
  this.__hostname = hostname = hostname || 'localhost';
  return new Promise(function(res){
    server.listen(port, hostname, function(){
      res();
    });
  });
};
