var debug = require('debug')('changemate'),
    util = require('util'),
    events = require('events'),
    errcode = require('./errcode'),
    _monitor;
    
/* internals */

function _setupReconnector(notifier, opts) {
    
    var failCount = 0;
    
    function reconnect() {
        notifier.reconnect(opts);
    }
    
    // check if we have a reconnect delay specified
    if (opts.reconnectDelay) {
        notifier.on('error', function(err) {
            if (err !== errcode.NOT_PERMITTED) {
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
} // _setupReconnector

/* ChangeMonitor definition */
    
var ChangeMonitor = module.exports = function(client) {
    this.client = client;
    this.notifiers = {};
};

util.inherits(ChangeMonitor, events.EventEmitter);

ChangeMonitor.prototype.createNotifier = function(type, target, opts) {
    var lib, notifier;
    
    try {
        lib = require('changemate-' + type);
    }
    catch (e) {
        try {
            lib = require('./notifiers/' + type);
        }
        catch (e) {
        }
    }
    
    if (! lib) {
        throw new Error('Unable to create changeling monitor of type \'' + type + '\'');
    }
    
    if (lib && lib.Notifier) {
        // normalize the target
        target = lib.normalizeTarget ? lib.normalizeTarget(target) : target;
        
        // create the notifier
        notifier = new lib.Notifier(target, opts);

        // make the request to couch
        notifier.connect(target, opts);
        
        // if we should auto reconnect, then handle that here
        if (notifier.reconnect) {
            _setupReconnector(notifier, opts);
        }
    }
    
    return notifier;
};

ChangeMonitor.prototype.watch = function(target, opts) {
    var notifierType,
        notifier = this.notifiers[target];
        
    // ensure we have valid opts
    opts = opts || {};
    opts.type = opts.type || 'couchdb';
    
    // initialise the reconnect delay
    opts.reconnectDelay = typeof opts.reconnectDelay != 'undefined' ? opts.reconnectDelay : 5000;
    
    // if the notifier has not been created, yet, do that now
    if (! notifier) {
        notifier = this.notifiers[target] = this.createNotifier(opts.type, target, opts);
    }
    
    return notifier;
};

// create the monitor
_monitor = module.exports = new ChangeMonitor();