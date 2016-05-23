# changemate

Changemate is a change notification service and framework. At present it only
supports responding to the `_changes` feed of a couch database, but will be
expanded in time to support other change notification formats.


[![NPM](https://nodei.co/npm/changemate.png)](https://nodei.co/npm/changemate/)

[![unstable](https://img.shields.io/badge/stability-unstable-yellowgreen.svg)](https://github.com/dominictarr/stability#unstable) [![Build Status](https://api.travis-ci.org/DamonOehlman/changemate.svg?branch=master)](https://travis-ci.org/DamonOehlman/changemate) [![bitHound Score](https://www.bithound.io/github/DamonOehlman/changemate/badges/score.svg)](https://www.bithound.io/github/DamonOehlman/changemate) 

## Supported Notifiers

### CouchDB

The couchdb notifier is the first cab off the rank, as it is required for
[steelmesh](https://github.com/steelmesh/steelmesh).  The couchdb notifier hooks
into the [continuous changes feed](http://wiki.apache.org/couchdb/HTTP_Document_API#A_changes)
for a couchdb instance.

```js
var changemate = require('changemate');
var counter = 0;
var notifier = changemate('<:couch:> https://fluxant.cloudant.com/seattle_neighbourhood');

notifier
  .on('connect', function() {
    console.log('connected');
  })
  .on('change', function(data) {
    console.log('got change id: ' + data.id + ', seq: ' + data.seq + ', counter: ' + (++counter));
  })
  .on('close', function() {
    console.log('disconnected from server');
  });

```

__Supported Options:__

- `since` - the change_sequence to get changes since
- `include_docs` - whether or not document fragments should be included
   with the change data

## State Management

You can see by running the example above, that the changes for the feed are
read from `since=0` each time.  While this is good for the purpose of the
example, it's unlikely to be the desired behaviour in your application.

Changemate does not offer a checkpoint persistence mechanism, but does provide
checkpoint information so that you can store that information yourself and
use it:

```js
var changemate = require('changemate');
var counter = 0;
var notifier;
var _checkpoint;

function _createNotifier() {
  // reset the counter
  counter = 0;

  console.log(_checkpoint);

  // create the notifier
  notifier = changemate(
    '<:couch:> https://fluxant.cloudant.com/seattle_neighbourhood', // target
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

In the example above, we are collecting the checkpoint data that is passed
through in the change event.  Additionally, we are closing the notifier for
every 100 updates, and creating a new notifier with the checkpoint data that
has been captured in previous events.

To make the sample above persist across sessions, the checkpoint information
could be save to a local JSON file or similar and reloaded the next time the
script ran to start from next required update.

## License(s)

### MIT

Copyright (c) 2016 Damon Oehlman <damon.oehlman@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
