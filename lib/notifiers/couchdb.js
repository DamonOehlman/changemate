var events = require('events'),
    request = require('request'),
    util = require('util'),
    _ = require('underscore'),
    reTrailingSlash = /\/$/;

function CouchNotifier(target, opts) {
    this.target = target;
    
    _.extend(this, opts);
};

util.inherits(CouchNotifier, events.EventEmitter);

CouchNotifier.prototype.createChunkProcessor = function(res, config) {
    var notifier = this,
        paused = false,
        buffer = '',
        throttleTimer = 0;
        
    function emitChange(data) {
        // if we have a sequence id, then update the config
        if (data.seq) {
            config.since = data.seq;
            config.persist();
        }
        
        notifier.emit('change', data);
    }
    
    return function(chunk) {
        clearTimeout(throttleTimer);
        throttleTimer = setTimeout(function() {
            res.resume();
        }, notifier.throttleDelay || 5000);
        
        // add the current chunk to the buffer
        buffer += chunk.toString('utf8');
        
        if (buffer) {
            // pause the response stream
            res.pause();
            
            try {
                var changeData = JSON.parse(buffer);
                
                // reset the buffer
                buffer = '';

                if (notifier.getDoc && (! changeData.deleted)) {
                    request(notifier.target + '/' + changeData.id, function(err, docRes, body) {
                        if (! err) {
                            changeData.doc = JSON.parse(body);
                        }
                        
                        emitChange(changeData);
                    });
                }
                else {
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
        
    // get the config since
    changesUrl += '?feed=continuous&since=' + (config.since || 0);

    // request updates from the target
    request({ url: changesUrl, onResponse: true }, function(err, resp) {
        if (! err) {
            resp.on('data', notifier.createChunkProcessor(resp, config));
        }
        
        callback(err, notifier);
    });
};