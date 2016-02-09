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

  return this.rDB.get().then(function(list){
    var i = _.findIndex(list, { index: index });
    if(i === -1) return false;
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
      return emit('add', index, meta);
    }).then(function(){
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
      return emit('remove', item.index, item.meta);
    }).then(function(){
      return list;
    }).catch(function(e){
      console.error(e.stack);
    });
  }).then(function(list){
    return list.map(function(item){
      return item.meta;
    });
  });
};

var emitMany;

IndexedDB.prototype.emit = function(type){
  var er, handler, len, args, i, events;
  var doError = type === 'error';

  events = this._events;
  if(events) doError = doError && events.error == null;
  else if(!doError) return Promise.resolve(false);

  // If there is no 'error' event listener then throw.
  if(doError){
    er = arguments[1];
    if(er instanceof Error){
      return Promise.reject(er); // Unhandled 'error' event
    }else{
      // At least give some kind of context to the user
      var err = new Error(`Uncaught, unspecified "error" event. (${er})`);
      err.context = er;
      return Promise.reject(err); // Unhandled 'error' event
    }
  }

  handler = events[type];

  if(!handler) return false;

  handler = typeof handler === 'function' ? [handler] : handler;
  len = arguments.length;
  args = new Array(len - 1);
  for(i = 1; i < len; i++) args[i - 1] = arguments[i];

  return emitMany(handler, this, args).then(function(){
    return true;
  });
};

emitMany = function(handler, self, args){
  return handler.slice(0).reduce(function(p, listener){
    return p.then(function(){
      return listener.apply(self, args);
    });
  }, Promise.resolve());
};
