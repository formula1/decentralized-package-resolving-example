'use strict';

var magnet = require('magnet-uri');
var WebTorrent = require('webtorrent');
var File = require('../../shared/objects/File');

module.exports = {};

module.exports.handleToReadable = function(handle){
  if(handle.type !== 'torrent') throw new Error('cannot handle torrent');
  try{
    return Promise.resolve(magnet.decode(handle.handle).infoHash);
  }catch(e){
    return Promise.reject(e);
  }
};

module.exports.validateHandle = function(handle){
  if(handle.type !== 'torrent'){
    return Promise.reject(new Error('This handle is not a torrent'));
  }

  return handle;
};

var testMagnet = /^magnet:\?xt=urn:[a-z0-9\:\=\%]{20,50}/i;
module.exports.readableToHandle = function(readable){
  if(!testMagnet.test(readable)) throw new Error('handle is not magnet');
  var ret = {
    type: 'torrent',
    handle: readable,
  };
  return Promise.resolve(ret);
};

module.exports.handleToConsumable = function(handle){
  var folder = new File('/tmp/').newUniqueChild();
  var pkgFolder;
  return folder.createIfNotExists(true).then(function(){
    return new Promise(function(res){
      var client = new WebTorrent({ dht: false });
      client.add(handle.handle, { path: folder.filename }, res);
    });
  }).then(function(torrent){
    pkgFolder = folder.resolve(`./${torrent.name}`);
    return torrent.files.reduce(function(p, file){
      return p.then(function(){
        return new Promise(function(iRes, iRej){
          file.getBuffer(function(err, buffer){
            if(err) return iRej(err);
            iRes(buffer);
          });
        });
      }).then(function(buffer){
        var fileToCreate = folder.resolve(`./${file.path}`);
        return fileToCreate.createIfNotExists(false).then(function(){
          return fileToCreate.setContents(buffer);
        });
      });
    }, Promise.resolve());
  }).then(function(){
    return pkgFolder;
  });
};
