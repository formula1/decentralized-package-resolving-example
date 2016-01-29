'use strict';

var Server = require('http').Server;
var Router = require('router');
var qs = require('qs');

module.exports = function(registries, port){

  var router = new Router();
  var server = new Server(router);

  return Promise.resolve().then(function(){
    router.get('/publish', function(req, res, next){
      registries.has(req.remoteAddress).then(function(boo){
        if(!boo){
          res.statusCode = 403;
          return res.end();
        }

        try{
          req.query = qs.parse(req.query, true);
        }catch(e){
          res.statusCode = 500;
          res.end(e.message);
        }

        next();
      });
    });

    router.registries = registries;
    router.server = server;

    return new Promise(function(res){
      server.listen(port, function(){
        res(router);
      });
    });
  });

};
