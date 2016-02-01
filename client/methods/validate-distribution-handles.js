'use strict';

module.exports = function(pluginloader, distribution_handles){
  var dist_methods = {};
  var errors = [];
  return Promise.all(distribution_handles.map(function(handle){
    if(!handle.type){
      errors.push(new Error('improper handle format'));
      return Promise.resolve(false);
    }

    return pluginloader.filterPlugins('validateHandle', handle)
    .then(function(plugin){
      return plugin.validateHandle(handle).then(function(){
        return plugin.handleToReadable(handle);
      });
    }).then(function(readable){
      if(!dist_methods[handle.type]) dist_methods[handle.type] = {};
      var cur_method = dist_methods[handle.type];
      if(!(readable in cur_method)){
        cur_method[readable] = [handle];
      }else{
        cur_method[readable].push(handle);
      }

      return handle;
    }).catch(function(e){
      errors.push(e);
      return false;
    });
  })).then(function(){
    return {
      errors: errors,
      distribution_methods: dist_methods,
    };
  });
};
