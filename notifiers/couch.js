var debug = require('debug')('changemate');
var EventEmitter = require('events').EventEmitter;
var extend = require('cog/extend');
var Feed = require('follow/lib/feed').Feed;
var util = require('util');
var reTrailingSlash = /\/$/;

var Notifier = exports.Notifier = function(target, opts) {
  EventEmitter.call(this);

  this.followOpts = extend({ db: target }, opts);
  this.throttleDelay = opts && parseInt(opts.throttleDelay, 10);
  this.reconnectDelay = (opts || {}).reconnectDelay || 5000;
};

util.inherits(Notifier, EventEmitter);

var prot = Notifier.prototype;

prot.connect = function() {
  var notifier = this;
  var feed;

  // if we have a local since value, update our value
  if (this.since) {
    this.followOpts.since = this.since;
  }

  // create the feed
  feed = this.feed = new Feed(this.followOpts);
  debug('creating new feed: ', feed);

  feed.on('start', function() {
    debug('feed started, is paused: ', feed.is_paused);

    // if paused, resume
    feed.is_paused && feed.resume();
    notifier.emit('connect', notifier.feed);
  });

  feed.on('change', function(change) {
    debug('captured change: ', change);

    // if we are throttling then immediately pause after receiving this change
    if (! isNaN(notifier.throttleDelay)) {
      debug('throttling changes to one every ' + notifier.throttleDelay + ' ms');
      feed.pause();
      setTimeout(feed.resume.bind(feed), notifier.throttleDelay);
    }

    notifier.since = change.seq;
    notifier.emit('change', change, { since: notifier.since });
  });

  feed.on('error', this.emit.bind(this, 'error'));
  process.nextTick(function() {
    feed.follow();
  });
};

prot.close = function(allowReconnect) {
  var notifier = this;

  if (this.feed) {
    this.feed.stop();
    this.emit('close');
  }

  if (allowReconnect) {
    debug('reconnection allowed, will attempt start in ' + this.reconnectDelay + ' ms');
    setTimeout(this.connect.bind(this), this.reconnectDelay);
  }
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
