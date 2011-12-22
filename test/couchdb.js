var assert = require('assert'),
    changemate = require('../'),
    debug = require('debug')('tests'),
    config = require('config'),
    nano = require('nano'),
    // remove any trailing delimiters
    couchUrl = config.couchurl.replace(/\/$/, ''),
    targetUrl = couchUrl + '/' + config.db,
    db = nano(couchUrl).use(config.db),
    reTrailingDelimiter = /\/$/,
    testDoc = {
        _id: 'bob',
        name: 'Bob',
        age: 75
    },
    _notifier,
    _updateSeq,
    _changes = [];
    
describe('changemate can detect changes in a couch db', function() {
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
        _notifier = changemate.watch(targetUrl, { since: _updateSeq });
        assert(_notifier);

        _notifier.on('change', function(item) {
            debug('captured update for item: ' + item.id);
            _changes.push(item);
        });
    });

    it('can write documents to the test database', function(done) {
        debug('getting ' + testDoc._id + ' from the database');
        db.get(testDoc._id, function(err, data) {
            if (! err) {
                testDoc._rev = data._rev;
            }
            
            // update the document
            debug('pushing update to ' + testDoc._id);
            db.insert(testDoc, done);
        });
    });
    
    it('intercepted the change', function(done) {
        setTimeout(function() {
            assert.equal(_changes.length, 1);
            done();
        }, 1000);
    });
});