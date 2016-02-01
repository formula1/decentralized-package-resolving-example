'use strict';

var NotFoundError = require('../../shared/errors/NotFound');

module.exports = function(pluginloader, dist_handles){
  if(!dist_handles.length){
    return Promise.reject(new NotFoundError());
  }

  // removing all distribtion handles we can't consume
  return Promise.all(dist_handles.map(function(dist_handle){
    return pluginloader.filterPlugins('validateHandle', dist_handle.distribution)
    .then(function(boo){
      if(!boo) return false;
      return dist_handle;
    }).catch(function(e){
      return false;
    });
  })).then(function(mapped_handles){
    dist_handles = mapped_handles.filter(function(dist_handle){
      return !!dist_handle;
    });

    if(!dist_handles.length){
      throw new NotFoundError();
    }

    dist_handles.sort(function(a, b){
      return a.trust - b.trust;
    });

    return dist_handles[0];
  });
};
