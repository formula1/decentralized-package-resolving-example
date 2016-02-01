'use strict';

var fs = require('fs');
var path = require('path');
var File = require('../shared/objects/File');
var IndexedDB = require('../shared/objects/IndexedDB');
var PluginLoader = require('../shared/helpers/plugin-loader');
var Client;

module.exports = Client = function(dirname){
  this.directory = new File(dirname);
  this.pluginloader = new PluginLoader(path.resolve(__dirname, '../plugins'), dirname);
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

Client.prototype.resolve = function(readable){
  var semverToDistHandles = require('../shared/semver/handle-to-distributor-handle.js');
  var reduceDistHandles = require('./methods/reduce-distribution-handles');
  var pluginloader = this.pluginloader;
  var registryDB = this.dbs.registries;
  return pluginloader.readableToHandle(readable).then(function(handle){
    if(handle.type !== 'semver') return handle;
    return registryDB.get().then(function(registries){
      if(!registries.length) throw 'no hosts available';
      return semverToDistHandles(handle, registries);
    }).then(function(dist_handles){
      return reduceDistHandles(pluginloader, dist_handles);
    });
  });
};

Client.prototype.trust = function(registry, priority){
  return this.dbs.registries.add(registry, { location: registry, priority: priority });
};

Client.prototype.untrust = function(registry){
  return this.dbs.registries.remove(registry);
};

Client.prototype.install = function(readable){
  var pluginloader = this.pluginloader;
  var movePackage = require('./methods/move-package');
  var node_modules = this.node_modules;
  return this.resolve(readable).then(function(distribution_handle){
    return pluginloader.handleToConsumable(distribution_handle);
  }).then(function(consumable){
    return pluginloader.consumableToPackage(consumable);
  }).then(function(package_folder){
    return movePackage(package_folder, node_modules);
  });
};

Client.prototype.publish = function(){
  var packageToHandler = require('../shared/helpers/package-to-handle');
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
