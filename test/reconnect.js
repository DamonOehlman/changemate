var assert = require('assert'),
    changemate = require('../'),
    debug = require('debug')('tests'),
    opts = {
      type: 'couchdb',
      throttleDelay: 400,
      since: 0
    },
    _targetUrl = 'https://fluxant.cloudant.com/seattle_neighbourhood',
    _notifier, _lastSeq = 0;

describe('connection reset tests', function() {
  after(function() {
    _notifier && _notifier.close();
  });

  it('can initialize the notifier', function() {
    debug('watching target database: ' + _targetUrl);
    _notifier = changemate(_targetUrl, opts);

    assert(_notifier);
    assert(_notifier.feed);
  });

  it('can receive change events', function(done) {
    // listen once to know we are done
    _notifier.once('change', function(data) {
      _lastSeq = data.seq;
      done();
    });
  });

  it('can interrupt the connection, and automatically reconnect', function(done) {
    debug('looking for close events');
    _notifier.once('close', function() {
      debug('close event detected, looking for reconnect');
      _notifier.once('connect', function() {
        done();
      });
    });

    // close the connection but allow reconnects
    debug('telling the monitor to close the connection');
    _notifier.close(true);
  });

  it('can receive change events again', function(done) {
    debug('listening for new changes');
    _notifier.once('change', function(data, state) {
      debug('checking the next change we received is one greater than the last sequence');
      assert(data.seq > _lastSeq);

      debug('firing done');
      done();
    });
  });
});
