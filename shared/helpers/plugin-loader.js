'use strict';

var path = require('path');
var fs = require('fs');
var async = require('async');

var PluginLoader;

module.exports = PluginLoader = function(feedback, plugin_directory, working_directory){
  this.feedback = feedback;
  this.enabledPlugins = require(path.join(working_directory, 'plugins.json'));
  var availablePlugins = fs.readFileSync(plugin_directory);

  this.plugins = this,enabledPlugins.map(function(name){
    if(availablePlugins.indexOf(name) === -1) throw new Error(`cannot load plugin ${name}`);
    return require(path.join(plugin_directory, name));
  });
};

var proto = PluginLoader.prototype;

proto.handleToConsumable = function(handle){
  var _this = this;
  var feedback = this.feedback;
  return new Promise(function(res, rej){
    async.filter(this.plugins, function(plugin, next){
      if(!plugin.validateHandle) return next(void 0, false);
      plugin.validateHandle(handle)
      .then(next.bind(void 0, void 0))
      .catch(function(err){
        return feedback.error('validateHandle', err, handle, plugin, _this);
      }).then(next.bind(void 0, void 0, false));
    },

    function(err, possible){
      if(err) return rej(err);
      res(possible);
    });
  }).then(function(possible){
    if(possible.length > 1){
      return feedback.options('Can use handle', possible);
    }
    return possible[0];
  }).then(function(){

  });
};


proto.consumableToPackage = function(file){

};
