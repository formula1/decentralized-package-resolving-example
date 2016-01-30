'use strict';

var _ = require('lodash');
var DB = require('./DB');
var IndexedDB;

module.exports = IndexedDB = function(path){
  this.rDB = new DB(path);
};

IndexedDB.prototype.indexOf = function(index){
  return this.rDB.get().then(function(list){
    return _.findIndex(list, { index: index });
  });
};

IndexedDB.prototype.has = function(index){
  return this.indexOf(index).then(function(i){
    return i !== -1;
  });
};

IndexedDB.prototype.get = function(index){
  if(!index){
    return this.rDB.get().then(function(list){
      return list.map(function(item){
        return item.meta;
      });
    });
  }

  this.rDB.get().then(function(list){
    var i = _.findIndex(list, { index: index });
    return list[i].meta;
  });
};

IndexedDB.prototype.add = function(index, meta){
  var rDB = this.rDB;
  return rDB.get().then(function(list){
    list.push({
      index: index,
      meta: meta,
    });

    return rDB.save(list);
  }).then(function(list){
    return list.map(function(item){
      return item.meta;
    });
  });
};

IndexedDB.prototype.remove = function(index){
  var rDB = this.rDB;
  return rDB.get().then(function(list){
    var i = _.findIndex(list, { index: index });
    if(i === -1) return;
    list.splice(i, 1);
    return rDB.save(list);
  }).then(function(list){
    return list.map(function(item){
      return item.meta;
    });
  });
};
