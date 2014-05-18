var debug = require('debug')('changemate'),
    util = require('util'),
    events = require('events'),
    errorCodes = {
      NOT_PERMITTED: 'NOT PERMITTED'
    },
    reType = /^\<\:(\w+)\:\>\s*?(.*)/,
    _monitor,
    aliases = {
      'couchdb': 'couch'
    };


/**
  # changemate

  Changemate is a change notification service and framework. At present it only
  supports responding to the `_changes` feed of a couch database, but will be
  expanded in time to support other change notification formats.

  ## Supported Notifiers

  ### CouchDB

  The couchdb notifier is the first cab off the rank, as it is required for
  [steelmesh](https://github.com/steelmesh/steelmesh).  The couchdb notifier hooks
  into the [continuous changes feed](http://wiki.apache.org/couchdb/HTTP_Document_API#A_changes)
  for a couchdb instance.

  <<< examples/couch.js

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

  <<< examples/checkpoint.js

  In the example above, we are collecting the checkpoint data that is passed
  through in the change event.  Additionally, we are closing the notifier for
  every 100 updates, and creating a new notifier with the checkpoint data that
  has been captured in previous events.

  To make the sample above persist across sessions, the checkpoint information
  could be save to a local JSON file or similar and reloaded the next time the
  script ran to start from next required update.

  ## Alternative Solutions

  Changemate is designed to be a change notification library that supports
  providing notifications from various sources.  There are some excellent
  (and more mature) libraries that provide similar services for usually
  just one of the change sources:

  ### CouchDB

  - [IrisCouch Follow](https://github.com/iriscouch/follow)

**/
/* internals */

/**
 * The _guessType function is used to parse the target string and determine what type the target
 * string references.  The target can use a special convention including <:type:> at
 * the start of the string which specify the type.  In the case that both the target string and
 * the options contain a target definition, the type specified in the options takes precedence
 */
function guessType(target, opts) {
  var match = reType.exec(target);
  if (match) {
    opts.type = opts.type || match[1];
    target = match[2];
  }

  // if the type is definied, and matches an alias remap to the actual type
  opts.type = aliases[opts.type] ||  opts.type;

  // return the potentially modified target string
  return target;
} // _guessType

function setupReconnector(notifier, opts) {

  var failCount = 0;

  function reconnect() {
    notifier.reconnect(opts);
  }

  // check if we have a reconnect delay specified
  if (opts.reconnectDelay) {
    notifier.on('error', function(err) {
      if (err !== errorCodes.NOT_PERMITTED) {
        debug('error detected, attempting reconnection in ' + opts.reconnectDelay + 'ms');
        setTimeout(reconnect, opts.reconnectDelay);
      }
    });

    // when the notifier closes, attempt a reconnection
    notifier.on('close', function() {
      debug('notifier close detected, attempting reconnection in ' + opts.reconnectDelay + 'ms');
      setTimeout(reconnect, opts.reconnectDelay);
    });
  }
} // setupReconnector

function createNotifier(type, target, opts, checkpoint) {
  var lib, notifier;

  if (! type) {
    throw new Error('Unable to create notifier of undefined type');
  }

  try {
    lib = require('changemate-' + type);
  }
  catch (e) {
    try {
      lib = require('./notifiers/' + type);
    }
    catch (e) {
      debug('could not require ./notifiers/' + type);
    }
  }

  if (! lib) {
    throw new Error('Unable to create changemate notifier of type \'' + type + '\'');
  }

  if (lib && lib.Notifier) {
    // normalize the target
    target = (lib.normalizeTarget ? lib.normalizeTarget(target) : target).trim();

    // create the notifier
    notifier = new lib.Notifier(target, opts);
    notifier.type = type;

    // make the request to couch
    notifier.connect(target, opts);

    // if we should auto reconnect, then handle that here
    if (notifier.reconnect) {
      setupReconnector(notifier, opts);
    }
  }

  return notifier;
};

function changemate(target, opts) {
  // ensure we have valid opts
  opts = opts || {};

  // guess the notifier type
  target = guessType(target, opts);

  // initialise the reconnect delay
  opts.reconnectDelay = typeof opts.reconnectDelay != 'undefined' ? opts.reconnectDelay : 5000;

  // create the notifier
  return createNotifier(opts.type, target, opts);

}

// attach the aliases
changemate.aliases = aliases;

// attach the error codes
changemate.errorCodes = errorCodes;

// export
module.exports = changemate;
