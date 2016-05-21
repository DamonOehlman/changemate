var changemate = require('../');
var counter = 0;
var notifier = changemate('<:couch:> https://fluxant.cloudant.com/seattle_neighbourhood');

notifier
  .on('connect', function() {
    console.log('connected');
  })
  .on('change', function(data) {
    console.log('got change id: ' + data.id + ', seq: ' + data.seq + ', counter: ' + (++counter));
  })
  .on('close', function() {
    console.log('disconnected from server');
  });
