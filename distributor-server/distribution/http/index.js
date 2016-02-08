'use strict';

var Server = require('http').Server;
var Router = require('router');
var tar = require('tar-fs');

var fs = require('fs');

var HttpServer;

module.exports = HttpServer = function(dir){
  this.dir = dir.resolve('./tarballs');
  if(!fs.existsSync(this.dir.filename)) fs.mkdir(this.dir.filename);

  var router = this.router = new Router();
  this.server = new Server(router);

  var _this = this;

  router.get('/packages/:name', function(req, res){
    _this.packages.get(req.params.name).then(function(pkg){
      if(!pkg) throw 404;
      res.setHeader('Content-Type', 'application/x-tar');
      res.setHeader('Content-Disposition', `attachment; filename="${req.name}.tar"`);
      tar.pack(pkg.filename).pipe(res);
    });
  });
};

HttpServer.prototype.setPackages = function(packages){
  if(this.packages) throw new Error('packages already exists');
  this.packages = packages;
};

HttpServer.prototype.listen = function(port){
  var server = this.server;
  return new Promise(function(res){
    server.listen(port, function(){
      res();
    });
  });
};
