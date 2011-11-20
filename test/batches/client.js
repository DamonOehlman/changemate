var assert = require('assert'),
    path = require('path'),
    changeling = require('../../');

module.exports = {
    'Client Tests': {
        topic: function() {
            changeling.monitor(path.resolve(__dirname, 'test.txt'), this.callback);
        },
        
        'monitor available': function(err, notifier) {
            assert.ok(notifier);
        }
    }
};