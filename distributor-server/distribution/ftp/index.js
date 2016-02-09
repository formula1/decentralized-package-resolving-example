'use strict';

var Server = require('ftpd').FtpServer;
var File = require('../../../shared/objects/File');
var path = require('path');
var rimraf = require('rimraf');
var FtpServer;

module.exports = FtpServer = function(dir){
  dir = this.directory = dir.resolve('./ftp');
  this.server = new Server(process.env.IP || '127.0.0.1', {
    getInitialCwd: function(){ return '/'; },

    getRoot: function(){ return dir.filename; },

    pasvPortRangeStart: 1025,
    pasvPortRangeEnd: 1050,
  });

  this.server.on('client:connected', function(connection){
    var username = null;
    console.log('client connected:', connection.remoteAddress);
    connection.on('command:user', function(user, success, failure){
      if(user){
        username = user;
        success();
      }else{
        failure();
      }
    });

    connection.on('command:pass', function(pass, success, failure){
      if(pass){
        success(username);
      }else{
        failure();
      }
    });
  });

};

FtpServer.prototype.setPackages = function(packages){
  if(this.packages) throw new Error('packages already exists');
  this.packages = packages;
  var dir = this.directory;

  packages.on('add', function(name, item){
    return new File(item.filename).copyTo(path.join(dir.filename, item.name));
  });

  packages.on('remove', function(name, item){
    rimraf.sync(path.join(dir.filename, item.name));
  });

  return packages.get().then(function(list){
    return Promise.all(list.map(function(item){
      return new File(item.filename).copyTo(path.join(dir.filename, item.name));
    }));
  });
};

FtpServer.prototype.listen = function(port){
  var server = this.server;
  return new Promise(function(res){
    server.listen(port, function(){
      res();
    });
  });
};
