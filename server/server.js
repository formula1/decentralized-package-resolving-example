'use strict';

var Server = require('http').Server;
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var url = require('url');
var forwarded = require('forwarded');
var async = require('async');
var request = require('request');

var mapHosts = require('../shared/map-hosts');

var ResolverServer, isUntrusted, stopRequests;

module.exports = ResolverServer = function(dirname){
  this.server = new Server();
  this.server.on('request', this.handleRequest.bind(this));

  if(dirname) this.useDirectory(dirname);

  this.packageRequests = {};
  this.proxyRequests = {};

};

ResolverServer.prototype.useDirectory = function(dirname){
  if(this.dirname == dirname) return;
  this.dirname = dirname;
  this.packagesfile = path.join(dirname, 'packages.json');
  this.trustedfile = path.join(dirname, 'trusted.json');
  this.untrustedfile = path.join(dirname, 'untrusted.json');

  this.packages = JSON.parse(fs.readFileSync(this.packagesfile).toString());
  this.trusted = JSON.parse(fs.readFileSync(this.trustedfile).toString());
  this.untrusted = JSON.parse(fs.readFileSync(this.untrustedfile).toString());
};

ResolverServer.prototype.addPackage = function(pkg){
  //console.log(arguments);
  this.packages[pkg.name] = pkg;
  fs.writeFileSync(this.packagesfile, JSON.stringify(this.packages));
};

ResolverServer.prototype.removePackage = function(name){
  delete this.packages[name];
  fs.writeFileSync(this.packagesfile, JSON.stringify(this.packages));
};

ResolverServer.prototype.addPeer = function(trusted_url){
  this.trusted.push({ location: trusted_url });
  fs.writeFileSync(this.trustedfile, JSON.stringify(this.trusted));
};

ResolverServer.prototype.removePeer = function(trusted_url){
  var i = _.indexOf(this.trusted, { location: trusted_url });
  if(i === -1) return;
  this.trusted.splice(i, 1);
  fs.writeFileSync(this.trustedfile, JSON.stringify(this.trusted));
};

ResolverServer.prototype.addUntrusted = function(untrusted){
  this.untrusted.push(untrusted);
  fs.writeFileSync(this.untrustedfile, JSON.stringify(this.untrusted));
};

ResolverServer.prototype.removeUntrusted = function(untrusted){
  var i = this.untrusted.indexOf(untrusted);
  if(i === -1) return;
  this.untrusted.splice(i, 1);
  fs.writeFileSync(this.untrustedfile, JSON.stringify(this.untrusted));
};

ResolverServer.prototype.handleRequest = function(req, res){
  //console.log('got request');

  var query = url.parse(req.url, true).query;
  req.forwarded = forwarded(req);

  var untrusted = isUntrusted(this.untrusted, req);
  if(untrusted){
    res.statusCode = 403;
    return res.end();
  }

  if(query.package in this.packages){
    res.statusCode = 200;
    return res.end(JSON.stringify([this.packages[query.package]]));
  }

  // only forwarding once for now
  if(req.forwarded.length > 1){
    res.statusCode = 404;
    return res.end();
  }

  async.reduce(
    this.trusted, { errors: [], found: [] },
    function(obj, trusted, next){
      mapHosts(query, { 'x-forwarded-for': req.connection.remoteAddress }, obj, trusted, function(err, cur_array){
        if(err && err.statusCode === 403) return next(err);
        next(void 0, cur_array);
      });
    },

    function(err, obj){
      if(err){
        console.error(err);
        res.statusCode = 500;
        return res.end();
      }

      if(obj.errors.length){
        //console.log('peer errors');
      }

      if(!obj.found.length){
        res.statusCode = 404;
        return res.end();
      }

      //console.log(possible);

      res.statusCode = 200;
      res.end(JSON.stringify(obj.found));
    }
  );
};

ResolverServer.prototype.updateTrusted = function(new_trusted){

  _.difference(this.trusted, new_trusted)
  .forEach(stopRequests.bind(void 0, this.proxyRequests));

  this.trusted = new_trusted;
};

ResolverServer.prototype.updateUntrusted = function(new_untrusted){

  _.difference(new_untrusted, this.untrusted)
  .forEach(stopRequests.bind(void 0, this.packageRequests));

  this.untrusted = new_untrusted;
};

ResolverServer.prototype.listen = function(port){
  try{
    port = parseInt(port);
  }catch(e){}
  finally{
    this.server.listen(port);
  }
};

ResolverServer.prototype.stop = function(){
  this.server.close.apply(this.server, arguments);
};

isUntrusted = function(list, req){
  var ip = req.connection.remoteAddress;
  if(ip in list) return list[ip];
  if(!request.forwarded) return false;
  if(!request.forwarded.length) return false;
  var intersection = _.intersection([list, request.forwarded]);
  if(intersection.length){
    return intersection[0];
  }
};

// TODO: should stop pending untrusted requests
stopRequests = function(allRequests, ip){
  if(!(ip in allRequests)) return;
  var requests = allRequests[ip];
  for(var i = 0, l = requests.length; i < l; i++) requests[i].cancel();
};
