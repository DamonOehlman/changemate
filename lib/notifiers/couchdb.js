var reTrailingSlash = /\/$/;

exports.normalizeTarget = function(target) {
    return target.replace(reTrailingSlash, '');
};

exports.monitor = function(monitor, target, opts, config, callback) {
    console.log(config);
    
    // get the config since
    config.since = config.since || 1;
    config.persist();
    
    console.log('monitoring ' + target);
    console.log(config);
    callback(null);
};