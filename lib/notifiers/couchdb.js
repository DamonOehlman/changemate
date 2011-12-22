var debug = require('debug')('changemate'),
    events = require('events'),
    http = require('http'),
    url = require('url'),
    util = require('util'),
    errcode = require('../errcode'),
    reTrailingSlash = /\/$/;

function CouchNotifier(target, opts) {
    this.target = target;
    this.paused = false;
    
    this.request = null;
    this.response = null;
    this.reconnectOK = true;
    this.since = 0;

    // add the options to this
    for (var key in opts) {
        if (opts.hasOwnProperty(key)) {
            this[key] = opts[key];
        }
    }
};

util.inherits(CouchNotifier, events.EventEmitter);

CouchNotifier.prototype.close = function(allowReconnect) {
    // update the reconnectOK flag, by default reconnections will not 
    // be permitted
    this.reconnectOK = allowReconnect;
    
    // if we have a request, then abort the request
    if (this.request) {
        // abort the request
        this.request.abort();
        
        // delete the request from the notifier
        delete this.request;
    }
}; // close

CouchNotifier.prototype.connect = function(target, opts, callback) {
    var notifier = this, req, 
        changesUrl = target + '/_changes';
    
    function notifierClose() {
        // reset the response object
        this.response = null;

        // emit the close event, flagging whether the close was expected 
        // (i.e. was initiated by a call to the close method)
        notifier.emit('close');
    }
    
    // update the changes url
    this.target = target;
    
    // get the config since
    changesUrl += '?' + (opts.include_docs ? 'include_docs=true&' : '') + 
        'heartbeat=' + (opts.heartbeat || 30000) + '&' +
        'feed=continuous&since=' + (this.since || opts.since || 0);
    
    // initialise the request
    debug('connecting to: ' + changesUrl);
    req = this.request = http.request(url.parse(changesUrl), function(resp) {
        // update the response for the notifier
        debug('received response from: ' + changesUrl);
        this.response = resp;
        
        // handle response events
        resp.on('data', notifier.createChunkProcessor(resp, opts));
        resp.on('close', notifierClose);
        // resp.on('end', notifierClose);

        callback(null);
    });

    req.on('error', function(err) {
        debug('error when connecting to: ' + changesUrl, err);
        callback(err, notifier);
    });

    req.end();
};

CouchNotifier.prototype.createChunkProcessor = function(res, opts) {
    var notifier = this,
        paused = false,
        buffer = '',
        throttleTimer = 0;
        
    return function(chunk) {
        // convert the chunk to a utf encoded string
        chunk = chunk.toString('utf8').replace(/\n/mg, '');
        
        // add the current chunk to the buffer
        buffer += chunk;
        
        if (buffer) {
            clearTimeout(throttleTimer);
            throttleTimer = setTimeout(function() {
                if (! notifier.paused) {
                    debug('resuming paused stream');
                    res.resume();
                }
            }, opts.throttleDelay || 0);

            // pause the response stream
            res.pause();
            
            try {
                var changeData = JSON.parse(buffer);

                // if we have a valid response (not an error)
                if (! changeData.error) {
                    // update our since value
                    notifier.since = changeData.seq;
                    
                    // reset the buffer
                    buffer = '';
                    debug('capture change ' + changeData.seq + ' for item: ' + changeData.id);
                    notifier.emit('change', changeData);
                }
            }
            catch (e) {
            }
        }
    };
};

CouchNotifier.prototype.pause = function() {
    this.paused = true;
}; // pause

/**
 * Couch Notifier supports reconnection
 */
CouchNotifier.prototype.reconnect = function(opts, callback) {
    if (this.reconnectOK) {
        this.connect(this.target, opts, callback);
    }
    else {
        callback(errcode.NOT_PERMITTED);
    }
}; // reconnect

CouchNotifier.prototype.resume = function() {
    this.paused = false;
    if (this.response) {
        this.response.resume();
    }
}; // resume


/* exports */

exports.normalizeTarget = function(target) {
    return target.replace(reTrailingSlash, '');
};

exports.monitor = function(monitor, target, opts, callback) {
    var notifier = new CouchNotifier(target, opts);
        
    // make the request to couch
    notifier.connect(target, opts, function(err) {
        callback(err, notifier);
    });
};