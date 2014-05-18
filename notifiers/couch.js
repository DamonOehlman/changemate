var debug = require('debug')('changemate');
var EventEmitter = require('events').EventEmitter;
var extend = require('cog/extend');
var follow = require('follow');
var util = require('util');
var reTrailingSlash = /\/$/;

var Notifier = exports.Notifier = function(target, opts) {
  EventEmitter.call(this);
};

util.inherits(Notifier, EventEmitter);

var prot = Notifier.prototype;

prot.connect = function(target, opts) {
  var notifier = this;
  var followOpts = extend({ db: target }, {
    since: (opts || {}).since,
    include_docs: (opts || {}).include_docs,
    heartbeat: (opts || {}).heartbeat || 30000
  });

  debug('connecting to target: ' + target + ' with opts: ', followOpts);
  this.feed = follow(followOpts, function(err, change) {
    if (err) {
      return notifier.emit('error', err);
    }

    notifier.emit('change', change);
  });

  this.feed.once('start', function() {
    debug('feed started');
    notifier.emit('connect', notifier.feed);
  });
};

prot.pause = function() {
  debug('pausing the couchdb notifier');
  this.feed && this.feed.pause();
};

prot.resume = function() {
  debug('resuming the couchdb notifier');
  this.feed && this.feed.resume();
};

/* exports */

exports.normalizeTarget = function(target) {
  return target.replace(reTrailingSlash, '');
};
