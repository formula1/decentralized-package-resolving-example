'use strict';

var path = require('path');
var tar = require('tar-fs');
var File = require('../../shared/objects/File');
var Readable = require('stream').Readable;

module.exports = {};

module.exports.readableToHandle = function(readable){
  if(!/^[\.\/]/) throw new Error('handle is not filesystem path');
  var ret = {
    type: 'filesystem',
    handle: readable,
  };

  return Promise.resolve(ret);
};

module.exports.handleToConsumable = function(handle){
  if(!handle.type === 'filesystem')
    return Promise.reject('Handle improper type');

  var file = new File(handle.handle);
  return file.exists().then(function(boo){
    if(!boo) throw new Error('This file does not exists');
    return file;
  });
};

module.exports.canHandleFile = function(file){
  return file.isDirectory();
};

module.exports.consumableToPackage = function(original_package, directory){
  return new Promise(function(res, rej){
    tar.pack(original_package.filename).pipe(tar.extract(directory.filename))
    .on('finish', function(){
      res(new File(directory));
    }).on('error', rej);
  });
};
