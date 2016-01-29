'use strict';

var fs = require('fs');
var path = require('path');
var random = require('../random');

var File;
module.exports = File = function(filename){
  this.filename = filename;
};

File.prototype.exists = function(){
  var filename = this.filename;
  return new Promise(function(res){
    fs.exists(filename, res);
  });
};

Object.defineProperty('extname', File.prototype, {
  get: function(){
    return path.extname(this.filename);
  },
});

File.prototype.createIfNotExists = function(asDirectory){
  var _this = this;
  var filename = this.filename;
  return new Promise(function(res, rej){
    fs.stat(filename, function(err, stat){
      if(err){
        if(asDirectory){
          return fs.mkdir(filename, function(wErr){
            if(wErr) return rej(wErr);
            res(_this);
          });
        }else{
          return fs.writeFile(filename, '', function(wErr){
            if(wErr) return rej(wErr);
            res(_this);
          });
        }
      }

      if(asDirectory === stat.isDirectory()) return res();
      return rej(`Cannot create because there is a ${asDirectory ? 'file' : 'folder'} at this path`);
    });
  });
};

File.prototype.resolve = function(child){
  return new File(path.resolve(this.filename, child));
};

File.prototype.getChildren = function(){
  var filename = this.filename;
  var resolve = this.resolve.bind(this);
  return new Promise(function(res, rej){
    fs.readdir(filename, function(err, children){
      if(err) return rej(err);
      res(children.map(resolve));
    });
  });
};

File.prototype.getContents = function(){
  var filename = this.filename;
  return new Promise(function(res, rej){
    fs.readFile(filename, function(err, contents){
      if(err) return rej(err);
      res(contents);
    });
  });
};

File.prototype.streamContents = function(){
  return fs.createReadStream(this.filename);
};

File.protoype.toString = function(){
  return `File [${this.filename}]`;
};

File.prototype.newUniqueChild = function(){
  return new File(path.join(this.filename, random.id()));
};
