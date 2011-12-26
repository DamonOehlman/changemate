var changemate = require('../'),
    counter = 0, notifier, _checkpoint;
    
function _createNotifier() {
    // reset the counter
    counter = 0;
    
    console.log(_checkpoint);
    
    // create the notifier
    notifier = changemate.watch(
        '<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood', // target
        {}, // options
        _checkpoint // state
    );
    
    notifier.on('change', function(data, checkpoint) {
        // save the state
        _checkpoint = checkpoint;
        
        console.log('got change id: ' + data.id + ', seq: ' + data.seq + ', counter: ' + (++counter));
        if (counter >= 100) {
            notifier.close();
            _createNotifier();
        }
    });
}

// create the notifier
_createNotifier();