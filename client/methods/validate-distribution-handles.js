'use strict';

var async = require('async');
var magnetUri = require('magnet-uri');

var validateTorrent;

module.exports = function(distribution_handles){
  var distribution_methods = {};
  var errors = [];
  return new Promise(function(res){
    async.each(distribution_handles, function(handle, next){
      if(!distribution_methods[handle.type]){
        distribution_methods[handle.type] = {};
      }

      var unique = distribution_methods[handle.type];
      var netvalue;
      try{
        switch(handle.type){
          case 'torrent': netvalue = validateTorrent(handle); break;
          case 'git':
          case 'http':
          default: throw 'unimplemented';
        }
      }catch(e){
        errors.push({ error: e, handle: handle });
        return next();
      }

      if(!(netvalue in unique)){
        unique[netvalue] = [handle];
      }else{
        unique[netvalue].push(handle);
      }

      next();
    },

    function(){
      res({ errors: errors, distribution_methods: distribution_methods });
    });
  });
};

validateTorrent = function(handle){
  return magnetUri.decode(handle.handle).infoHash;
};
