'use strict';

var async = require('async');
var request = require('request');
var url = require('url');

module.exports = function(handle, registries){
  return new Promise(function(res){
    async.map(registries, function(registry, next){
      request.post(url.resolve(registry.location, './publish'), handle, function(err, response){
        if(err) return next(err);
        if(response.statusCode !== 200) return next(response.statusCode);
        next(response);
      });
    },

    function(errors, successes){
      res({ errors:errors, successes:successes });
    });
  });
};
