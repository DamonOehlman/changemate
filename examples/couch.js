var changemate = require('../'),
    counter = 0,
    opts = {
        type: 'couchdb'
    };

changemate('http://sidelab.iriscouch.com/seattle_neighbourhood', opts, function(err, notifier) {
    if (! err) {
        notifier.on('change', function(data) {
            console.log('got change id: ' + data.id + ', seq: ' + data.seq + ', counter: ' + (++counter));
        });

        notifier.on('close', function() {
            console.log('notifier closed');
        });
    }
});