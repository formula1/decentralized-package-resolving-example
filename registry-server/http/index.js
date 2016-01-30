'use strict';

var Server = require('http').Server;
var Router = require('router');
var forwarded = require('forwarded');
var _ = require('lodash');
var isUntrusted;

module.exports = function(dbs, distribution, port){

  var registries = dbs.registries;
  var untrusted = dbs.untrusted;
  var packages = dbs.packages;

  var router = new Router();
  var server = new Server();

  server.on('request', function(req, res){
    router(req, res, function(err){
      if(err){
        res.statusCode = 500;
        res.end(JSON.stringify(err.stack));
      }else{
        res.statusCode = 404;
        res.end();
      }
    });
  });

  return Promise.resolve().then(function(){
    router.use(function(req, res, next){
      req.forwarded = forwarded(req);
      untrusted.get().then(function(list){
        return isUntrusted(list, req);
      }).then(function(boo){
        if(boo){
          res.statusCode = 403;
          return res.end();
        }

        next();
      }).catch(function(e){
        next(e);
      });
    });

    router.get('/', require('./methods/get-package').bind(void 0, packages, registries, distribution));
    router.post('/', require('./methods/post-package').bind(void 0, packages, distribution));
    router.post('/distributor', require('./methods/add-distributor').bind(void 0, packages, distribution));

    router.server = server;

    return new Promise(function(res){
      server.listen(port, function(){
        res(router);
      });
    });
  });
};

isUntrusted = function(list, req){
  var ip = req.connection.remoteAddress;
  if(ip in list) return list[ip];
  if(!req.forwarded) return false;
  if(!req.forwarded.length) return false;
  var intersection = _.intersection([list, req.forwarded]);
  if(intersection.length){
    return !intersection[0];
  }
};
