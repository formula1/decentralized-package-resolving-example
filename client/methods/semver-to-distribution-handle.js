'use strict';

var semverToDistHandle = require('../../shared/semver/handle-to-distributor-handle.js');
var getRequestor = require('../../shared/helpers/handle-to-package').getRequestor;

module.exports = function(semver_handle, registries){
  if(registries.length === 0) return Promise.reject('no hosts available');
  return semverToDistHandle(semver_handle, registries).then(function(distribution_handles){
    distribution_handles.filter(function(config){
      if(!getRequestor(config)) return false;
      return true;
    });

    distribution_handles.sort(function(a, b){
      return a.trust - b.trust;
    });

    return distribution_handles[0];
  });
};
