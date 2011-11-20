var changeling = require('../');

changeling.monitor('http://10.211.55.4:5984/lbs', { type: 'couchdb', getDoc: true }, function(err, notifier) {
    if (! err) {
        notifier.on('change', function(data) {
            console.log(data.id);
        });
    }
});