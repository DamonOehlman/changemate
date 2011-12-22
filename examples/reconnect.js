var changemate = require('../'),
    counter = 0,
    opts = {
        type: 'couchdb',
        throttleDelay: 400
    },
    notifier = changemate.watch('http://10.211.55.4:5984/lbs', opts);
    
notifier.on('change', function() {
    // console.log('change');
});

notifier.on('connect', function() {
    console.log('connected, now try turning off your couch instance');
    
    // interrupt the connection (close the connection, but allow reconnects)
    setTimeout(function() {
        console.log('interrupting stream !!!');
        notifier.close(true);
    }, 500);
});

notifier.on('close', function() {
    console.log('notifier closed');
});