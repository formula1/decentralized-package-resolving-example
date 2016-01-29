'use strict';

module.exports = function(client, input){
  return new Promise(function(res){
    client.seed(input, function(torrent){
      res(torrent);
    });
  });
};
