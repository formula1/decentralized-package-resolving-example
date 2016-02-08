'use strict';

var Server = require('http').Server;
var pushover = require('pushover');

var GitServer;

module.exports = GitServer = function(dir){
  this.dir = dir.resolve('./repos');
  this.router = pushover(this.dir.filename);

  this.router.on('push', function(push){
    console.log(`push ${push.repo}/${push.commit} (${push.branch})`);
    push.accept();
  });

  this.router.on('fetch', function(fetch){
    console.log(`fetch ${fetch.commit}`);
    fetch.accept();
  });

  this.server = new Server(this.router.handle.bind(this.router));

};

GitServer.prototype.setPackages = function(){ };

GitServer.prototype.listen = function(port){
  this.server.listen(port);
};
