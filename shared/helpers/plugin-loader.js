'use strict';

var path = require('path');
var fs = require('fs');
var async = require('async');

var PluginLoader, bestMatched, filterPlugins;

module.exports = PluginLoader = function(plugin_directory, working_directory){
  this.enabledPlugins = require(path.join(working_directory, 'plugins.json'));
  var availablePlugins = fs.readFileSync(plugin_directory);

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

proto.handleToConsumable = function(handle){
  return filterPlugins(this.plugins, 'validateHandle', handle)
  .then(bestMatched).then(function(plugin){
    return plugin.handleToConsumable(handle);
  });
};

var validatePackage = require('../semver/validate-package');
proto.consumableToPackage = function(file){
  return file.isDirectory().then(function(boo){
    if(!boo) throw new Error('file is not a folder');
    return validatePackage(file);
  }).then(function(boo){
    if(!boo) throw new Error('File is not package');
    return file;
  }).catch(function(e){
    console.error('the consumable is not a package ', e);
    return filterPlugins(this.plugins, 'canHandleFile', file)
    .then(bestMatched).then(function(plugin){
      return plugin.consumableToPackage(file);
    });
  });
};

filterPlugins = function(plugins, verb, object){
  return new Promise(function(res, rej){
    async.filter(plugins, function(plugin, next){
      if(!plugin[verb]) return next(void 0, false);
      plugin[verb](object)
      .then(next.bind(void 0, void 0))
      .catch(function(err){
        console.error(err);
        next(void 0, false);
      });
    },

    function(err, possible){
      if(err) return rej(err);
      res(possible);
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
