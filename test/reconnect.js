var assert = require('assert'),
    changemate = require('../'),
    debug = require('debug')('tests'),
    opts = {
        type: 'couchdb',
        throttleDelay: 400
    },
    _targetUrl = 'http://sidelab.iriscouch.com/seattle_neighbourhood',
    _notifier, _lastSeq = 0;
    
describe('connection reset tests', function() {
    it('can initialize the notifier', function() {
        debug('watching target database: ' + _targetUrl);
        _notifier = changemate.watch(_targetUrl, opts);
        
        assert(_notifier);
    });
    
    it('can receive change events', function(done) {
        // listen once to know we are done
        _notifier.once('change', done);

        // listen a lot for the updated sequence numbers
        _notifier.on('change', function(data) {
            _lastSeq = data.seq;
        });
    });
    
    it('can interrupt the connection, and automatically reconnect', function(done) {
        debug('looking for close events');
        _notifier.once('close', function() {
            debug('close event detected, looking for reconnect');
            _notifier.once('connect', done);
        });
        
        // close the connection but allow reconnects
        debug('telling the monitor to close the connection');
        _notifier.close(true);
    });
    
    it('can receive change events again', function(done) {
        debug('listening for new changes');
        _notifier.removeAllListeners('change');
        _notifier.once('change', function(data, state) {
            debug('checking the next change we received is one greater than the last sequence');
            
            // if we have a numeric value, look for the very nexy number in sequence
            if (typeof data.seq == 'number') {
                assert.equal(data.seq, _lastSeq + 1);
            }
            // otherwise, just look for a value that is considered greater
            else {
                assert(data.seq > _lastSeq);
            }
            
            done();
        });
    });
});