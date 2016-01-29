'use strict';

var qs = require('qs');

module.exports = function(packages, distributor, req, res){

  var distributor_info = qs.parse(req.url);

  return distributor.addDistributor(req.remoteAddress, distributor_info)
  .then(function(distributors){
    return packages.get().then(function(list){
      return list.map(function(item){
        return item.distribution;
      });
    }).then(function(handles){
      res.statusCode = 200;
      res.end(JSON.stringify({
        handles: handles,
        distributors: distributors,
      }));
    }).catch(function(e){
      console.error('could not get packages for distributor', e, distributor_info);
      res.statusCode = 200;
      res.end('{}');
    });
  }).catch(function(e){
    console.error('could not add distributor', e);
    res.statusCode = e.statusCode;
    res.end();
  });

};
