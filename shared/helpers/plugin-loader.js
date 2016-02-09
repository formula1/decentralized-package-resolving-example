'use strict';

var path = require('path');
var fs = require('fs');
var tar = require('tar-fs');

var PluginLoader, bestMatched, filterPlugins;

module.exports = PluginLoader = function(plugin_directory, working_directory){
  var plugins_file = path.join(working_directory, 'plugins.json');
  var availablePlugins = fs.readdirSync(plugin_directory);
  if(!fs.existsSync(plugins_file)){
    this.enabledPlugins = availablePlugins.map(function(name){
      return { name: name };
    });
  } else this.enabledPlugins = require(plugins_file);

  this.plugins = this.enabledPlugins.map(function(config){
    var name = config.name;
    if(availablePlugins.indexOf(name) === -1){
      throw new Error(`cannot load plugin ${name}`);
    }

    var ret  = require(path.join(plugin_directory, name));
    ret.priority = config.priority || 0;
    return ret;
  });
};

var proto = PluginLoader.prototype;

var readableToSemVer = require('../semver/readable-to-handle');
proto.readableToHandle = function(readable){
  return filterPlugins(this.plugins, 'readableToHandle', readable)
  .then(bestMatched).then(function(plugin){
    return plugin.readableToHandle(readable);
  }).catch(function(){
    return readableToSemVer(readable);
  });
};

proto.handleToConsumable = function(handle){
  return filterPlugins(this.plugins, 'validateHandle', handle)
  .then(bestMatched).then(function(plugin){
    return plugin.handleToConsumable(handle);
  });
};

var validatePackage = require('../semver/validate-package');
proto.consumableToPackage = function(file){
  var _this = this;
  return file.isDirectory().then(function(boo){
    if(!boo) throw new Error('file is not a folder');
    return validatePackage(file);
  }).then(function(boo){
    if(!boo) throw new Error('File is not package');
    return file;
  }).catch(function(e){
    console.error('the consumable is not a package ', e);
    return filterPlugins(_this.plugins, 'canHandleFile', file)
    .then(bestMatched).then(function(plugin){
      return plugin.consumableToPackage(file);
    }).then(_this.consumableToPackage.bind(_this));
  });
};

proto.filterPlugins = function(verb, object){
  return filterPlugins(this.plugins, verb, object);
};

PluginLoader.copy = function(input_dir, output_dir){
  tar.pack(input_dir).pipe(tar.extract(output_dir));
};

PluginLoader.filterPlugins = filterPlugins = function(plugins, verb, object){
  return Promise.all(plugins.map(function(plugin){
    if(!plugin[verb]) return false;
    return Promise.resolve().then(function(){
      return plugin[verb](object);
    }).then(function(result){
      return result === false ? false : plugin;
    }).catch(function(){
      return false;
    });
  })).then(function(mapped_plugins){
    return mapped_plugins.filter(function(p){
      return !!p;
    });
  });
};

bestMatched = function(possible){
  if(possible.length === 0){
    throw new Error('No Matches Found');
  }

  if(possible.length > 1){
    possible.sort(function(a, b){
      return a.priority - b.priority;
    });

    if(possible[0].priority === possible[1].priority){
      throw new Error('More than one option for handle');
    }
  }

  return possible[0];
};
