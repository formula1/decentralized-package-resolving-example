'use strict';

var fs = require('fs');
var path = require('path');
var random = require('../random');
var tar = require('tar-fs');

var File;
module.exports = File = function(filename){
  if(filename instanceof File){
    this.filename = filename.filename;
  }else if(typeof filename === 'string'){
    this.filename = filename;
  }else{
    throw new Error(`cannot handle ${filename}`);
  };
};

File.prototype.exists = function(){
  var filename = this.filename;
  return new Promise(function(res){
    fs.exists(filename, res);
  });
};

File.prototype.isDirectory = function(){
  var filename = this.filename;
  return new Promise(function(res, rej){
    fs.stat(filename, function(err, stat){
      if(err) return rej(err);
      res(stat.isDirectory());
    });
  });
};

Object.defineProperty(File.prototype, 'extname', {
  get: function(){
    return path.extname(this.filename);
  },
});

Object.defineProperty(File.prototype, 'basename', {
  get: function(){
    return path.basename(this.filename);
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

File.prototype.setContents = function(contents){
  var filename = this.filename;
  return new Promise(function(res, rej){
    fs.writeFile(filename, contents, function(err){
      if(err) return rej(err);
      res();
    });
  });
};

File.prototype.streamContents = function(){
  return fs.createReadStream(this.filename);
};

File.prototype.toString = function(){
  return `File [${this.filename}]`;
};

File.prototype.newUniqueChild = function(ext){
  var filename = ext ? `${random.id()}.${ext}` : random.id();
  return new File(path.join(this.filename, filename));
};

File.prototype.copyTo = function(new_location){
  if(!(new_location instanceof File)) new_location = new File(new_location);
  var fn = this.filename;
  return new Promise(function(res, rej){
    tar.pack(fn).pipe(tar.extract(new_location.filename)).on('finish', function(){
      res(new_location);
    }).on('error', rej);
  });
};
