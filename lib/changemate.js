var net = require('net'),
    util = require('util'),
    events = require('events'),
    _monitor;
    
var ChangeMonitor = module.exports = function(client) {
    this.client = client;
    this.notifiers = {};
    this.state = require('./changestate');
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
    var lib;
    
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
        lib.monitor(
            this, 
            target, 
            opts, 
            this.state.initTarget(target),
            callback
        );
    }
    else {
        callback('Changling monitor of type \'' + type + '\' is invalid, no monitor function');
    }
};

function _guessType(target) {
    return 'filesystem';
} // _guessType

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