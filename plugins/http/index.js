'use strict';

var validUrl = require('valid-url');

module.exports = {};

module.exports.handleToReadable = function(handle){
  if(handle.type !== 'http') throw new Error('cannot handle non http');

  return Promise.resolve(handle.handle);
};

module.exports.readableToHandle = function(readable){
  if(!validUrl.isUri(readable)) throw new Error('handle is not uri');
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
