'use strict';
var qs = require('querystring');
var request = require('request');

module.exports = function(query, headers, obj, host, next){
  request.get(
    `${host.location}?${qs.stringify(query)}`,
    { headers: headers },
    function(error, response, body){
      if(error){
        if(!response){
          obj.errors.push({ host: host, error: error });
          return next(void 0, obj);
        }

        error.statusCode = response.statusCode;
        if(response.statusCode === 404){
          obj.errors.push({ host: host, error: new Error('not found') });
          return next(void 0, obj);
        }

        if(response.statusCode === 403){
          obj.errors.push({ host: host, error: new Error('forbidden') });
          return next(void 0, obj);
        }

        return next(error);
      }

      if(response.statusCode === 404){
        obj.errors.push({ host: host, error: new Error('not found') });
        return next(void 0, obj);
      }

      obj.found = obj.found.concat(JSON.parse(body).map(function(pkg){
        pkg.host = pkg.host || host;
        return pkg;
      }));

      next(void 0, obj);
    }
  );
};
