var changemate = require('../'),
    counter = 0,
    notifier = changemate.watch('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood');
    
notifier.on('change', function(data) {
    console.log('got change id: ' + data.id + ', seq: ' + data.seq + ', counter: ' + (++counter));
});

notifier.on('close', function() {
    console.log('notifier closed');
});