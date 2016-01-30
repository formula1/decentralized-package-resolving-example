'use strict';

var fs = require('fs');
var path = require('path');
var File = require('../shared/objects/File');
var IndexedDB = require('../shared/objects/IndexedDB');
var Client;

module.exports = Client = function(dirname){
  this.directory = new File(dirname);
  this.node_modules = this.directory.resolve('./node_modules');
  var dbs = this.dbs = {
    registries: path.join(dirname, 'registries.json'),
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
};

Client.prototype.resolve = function(semver){
  var resolveDistribution = require('./methods/semver-to-distribution-handle');
  var readableToSemVer = require('../shared/transforms/semver/readable-to-handle');
  return this.dbs.registries.get().then(function(registries){
    return resolveDistribution(readableToSemVer(semver), registries);
  });
};

Client.prototype.trust = function(registry, priority){
  return this.dbs.registries.add(registry, { location: registry, priority: priority });
};

Client.prototype.untrust = function(registry){
  return this.dbs.registries.remove(registry);
};

Client.prototype.install = function(semver){
  var resolveDistribution = require('./methods/semver-to-distribution-handle');
  var handleToPackage = require('../shared/requests/handle-to-package');
  var movePackage = require('./methods/move-package');
  var node_modules = this.node_modules;
  return resolveDistribution(semver, this.dbs.registries).then(function(distribution_handle){
    return handleToPackage(distribution_handle);
  }).then(function(package_folder){
    return movePackage(package_folder, node_modules);
  });
};

Client.prototype.publish = function(){
  var packageToHandler = require('../shared/transforms/package-to-handle');
  var validateHashes = require('./methods/validate-distribution-handles');
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
