var assert = require('assert'),
    changemate = require('../');
    
describe('changemate can determine the type based on a target string', function() {
    it('can extract the type from the target string', function() {
        var notifier = changemate.watch('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood');
        
        assert(notifier);
        assert.equal(notifier.type, 'couch');
    });
});