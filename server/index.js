'use strict';

var fs = require('fs');
var path = require('path');
var IndexedDB = require('../shared/objects/IndexedDB');
var Distribution = require('./distribution');
var Http = require('./http');

var ResolverServer;

module.exports = ResolverServer = function(dirname, http_port, distribution_port){
  var dbs = this.dbs = {
    packages: path.join(dirname, 'packages.json'),
    registries: path.join(dirname, 'registries.json'),
    untrusted: path.join(dirname, 'untrusted.json'),
  };

  Object.keys(dbs).forEach(function(name){
    var filename = dbs[name];
    try{
      JSON.parse(fs.readFileSync(filename).toString());
    }catch(e){
      fs.writeFileSync(filename, '[]');
    }

    dbs[name] = new IndexedDB(filename);
  });

  this.distribution = new Distribution(distribution_port, dirname);

  Http(dbs, this.distribution, http_port);
};

ResolverServer.prototype.addPackage = function(pkg){
  return this.dbs.packages.add(JSON.stringify(pkg.semver), pkg);
};

ResolverServer.prototype.removePackage = function(pkg){
  return this.dbs.packages.remove(JSON.stringify(pkg.semver));
};

ResolverServer.prototype.addPeer = function(trusted_url){
  this.dbs.registries.add(trusted_url, { location: trusted_url });
};

ResolverServer.prototype.removePeer = function(trusted_url){
  this.dbs.registries.remove(trusted_url);
};

ResolverServer.prototype.addUntrusted = function(untrusted){
  this.dbs.untrusted.add(untrusted, untrusted);
};

ResolverServer.prototype.removeUntrusted = function(untrusted){
  this.dbs.untrusted.remove(untrusted);
};
