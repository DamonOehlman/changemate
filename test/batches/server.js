var assert = require('assert'),
    path = require('path'),
    changeling = require('../../');

module.exports = {
    'Server Start': {
        topic: function() {
            changeling.start(this.callback);
        },
        
        'notifier available': function(err, notifier) {
            console.log(err);
            assert.ok(notifier);
        }
    }
};