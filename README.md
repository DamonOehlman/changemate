# Steelmesh Changemate

Changemate is a change notification service and framework. At present it only supports responding to the `_changes` feed of a couch database, but will be expanded in time to support other change notification formats.

## Example Usage

```js
var changemate = require('changemate'),
    counter = 0,
    notifier = changemate.watch('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood');
    
notifier.on('change', function(data) {
    console.log('got change id: ' + data.id + ', seq: ' + data.seq + ', counter: ' + (++counter));
});

notifier.on('close', function() {
    console.log('notifier closed');
});
```

## Regarding State Management

You can see by running the example above, that the changes for the feed are read from `since=0` each time.  While this is good for the purpose of the example, it's unlikely to be the desired behaviour in your application.

Changemate does not offer a state persistence mechanism, but does provide state information so that you can store that information yourself and use it:


```js
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
```

In the example above, we are collecting the state data that is passed through in the change event.  Additionally, we are closing the notifier for every 100 updates, and creating a new notifier with the state data that has been captured in previous events.

To make the sample above persist across sessions, the state information could be save to a local JSON file or similar and reloaded the next time the script ran to start from next required update.

## Alternative Solutions

For an established alternative CouchDB change notification library, you should definitely have a look at the [follow](https://github.com/iriscouch/follow) package from the fine folks at [IrisCouch](http://www.iriscouch.com/).