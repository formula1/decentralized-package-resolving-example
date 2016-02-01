'use strict';

var magnet = require('magnet-uri');

module.exports = {};

module.exports.handleToReadable = function(handle){
  if(handle.type !== 'torrent') throw new Error('cannot handle torrent');
  try{
    return Promise.resolve(magnet.decode(handle.handle).infoHash);
  }catch(e){
    return Promise.reject(e);
  }
};

var testMagnet = /magnet:\?xt=urn:[a-z0-9]{20,50}/i;
module.exports.validateHandle = function(handle){
  if(handle.type !== 'torrent'){
    return Promise.reject(new Error('This handle is not a torrent'));
  }

  if(!testMagnet.test(handle.handle)){
    return Promise.reject(new Error('This is not a magnet uri'));
  }

  return handle;
};
