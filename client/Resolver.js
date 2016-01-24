'use strict';

var async = require('async');
var path = require('path');
var _ = require('lodash');
var fs = require('fs');

var mapHosts = require('../shared/map-hosts');

var Resolver;

module.exports = Resolver = function(dirname){
  this.dir = dirname;
  this.cachefile = path.join(this.dir, 'cached.json');
  this.trustedfile = path.join(this.dir, 'trusted.json');

};

Resolver.prototype.trust = function(host_url, priority){
  priority = priority || 0;
  var trusted = JSON.parse(fs.readFileSync(this.trustedfile).toString());
  trusted.push({
    location: host_url,
    priority: priority,
  });

  trusted.sort(function(a, b){ return a.priority - b.priority; });

  fs.writeFileSync(this.trustedfile, JSON.stringify(trusted));
};

Resolver.prototype.untrust = function(host_url, keepCache){
  var trusted = JSON.parse(fs.readFileSync(this.trustedfile));
  var i = _.findIndex(trusted, { location:host_url });
  if(i === -1) return;
  trusted.splice(i, 1);
  fs.writeFileSync(this.trustedfile, JSON.stringify(trusted));
  if(keepCache) return;

  var cached = JSON.parse(fs.readFileSync(this.cachefile));
  cached = Object.keys(cached).filter(function(pkg_name){
    return cached[pkg_name].host.location !== host_url;
  }).reduce(function(new_cached, pkg_name){
    new_cached[pkg_name] = cached[pkg_name];
    return new_cached;
  }, {});

  fs.writeFileSync(this.cachefile, JSON.stringify(cached));
};

Resolver.prototype.resolve = function(pkg_name){

  var cachefile = this.cachefile;
  var cached = JSON.parse(fs.readFileSync(cachefile).toString());
  var trusted = JSON.parse(fs.readFileSync(this.trustedfile).toString());
  if(pkg_name in cached) return Promise.resolve(cached[pkg_name]);

  if(trusted.length === 0) return Promise.reject('no hosts available');
  return new Promise(function(res, rej){
    async.reduce(trusted, [],
      mapHosts.bind(void 0, { package: pkg_name, resolve: true }, {}),
    function(err, ari){
      if(err) return rej(err);
      if(ari.length === 0) return rej('not found');
      if(ari.length === 1) return res(ari[0]);
      ari = _.uniq(ari, 'location');
      if(ari.length === 1) return res(ari[0]);

      // console.log(`Multiple options available for ${pkg_name}`, ari);
      ari.sort(function(a, b){
        return a.host.priority - b.host.priority;
      });

      // console.log(`Using ${ari[0].host.location} to resolve ${pkg_name}`);
      res(ari[0]);
    });
  }).then(function(pkg){
    pkg.name = pkg_name;
    cached[pkg_name] = pkg;
    fs.writeFileSync(cachefile, JSON.stringify(cached));
    return pkg;
  });
};
