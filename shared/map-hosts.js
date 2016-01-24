'use strict';
var qs = require('querystring');
var request = require('request');

module.exports = function(query, headers, array, host, next){
  request.get(
    `${host.location}?${qs.stringify(query)}`,
    { headers: headers },
    function(error, response, body){
//      console.log(response ? response.statusCode : 'void 0', error);
      if(error){
        if(!response){
//          console.log(error);
          return next(void 0, array);
        }

        error.statusCode = response.statusCode;
        if(response.statusCode === 404) return next(void 0, array);
        if(response.statusCode === 403){
//          if(host.trusted)
//          console.log('you have been blacklisted from this host or one of their peers');
        }

        return next(error);
      }

      if(response.statusCode === 404) return next(void 0, array);

//      console.log(body);

      next(void 0, array.concat(JSON.parse(body).map(function(pkg){
        pkg.host = pkg.host || host;
        return pkg;
      })));
    }
  );
};
