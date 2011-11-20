var changeling = require('../');

changeling.monitor('http://10.211.55.4:5984/test', { type: 'couchdb'}, function(err, notifier) {
    console.log(err);
    console.log(notifier);
});