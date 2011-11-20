var assert = require('assert'),
    path = require('path'),
    changeling = require('../../');

module.exports = {
    'Close Server': {
        topic: function() {
            var callback = this.callback;
            
            changeling.close(function() {
                callback(null, true);
            });
        },
        
        'closed ok': function(err, success) {
            assert.ok(success);
        }
    }
};