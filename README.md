# Steelmesh Changemate

<a href="http://travis-ci.org/#!/steelmesh/changemate"><img src="https://secure.travis-ci.org/steelmesh/changemate.png" alt="Build Status"></a>

Changemate is a change notification service and framework. At present it only supports responding to the `_changes` feed of a couch database, but will be expanded in time to support other change notification formats.

## Supported Notifiers

### CouchDB

The couchdb notifier is the first cab off the rank, as it is required for [steelmesh](https://github.com/steelmesh/steelmesh).  The couchdb notifier hooks into the [continuous changes feed](http://wiki.apache.org/couchdb/HTTP_Document_API#A_changes) for a couchdb instance.

__Example Creation:__

```js
var notifier = changemate.watch('<:couch:> http://localhost:5984/testdb');
```

_OR_

```js
var notifier = changemate.watch('http://localhost:5984/testdb', { type: 'couch' });
```

__Supported Options:__

- `since` - the change_sequence to get changes since
- `include_docs` - whether or not document fragments should be included with the change data
- `heartbeat` - the heartbeat interval for the changes feed

### Coming Soon

- Filesystem

## Examples

### Simple Example

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

### State Management

You can see by running the example above, that the changes for the feed are read from `since=0` each time.  While this is good for the purpose of the example, it's unlikely to be the desired behaviour in your application.

Changemate does not offer a checkpoint persistence mechanism, but does provide checkpoint information so that you can store that information yourself and use it:


```js
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
        _checkpoint // checkpoint
    );
    
    notifier.on('change', function(data, checkpoint) {
        // save the checkpoint
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
```

In the example above, we are collecting the checkpoint data that is passed through in the change event.  Additionally, we are closing the notifier for every 100 updates, and creating a new notifier with the checkpoint data that has been captured in previous events.

To make the sample above persist across sessions, the checkpoint information could be save to a local JSON file or similar and reloaded the next time the script ran to start from next required update.

## Alternative Solutions

Changemate is designed to be a change notification library that supports providing notifications from various sources.  There are some excellent (and more mature) libraries that provide similar services for usually just one of the change sources:

### CouchDB

- [IrisCouch Follow](https://github.com/iriscouch/follow)