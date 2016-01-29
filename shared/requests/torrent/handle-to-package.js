/* global __tmp */

'use strict';

var WebTorrent = require('webtorrent');
var tar = require('tar-fs');
var fs = require('fs');
var File = require('../../objects/File');

module.exports = function(handle){
  var tmpFullPath = new File(__tmp).newUniqueChild();
  return new Promise(function(res){
    var client = new WebTorrent([
      {
        dht: true,   // Enable DHT (default=true), or options object for DHT
        maxConns: 100,      // Max number of connections per torrent (default=55)
        tracker: false,      // Whether or not to enable trackers (default=true)
      },
    ]);

    client.add(handle.magnet, {
      path: __tmp,
    }, function(torrent){
      handle.distributors.forEach(torrent.addPeer.bind(torrent));
      torrent.on('done', function(){
        client.destroy();
        res(torrent.files[0]);
      });
    });
  }).then(function(file){
    return new Promise(function(res, rej){
      fs.createReadStream(file)
      .pipe(tar.extract(tmpFullPath.filename))
      .on('finish', function(){
        fs.unlink(file, function(){
          res(tmpFullPath);
        });
      }).on('error', rej);
    });
  });
};
