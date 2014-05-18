var assert = require('assert');
var changemate = require('../');
var debug = require('debug')('tests');
var config = require('config');
var request = require('request');
var targetUrl = 'http://sidelab.iriscouch.com/seattle_neighbourhood';
var _notifier;
var _updateSeq;

describe('changemate can detect changes in a couch db', function() {
  var expectedResults = 0;

  it('can get the full changelog from the db', function(done) {
    request.get({ url: targetUrl + '/_changes?since=0', json: true }, function(err, res, body) {
      assert.ifError(err);

      debug('body contains keys: ', Object.keys(body));
      expectedResults = body.results.length;
      debug('expecting ' + expectedResults + ' change notifications');
      done();
    });
  });

  it('can configure the change monitor', function(done) {
    var counter = 0;
    _notifier = changemate('<:couch:> ' + targetUrl, { since: 0 });
    assert(_notifier);

    _notifier.on('change', function(item) {
      debug('captured update for item: ' + item.id);

      counter += 1;
      if (counter === expectedResults) {
        done();
      }
    });
  });
});
