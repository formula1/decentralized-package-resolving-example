'use strict';

var path = require('path');

var fs = require('fs');
var path = require('path');

var File = require('../shared/objects/File');
var IndexedDB = require('../shared/objects/IndexedDB');

var __distDir = new File(__dirname).resolve('./distribution');

var DistributionServer;

module.exports = DistributionServer = function(dirname){
  this.dirname = new File(dirname);
  var dbs = this.dbs = {
    packages: path.join(dirname, 'packages.json'),
  };

  Object.keys(dbs).forEach(function(name){
    var filename = dbs[name];
    try{
      JSON.parse(fs.readFileSync(filename).toString());
    }catch(e){
      fs.writeFileSync(filename, '[]');
    }

    dbs[name] = new IndexedDB(filename);
  });

  this.services = [];
};

DistributionServer.prototype.addPackage = function(packageDir){
  return this.dbs.packages.add(packageDir.basename, { filename: packageDir.filename });
};

DistributionServer.prototype.listen = function(type, port){
  port = parseInt(port);
  var dirname = this.dirname;
  var packages = this.dbs.packages;
  var services = this.services;
  __distDir.children().then(function(children){
    if(children.indexOf(type) === -1) throw new Error('this type does not exist');
    var Service = require(__distDir.resolve(`./${type}`));
    var service = new Service(dirname);
    return service;
  }).then(function(service){
    return service.setPackages(packages).then(function(){
      return service.listen(port);
    }).then(function(){
      services.push(service);
      return service;
    });
  });
};
