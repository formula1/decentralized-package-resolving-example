'use strict';

var getRequestor;

module.exports = function(handle){
  var fn = getRequestor(handle);
  if(!fn) throw new Error(`cannot handle ${handle.type}`);
  return fn(handle);
};

getRequestor = module.exports.getRequestor = function(handle){
  switch(handle.type){
    case 'git': return require('./git/handle-to-package');
    case 'torrent': return require('./torrent/handle-to-package');

    // case 'semver': return require('./semver/handle-to-package')(handle);
  }
};
