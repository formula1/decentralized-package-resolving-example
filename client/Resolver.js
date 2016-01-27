'use strict';

var async = require('async');
var _ = require('lodash');

var mapHosts = require('../shared/map-hosts');

var Resolver;

module.exports = Resolver = function(cachedDB, trustedDB){
  this.cached = cachedDB;
  this.trusted = trustedDB;
};

Resolver.prototype.trust = function(host_url, priority){
  priority = priority || 0;
  var trusted = this.trusted;
  return trusted.get().then(function(trustedarray){
    trustedarray.push({
      location: host_url,
      priority: priority,
    });

    trustedarray.sort(function(a, b){ return a.priority - b.priority; });

    return trusted.save(trustedarray);
  });
};

Resolver.prototype.untrust = function(host_url, keepCache){
  var trusted = this.trusted;
  var cached = this.cached;
  return trusted.get().then(function(trustedarray){
    var i = _.findIndex(trustedarray, { location:host_url });
    if(i === -1) return;
    trustedarray.splice(i, 1);
    return trusted.save(trustedarray);
  }).then(function(){
    if(keepCache) return true;
    return cached.get().then(function(cachedarray){
      cachedarray = Object.keys(cachedarray).filter(function(pkg_name){
        return cachedarray[pkg_name].host.location !== host_url;
      }).reduce(function(new_cached, pkg_name){
        new_cached[pkg_name] = cachedarray[pkg_name];
        return new_cached;
      }, {});

      return cached.save(cachedarray);
    });
  }).then(function(){
    return trusted;
  });
};

Resolver.prototype.resolve = function(pkg_name){

  var cached = this.cached, trusted = this.trusted;

  return Promise.all([cached.get(), trusted.get()]).then(function(allAri){
    var cachedobj = allAri[0];
    if(pkg_name in cachedobj) return Promise.resolve(cachedobj[pkg_name]);
    var trustedarray = allAri[1];
    if(trustedarray.length === 0) return Promise.reject('no hosts available');
    return new Promise(function(res, rej){
      async.reduce(trustedarray, { errors: [], found: [] },
        mapHosts.bind(void 0, { package: pkg_name, resolve: true }, {}),
      function(err, obj){
        if(err) return rej(err);
        // if(obj.errors.length) return rej(obj.errors);
        var ari = obj.found;
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
      cachedobj[pkg_name] = pkg;
      return cached.save(cachedobj).then(function(){
        return pkg;
      });
    });
  });
};
