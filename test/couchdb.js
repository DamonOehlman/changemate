var assert = require('assert'),
    changemate = require('../'),
    debug = require('debug')('tests'),
    nano = require('nano'),
    hostname = 'http://localhost:5984',
    dbname = 'changemate',
    targetUrl = '<:couch:> ' + hostname + '/' + dbname,
    couch = nano(hostname),
    db = couch.use(dbname),
    testDoc = {
      _id: 'bob',
      name: 'Bob',
      age: 75
    },
    _notifier,
    _updateSeq,
    _changes = [];

function _updateTestDoc(callback) {
  db.get(testDoc._id, function(err, data) {
    if (! err) {
      testDoc._rev = data._rev;
    }

    // update the document
    debug('pushing update to ' + testDoc._id);
    db.insert(testDoc, callback || function() {});
  });
} // _updateTestDoc

describe('changemate can detect changes in a couch db', function() {

  before(function(done) {
    couch.db.create(dbname, done);
  });

  after(function() {
    _notifier && _notifier.close();
  });

  after(function(done) {
    couch.db.destroy(dbname, done);
  });

  it('can connect to the test database', function(done) {
    debug('getting info for database: ' + targetUrl);
    db.info(function(err, res) {
      if (! err) {
        _updateSeq = res.update_seq;
        debug('received info, setting update seq to: ' + _updateSeq);
      }

      done(err);
    });
  });

  it('can configure the change monitor', function() {
    _notifier = changemate(targetUrl, { since: _updateSeq });
    assert(_notifier);

    _notifier.on('change', function(item) {
      debug('captured update for item: ' + item.id);
      _changes.push(item);
    });
  });

  it('can write documents to the test database', function(done) {
    debug('getting ' + testDoc._id + ' from the database');

    _updateTestDoc(done);
  });

  it('intercepted the change', function(done) {
    setTimeout(function() {
      assert.equal(_changes.length, 1);
      done();
    }, 1000);
  });

  it('provides state with the change notification', function(done) {
    _notifier.once('change', function(item, state) {
      assert(state);
      assert(state.since);
      done();
    });

    _updateTestDoc();
  });
});
