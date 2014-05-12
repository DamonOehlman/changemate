var debug = require('debug')('changemate'),
    events = require('events'),
    http = require('http'),
    url = require('url'),
    util = require('util'),
    reTrailingSlash = /\/$/;

var CouchNotifier = exports.Notifier = function(target, opts) {
  this.target = target;
  this.paused = false;

  this.request = null;
  this.response = null;
  this.reconnectOK = true;
  this.since = typeof opts.since != 'undefined' ? opts.since : 'now';

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
  debug('received manual close request');

  // remove the response reference
  this.response = null;

  // if we have a request, then abort the request
  if (this.request) {
    debug('aborting request');

    // abort the request
    this.request.abort();
    this.request = null;
  }
}; // close

CouchNotifier.prototype.connect = function(target, opts) {
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
    notifier.response = resp;

    // handle response events
    resp.on('data', notifier.createChunkProcessor(resp, opts));
    resp.on('close', notifierClose);
    // resp.on('end', notifierClose);

    // emit the connection event
    notifier.emit('connect', resp);
  });

  req.on('error', function(err) {
    // when the connection has been reset, emit a close
    if (err.code === 'ECONNRESET') {
      debug('detected socket reset, emitting close');
      notifier.emit('close');
    }
    // otherwise emit the error
    else {
      debug('error when connecting to: ' + changesUrl, err);
      notifier.emit('error', err);
    }
  });

  req.end();
};

CouchNotifier.prototype.createChunkProcessor = function(res, opts) {
  var notifier = this,
      paused = false,
      buffer = '',
      throttleTimer = 0;

  return function(chunk) {
    // if the notifier no longer has a response object, it has been closed
    // so ignore these data events
    if (! notifier.response) {
      debug('notifier closed, ignoring data');
      return;
    }

    // convert the chunk to a utf encoded string
    chunk = chunk.toString('utf8').replace(/\n/mg, '');

    // add the current chunk to the buffer
    buffer += chunk;

    if (buffer) {
      clearTimeout(throttleTimer);
      throttleTimer = setTimeout(function() {
        if (notifier.response && (! notifier.paused)) {
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
          notifier.emit('change', changeData, { since: notifier.since });
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
CouchNotifier.prototype.reconnect = function(opts) {
  debug('reconnect requested, reconnect ok = ' + this.reconnectOK);
  if (this.reconnectOK) {
    this.connect(this.target, opts);
  }
  else {
    debug('reconnect not allowed');
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
