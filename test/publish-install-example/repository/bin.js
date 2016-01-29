'use strict';

var path = require('path');

var pushover = require('pushover');
var repos = pushover(path.join(__dirname, './repos'));

repos.on('push', function(push){
  console.log(`push ${push.repo}/${push.commit} (${push.branch})`);
  push.accept();
});

repos.on('fetch', function(fetch){
  console.log(`fetch ${fetch.commit}`);
  fetch.accept();
});

var http = require('http');
var server = http.createServer(function(req, res){
  repos.handle(req, res);
});

server.listen(7000);
