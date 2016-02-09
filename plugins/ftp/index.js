'use strict';

var fs = require('fs');
var path = require('path');
var File = require('../../shared/objects/File');
var validUrl = require('valid-url');
var url = require('url');
var Client = require('ftp');

module.exports = {};

module.exports.handleToReadable = function(handle){
  if(handle.type !== 'ftp') throw new Error('cannot handle non http');

  return Promise.resolve(handle.handle);
};

module.exports.readableToHandle = function(readable){
  if(!validUrl.isUri(readable)) throw new Error('handle is not uri');
  if(!/^ftp\:\/\//.test(readable)) throw new Error('This is not an ftp uri');

  var ret = {
    type: 'ftp',
    handle: url.parse(readable),
  };
  return Promise.resolve(ret);
};

module.exports.validateHandle = function(handle){
  if(handle.type !== 'ftp') throw new Error('cannot handle non ftp');

  return handle;
};

var checkUnknown, walkDirectory, downloadFile;
module.exports.handleToConsumable = function(handle){
  var file = new File('/tmp/').newUniqueChild();

  return new Promise(function(res, rej){
    var c = new Client();

    var to = setTimeout(function(){
      rej('timed out');
      c.end();
    }, 5000);

    c.on('ready', function(){
      clearTimeout(to);

      c.cwd(handle.handle.pathname, function(err, CWD){
        if(err) return rej(err);
        c.__CWD = CWD;
        res(c);
      });
    });

    c.connect({
      host: handle.handle.hostname,
      port: handle.handle.port,
    });

  }).then(function(c){
    return walkDirectory(c, file).then(function(){
      c.end();
      return file;
    });
  });
};

checkUnknown = function(client, item, localfolder){
  if(item.type !== 'd') return downloadFile(client, item, localfolder);

  return new Promise(function(res, rej){
    client.cwd(`./${item.name}`, function(err, CWD){
      if(err) return rej(err);
      client.__CWD = CWD;
      res();
    });
  }).then(function(){
    return walkDirectory(client, localfolder.resolve(`./${item.name}`));
  }).then(function(){
    return new Promise(function(res, rej){
      client.cwd(`..`, function(err, CWD){
        if(err) return rej(err);
        client.__CWD = CWD;
        res();
      });
    });
  });
};

walkDirectory = function(client, localfolder){
  return localfolder.createIfNotExists(true).then(function(){
    return new Promise(function(res, rej){
      client.list(function(err, list){
        if(err) return rej(err);
        res(list);
      });
    });
  }).then(function(list){
    return list.reduce(function(p, item){
      return p.then(function(){
        return checkUnknown(client, item, localfolder);
      });
    }, Promise.resolve());
  });
};

downloadFile = function(client, item, localfolder){
  return new Promise(function(res, rej){
    client.get(path.join(client.__CWD, item.name), function(err, stream){
      if(err) return rej(err);
      stream.pipe(fs.createWriteStream(path.join(localfolder.filename, item.name)))
      .on('error', function(e){
        rej(e);
      })
      .on('finish', function(){
        res();
      });
    });
  });
};
