'use strict';

var EE = require('events').EventEmitter;
var _ = require('lodash');
var DB = require('./DB');
var IndexedDB;

module.exports = IndexedDB = function(path){
  EE.call(this);
  this.rDB = new DB(path);
};

IndexedDB.prototype = Object.create(EE.prototype);

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
  var emit = this.emit.bind(this);
  return rDB.get().then(function(list){
    list.push({
      index: index,
      meta: meta,
    });

    return rDB.save(list).then(function(){
      emit('add', index, meta);
      return list;
    });
  }).then(function(list){
    return list.map(function(item){
      return item.meta;
    });
  });
};

IndexedDB.prototype.remove = function(index){
  var rDB = this.rDB;
  var emit = this.emit.bind(this);
  return rDB.get().then(function(list){
    var i = _.findIndex(list, { index: index });
    if(i === -1) return list;
    var item = list.splice(i, 1)[0];
    return rDB.save(list).then(function(){
      emit('remove', item.index, item.meta);
      return list;
    });
  }).then(function(list){
    return list.map(function(item){
      return item.meta;
    });
  });
};
