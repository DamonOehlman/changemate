var net = require('net'),
    util = require('util'),
    events = require('events'),
    errcode = require('./errcode'),
    _monitor;
    
/* internals */

function _guessType(target) {
    return 'filesystem';
} // _guessType

function _setupReconnector(notifier, opts) {
    
    var failCount = 0;
    
    function reconnect() {
        notifier.reconnect(opts, function(err) {
            // if we have an error, and it is not the NOT_PERMITTED ERROR
            if (err && err !== err.NOT_PERMITTED) {
                // TODO: check the failure count
                
                // schedule another reconnection attempt
                setTimeout(reconnect, opts.reconnectDelay);

                // increment the fail count
                failCount++;
            }
            // otherwise, if we had a successful reconnection, reset the fail count
            else if (! err) {
                // emit the connect event
                notifier.emit('connect');

                // reset the fail count
                failCount = 0;
            }
        });
    };
    
    // check if we have a reconnect delay specified
    if (opts.reconnectDelay) {
        // when the notifier closes, 
        notifier.on('close', function() {
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

ChangeMonitor.prototype.attachMonitor = function(target, opts, callback) {
    var notifierType;
    
    // check to see if the monitor is an active target
    if (this.notifiers[target]) {
        callback(null, this.notifiers[target]);
    }
    else {
        // ensure we have valid options
        opts = opts || {};
        
        // initialise the reconnect delay
        opts.reconnectDelay = typeof opts.reconnectDelay != 'undefined' ? opts.reconnectDelay : 5000;
        
        // if we have a type, then wire it up
        if (opts.type) {
            this.createNotifier(opts.type, target, opts, callback);
        }
        else {
            callback('Unable to determine monitor type for target (' + target + ') or type not specified');
        }
    }
};

ChangeMonitor.prototype.createNotifier = function(type, target, opts, callback) {
    var lib, notifier;
    
    try {
        lib = require('changeling-' + type);
    }
    catch (e) {
        try {
            lib = require('./notifiers/' + type);
        }
        catch (e) {
        }
    }
    
    if (! lib) {
        callback('Unable to create changeling monitor of type \'' + type + '\'');
    }
    
    if (lib && lib.monitor) {
        // normalize the target
        target = lib.normalizeTarget ? lib.normalizeTarget(target) : target;
        
        // monitor the target
        lib.monitor(this, target, opts, function(err, notifier) {
            // if we should auto reconnect, then handle that here
            if (notifier.reconnect) {
                _setupReconnector(notifier, opts);
            }

            // emit the connect event
            notifier.emit('connect');

            // trigger the callback
            callback(null, notifier);
        });
    }
    else {
        callback('Changling monitor of type \'' + type + '\' is invalid, no monitor function');
    }
};

module.exports = function(target, opts, callback) {
    if (! callback && typeof opts == 'function') {
        callback = opts;
        opts = {};
    }

    opts = opts || {};
    opts.type = opts.type || _guessType(target);
    
    // attach a new monitor
    _monitor.attachMonitor(target, opts, callback);
};

// create the monitor
_monitor = new ChangeMonitor();