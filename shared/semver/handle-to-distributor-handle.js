'use strict';

var qs = require('qs');
var request = require('request');
var async = require('async');
var _ = require('lodash');

var NotFoundError = require('../errors/NotFound');

var reduceRegistries, addtoWeightedTrustFrom;

module.exports = function(semver_handle, registries, headers){
  return new Promise(function(res, rej){
    async.reduce(registries, { found: [], errors: [], missing: [] },
      reduceRegistries.bind(void 0, semver_handle, headers || {}),
    function(err, obj){
      if(err) return rej(err);
      if(!obj.found.length){
        if(!obj.errors.length) return rej(new NotFoundError(semver_handle.name, 'registries'));
        return rej(obj.errors);
      }

      res(obj.found);
    });
  });
};

reduceRegistries = function(query, headers, obj, registry, next){
  request.get(
    `${registry.location}?${qs.stringify(query)}`,
    { headers: headers },
    function(error, response, body){
      if(!response){
        obj.errors.push({ registry: registry, error: error });
        return next(void 0, obj);
      }

      switch(response.statusCode){
        case 200: break;
        case 404: obj.missing.push({ registry: registry }); break;
        case 403: obj.errors.push({ registry: registry, error: new Error('forbidden') }); break;
        case 500: obj.errors.push({ registry: registry, error: body }); break;
        default: obj.errors.push({ registry: registry, error: body }); break;
      }

      if(response.statusCode !== 200){
        return next(void 0, obj);
      }

      var parsedarray = JSON.parse(body);
      if(!(parsedarray instanceof Array)) parsedarray = [parsedarray];
      var err;

      parsedarray.forEach(function(parsed){
        var found = obj.found.some(function(config){
          if(!_.isEqual(config.semver, config.semver)) return false;
          if(!_.isEqual(config.repository, parsed.repository)) return false;
          var cdist = config.distribution, pdist = parsed.distribution;
          if(!_.isEqual(cdist.protocol, pdist.protocol)) return false;
          if(!_.isEqual(cdist.handle, pdist.handle)) return false;
          if(!_.isEqual(cdist.transform, pdist.transform)){
            err = new Error('handles and protocol are the dame, but not transform');
            return true;
          }

          config.registries.push(registry);
          cdist.distributors = _.uniq(cdist.distributors.concat(pdist.distributors));
          config.trust = addtoWeightedTrustFrom(registry, config.trust);
          return true;
        });

        if(!found){
          obj.found.push({
            semver: parsed.semver,
            repository: parsed.repository,
            distribution: parsed.distribution,
            registries: [registry],
            trust: registry.priority,
          });
        }
      });

      return next(err, obj);
    }
  );
};

addtoWeightedTrustFrom = function(registry, num){
  return Math.max(registry || 0, num);
};
