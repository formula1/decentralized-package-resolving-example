'use strict';

var path = require('path');

var fs = require('fs');
var path = require('path');

var File = require('../shared/objects/File');
var IndexedDB = require('../shared/objects/IndexedDB');
var HttpRouter = require('./http');
var TorrentClient = require('./torrent');

module.exports = function(dirname, http_port, torrent_port){
  var dbs = this.dbs = {
    registries: path.join(dirname, 'registries.json'),
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

  var folders = this.folders = {
    downloads: path.join(dirname, 'downloads'),
  };

  Object.keys(folders).forEach(function(name){
    var folderpath = folders[name];
    if(!fs.existsSync(folderpath)){
      fs.mkdirSync(folderpath);
    }

    dbs[name] = new File(folderpath);
  });

  return Promise.all([
    HttpRouter(dbs.registries, http_port),
    TorrentClient(folders.downloads, torrent_port),
  ]).then(function(ret){
    var router = ret[0], client = ret[1];

    router.get('/publish', function(req, res){
      client.add(req.query.handle, { path: client.downloadDir }, function(torrent){
        torrent.on('done', function(){
          res.statusCode = 200;
          res.end();
        });
      });
    });

    return {
      dbs: dbs,
      router: router,
      client: client,
      folders: folders,
    };
  });
};
