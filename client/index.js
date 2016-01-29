'use strict';

var path = require('path');
var File = require('../shared/objects/File');
var IndexedDB = require('../shared/objects/IndexedDB');
var Client;

module.exports = Client = function(dirname){
  this.directory = new File(dirname);
  this.node_modules = this.directory.resolve('./node_modules');
  this.registries = new IndexedDB(path.join(this.directory.filename, 'trusted.json'));
};

var resolveDistribution = require('./methods/semver-to-distribution-handle');
Client.prototype.resolve = function(semver){
  return resolveDistribution(semver, this.registries);
};

Client.prototype.trust = function(registry, priority){
  return this.registries.add(registry, { location: registry, priority: priority });
};

Client.prototype.untrust = function(registry){
  return this.registries.remove(registry);
};

var handleToPackage = require('../shared/requests/handle-to-package');
var movePackage = require('./methods/move-package');
Client.prototype.install = function(semver){
  var node_modules = this.node_modules;
  return resolveDistribution(semver, this.registries).then(function(distribution_handle){
    return handleToPackage(distribution_handle);
  }).then(function(package_folder){
    return movePackage(package_folder, node_modules);
  });
};

var packageToHandler = require('../shared/transforms/package-to-handle');
var validateHashes = require('./methods/validate-distribution-handles');
Client.prototype.publish = function(){
  packageToHandler(this.directory).then(function(responses){
    if(responses.successes.length === 0) throw responses.errors;
    return validateHashes(responses.successes);
  }).then(function(results){
    if(Object.keys(results.distribution_methods).length === 0){
      throw results.errors;
    }

    if(Object.keys(results.distribution_methods.torrent).length > 1){
      throw 'Torrents should never be different';
    }

    return results.distribution_methods;
  });
};
