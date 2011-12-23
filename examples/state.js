var changemate = require('../'),
    counter = 0, notifier, _state;
    
function _createNotifier() {
    // reset the counter
    counter = 0;
    
    console.log(_state);
    
    // create the notifier
    notifier = changemate.watch(
        '<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood', // target
        {}, // options
        _state // state
    );
    
    notifier.on('change', function(data, state) {
        // save the state
        _state = state;
        
        console.log('got change id: ' + data.id + ', seq: ' + data.seq + ', counter: ' + (++counter));
        if (counter >= 100) {
            notifier.close();
            _createNotifier();
        }
    });
}

// create the notifier
_createNotifier();