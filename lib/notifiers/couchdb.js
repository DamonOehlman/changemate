var debug = require('debug')('changemate'),
    events = require('events'),
    http = require('http'),
    url = require('url'),
    util = require('util'),
    reTrailingSlash = /\/$/;

function CouchNotifier(target, opts) {
    this.target = target;
    this.paused = false;

    // add the options to this
    for (var key in opts) {
        if (opts.hasOwnProperty(key)) {
            this[key] = opts[key];
        }
    }
};

util.inherits(CouchNotifier, events.EventEmitter);

CouchNotifier.prototype.close = function() {
    if (this.request) {
        // abort the request
        this.request.abort();
        
        // delete the request from the notifier
        delete this.request;
    }
}; // close

CouchNotifier.prototype.createChunkProcessor = function(res, opts, config) {
    var notifier = this,
        paused = false,
        buffer = '',
        throttleTimer = 0;
        
    function emitChange(data) {
        // if we have a sequence id, then update the config
        if (data.seq && opts.autoPersist) {
            notifier.persist(data.seq);
        }
        
        notifier.emit('change', data);
    }
    
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
            }, notifier.throttleDelay || 1000);

            // pause the response stream
            res.pause();
            
            try {
                var changeData = JSON.parse(buffer);

                // if we have a valid response (not an error)
                if (! changeData.error) {
                    // reset the buffer
                    buffer = '';
                    emitChange(changeData);
                }
            }
            catch (e) {
            }
        }
    };
};

exports.normalizeTarget = function(target) {
    return target.replace(reTrailingSlash, '');
};

exports.monitor = function(monitor, target, opts, config, callback) {
    var changesUrl = target + '/_changes',
        notifier = new CouchNotifier(target, opts);
        
    function notifierClose() {
        if (notifier) {
            // emit the close event, flagging whether the close was expected 
            // (i.e. was initiated by a call to the close method)
            notifier.emit('close', ! notifier.request);
            notifier = null;
        }
    }
        
    // get the config since
    changesUrl += '?' + (opts.getDoc ? 'include_docs=true&' : '') + 
        'heartbeat=' + (opts.heartbeat || 30000) + '&' +
        'feed=continuous&since=' + (opts.since || config.since || 0);

    // make the request to couch
    debug('connecting to: ' + changesUrl);
    var req = notifier.request = http.request(url.parse(changesUrl), function(resp) {
        debug('received response from: ' + changesUrl);
        
        notifier.pause = function() {
            this.paused = true;
        };
        
        notifier.resume = function() {
            this.paused = false;
            resp.resume();
        };
        
        notifier.persist = function(lastSeq) {
            config.since = lastSeq;
            config.persist();
        };

        resp.on('data', notifier.createChunkProcessor(resp, opts, config));
        resp.on('close', notifierClose);
        resp.on('end', notifierClose);
        
        callback(null, notifier);
    });
    
    req.on('error', function(err) {
        debug('error when connecting to: ' + changesUrl, err);
        callback(err);
    });
    
    req.end();
};