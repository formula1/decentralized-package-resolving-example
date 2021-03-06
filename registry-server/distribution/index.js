'use strict';

var WebTorrent = require('webtorrent');
var async = require('async');
var request = require('request');
var qs = require('qs');
var path = require('path');
var validUrl = require('valid-url');

var Distribution;
var IndexedDB = require('../../shared/objects/IndexedDB');

var notifyOfHandle;

module.exports = Distribution = function(port, dirname){
  this.port = port;
  this.client = new WebTorrent({ torrentPort: port });
  if(dirname) this.setDirectory(dirname);
};

Distribution.prototype.setDirectory = function(dirname){
  this.dirname = dirname;
  this.distributors = new IndexedDB(path.join(dirname, 'distributors.json'));
};

Distribution.prototype.distribute = function(pkg){
  var client = this.client;
  return Promise.all([
    new Promise(function(res){
      client.seed(pkg.filename, function(torrent){
        res(torrent);
      });
    }),

    this.distributors.get(),
  ]).then(function(ret){
    var handle = {
      type: 'torrent',
      handle: ret[0].magnetURI,
    };

    return notifyOfHandle(handle, ret[1]).then(function(){
      return handle;
    });
  });
};

Distribution.prototype.updateHandle = function(pkg){
  var d_handle = pkg.distribution;
  if(validUrl.isUri(d_handle.handle)){
    d_handle.type = 'http';
    return Promise.resolve(pkg);
  }

  return this.distributors.get().then(function(list){
    if(!list.length) throw new Error('No Distributors Available');
    pkg.distribution.distributors = list;
    return pkg;
  });
};

notifyOfHandle = Distribution.prototype.notifyOfHandle = function(handle, distributors){
  var query = qs.stringify(handle);
  return new Promise(function(res, rej){
    async.each(distributors, function(distributor, next){
      request(`${distributor.ip}:${distributor.port}/handle?${query}`, function(err, response){
        if(err) console.error('error when notifying', err);
        if(response.statusCode !== 200) console.error('notifying status code', err);
        next();
      });
    },

    function(err){
      if(err) return rej(err);
      res();
    });
  });
};

Distribution.prototype.addDistributor = function(ip, query){
  if(!query.port) return Promise.reject(401);
  return this.distributors.add(ip, { ip: ip, port: query.port });
};
