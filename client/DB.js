'use strict';

var fs = require('fs');

var DB;

module.exports = DB = function(filepath){
  this.filepath = filepath;
  this.cached = void 0;
};

DB.prototype.get = function(){
  if(this.cached) return Promise.resolve(this.cached);
  var path = this.filepath;
  var _this = this;
  return new Promise(function(res, rej){
    fs.readFile(path, function(err, buff){
      if(err) return rej(err);
      try{
        _this.cached = JSON.parse(buff.toString('utf-8'));
        res(_this.cached);
      }catch(e){
        return rej(e);
      }
    });
  });
};

DB.prototype.save = function(array){
  if(!array) return Promise.reject(new Error('need an array'));
  array = this.cached = array || this.cached;
  var path = this.filepath;
  return new Promise(function(res, rej){
    var str;
    try{
      str = JSON.stringify(array);
    }catch(e){
      return rej(e);
    }

    fs.writeFile(path, str, function(err){
      if(err) return rej(err);
      res(array);
    });
  });
};
