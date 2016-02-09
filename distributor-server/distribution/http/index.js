'use strict';

var Server = require('http').Server;
var Router = require('router');
var tar = require('tar-fs');

var HttpServer;

module.exports = HttpServer = function(){

  var router = this.router = new Router();
  this.server = new Server();

  this.server.on('request', function(req, res){
    router(req, res, function(err){
      if(err){
        console.error('ERROR: ', err);
        res.statusCode = 500;
        res.end(JSON.stringify(err.stack));
      }else{
        res.statusCode = 404;
        res.end();
      }
    });
  });

  var _this = this;

  router.get('/packages/:name', function(req, res, next){
    _this.packages.get(req.params.name).then(function(pkg){
      if(!pkg) throw 404;
      res.setHeader('Content-Type', 'application/x-tar');
      res.setHeader('Content-Disposition', `attachment; filename="${req.name}.tar"`);
      tar.pack(pkg.filename).pipe(res);
    }).catch(function(e){
      next(e === 404 ? void 0 : e);
    });
  });
};

HttpServer.prototype.setPackages = function(packages){
  if(this.packages) throw new Error('packages already exists');
  this.packages = packages;
  return Promise.resolve();
};

HttpServer.prototype.listen = function(port){
  var server = this.server;
  return new Promise(function(res){
    server.listen(port, function(){
      res();
    });
  });
};
