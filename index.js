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
            lib = require('./' + type);
        }
        catch (e) {
            console.log('could not require ./' + type);
        }
    }

    if (! lib) {
        throw new Error('Unable to create changemate notifier of type \'' + type + '\'');
    }

    if (lib && lib.Notifier) {
        // normalize the target
        target = lib.normalizeTarget ? lib.normalizeTarget(target) : target;

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