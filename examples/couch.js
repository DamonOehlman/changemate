var changemate = require('../');

changemate('http://10.211.55.4:5984/steelmesh', { type: 'couchdb', getDoc: true }, function(err, notifier) {
    if (! err) {
        notifier.on('change', function(data) {
            console.log('got change id: ' + data.id);
        });
        
        notifier.on('close', function() {
            console.log('notifier closed');
        });
    }
});