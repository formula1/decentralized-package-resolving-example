'use strict';

var tar = require('tar-fs');
var File = require('../../objects/File');
var Readable = require('stream').Readable;

module.exports = function(tarball, directory){
  return new Promise(function(res, rej){
    var tarballStream;
    if(tarball instanceof Readable){
      tarballStream = tarball;
    }else if(tarball instanceof File){
      tarballStream = tarball.getReadStream();
    }else if(typeof tarball === 'string'){
      tarballStream = new File(tarball).getReadStream();
    }

    tarballStream.pipe(tar.extract(directory))
    .on('finish', function(){
      res(new File(directory));
    }).on('error', rej);
  });
};
