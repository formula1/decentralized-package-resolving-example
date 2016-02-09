'use strict';

var File = require('../../shared/objects/File');

module.exports = {};

module.exports.readableToHandle = function(readable){
  if(!/^\.{0,2}\//.test(readable)) return Promise.reject(new Error('handle is not filesystem path'));
  var ret = {
    type: 'filesystem',
    handle: readable,
  };

  return Promise.resolve(ret);
};

module.exports.validateHandle = function(handle){
  if(!handle.type === 'filesystem')
    return Promise.reject('Handle improper type');
  return new File(handle.handle).exists();
};

module.exports.handleToConsumable = function(handle){
  return new File(handle.handle);
};

var validatePackage = require('../../shared/semver/validate-package');
module.exports.canHandleFile = function(file){
  return file.isDirectory().then(function(boo){
    if(!boo) throw new Error('file needs to be a folder');
    return validatePackage(file);
  }).then(function(boo){
    if(!boo) throw new Error('File is not package');
    return true;
  });
};

module.exports.consumableToPackage = function(original_package){
  return original_package;
};
