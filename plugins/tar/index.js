'use strict';

var path = require('path');
var tar = require('tar-fs');
var File = require('../../shared/objects/File');
var Readable = require('stream').Readable;

module.exports = {};

module.exports.canHandleFile = function(file){
  return Promise.resolve(path.extname(file.filename) === '.tar');
};

module.exports.consumableToPackage = function(tarball){
  return new Promise(function(res, rej){
    var tarballStream;
    if(tarball instanceof Readable){
      tarballStream = tarball;
    }else if(tarball instanceof File){
      tarballStream = tarball.streamContents();
    }else if(typeof tarball === 'string'){
      tarballStream = new File(tarball).getReadStream();
    }

    var fn = tarball.filename;
    var outdir = tarball.resolve(`../${path.basename(fn, path.extname(fn))}`);
    console.log(outdir.filename);
    tarballStream.pipe(tar.extract(outdir.filename))
    .on('finish', function(){
      res(outdir);
    }).on('error', rej);
  });
};
