'use strict';

var fs = require('fs');
var path = require('path');
var File = require('../../shared/objects/File');
var request = require('request');
var validUrl = require('valid-url');
var mime = require('mime-types');

module.exports = {};

module.exports.handleToReadable = function(handle){
  if(handle.type !== 'http') throw new Error('cannot handle non http');

  return Promise.resolve(handle.handle);
};

module.exports.readableToHandle = function(readable){
  if(!validUrl.isUri(readable)) throw new Error('handle is not uri');
  if(!/^http(?:s)?\:\/\//.test(readable)) throw new Error('This is not an http uri');
  var ret = {
    type: 'http',
    handle: readable,
  };
  return Promise.resolve(ret);
};

module.exports.validateHandle = function(handle){
  if(handle.type !== 'http') throw new Error('cannot handle non http');
  if(!validUrl.isUri(handle.handle)) throw new Error('handle is not uri');

  return handle;
};

module.exports.handleToConsumable = function(handle){
  return new Promise(function(res, rej){
    request.get(handle.handle, function(err, response, body){
      if(err) return rej(err);
      var filename = `file-${Date.now()}.${mime.extension(response.headers['content-type'])}`;

      var file = new File(path.join('/tmp/', filename));
      fs.writeFile(file.filename, body, function(wErr){
        if(wErr) return rej(wErr);
        res(file);
      });
    });
  });
};
