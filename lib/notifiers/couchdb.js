var events = require('events'),
    request = require('request'),
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
    // console.log(this.request.req);
    if (this.request && this.request.req) {
        var request = this.request.req;
        
        // delete the request from the notifier
        delete this.request;
        
        // end the request
        request.abort();
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
        clearTimeout(throttleTimer);
        throttleTimer = setTimeout(function() {
            if (! notifier.paused) {
                res.resume();
            }
        }, notifier.throttleDelay || 5000);
        
        // add the current chunk to the buffer
        buffer += chunk.toString('utf8');
        
        if (buffer) {
            // pause the response stream
            res.pause();
            
            try {
                var changeData = JSON.parse(buffer);

                // if we have a valid response (not an error)
                if (! changeData.error) {
                    // reset the buffer
                    buffer = '';

                    if (notifier.getDoc && (! changeData.deleted)) {
                        request(notifier.target + '/' + changeData.id, function(err, docRes, body) {
                            if (! err) {
                                changeData.doc = JSON.parse(body);
                                
                                // if the document has been deleted, then remove it from the changeData
                                if (changeData.doc.error) {
                                    delete changeData.doc;
                                }
                            }

                            emitChange(changeData);
                        });
                    }
                    else {
                        emitChange(changeData);
                    }
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
    changesUrl += '?feed=continuous&since=' + (config.since || 0);

    // request updates from the target
    notifier.request = request({ url: changesUrl, onResponse: true }, function(err, resp) {
        if (! err) {
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
        }
        
        callback(err, notifier);
    });
};