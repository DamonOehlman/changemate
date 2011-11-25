var net = require('net'),
    defaults = {
        port: 17008 // unassigned as at 2011-11-20: http://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xml
    },
    _server,
    _monitor,
    ChangeMonitor = require('./changemonitor');
    
function _createServer(opts, callback) {
    // create the server
    // TODO: make server creation optional
    _server = net.createServer(_handleConnection);
    
    // create the monitor
    _monitor = new ChangeMonitor();
    
    // when the server is listening and ready, return the local monitor
    _server.listen(opts.port, function() {
        callback(null, _monitor);
    });
} // _createServer

function _getMonitor(opts, callback) {
    callback(null, _monitor = new ChangeMonitor());
    /*
    // if we have an active monitor, then return it
    if (_monitor) {
        callback(null, _monitor);
    }
    // otherwise, go through the client / server configuration setup
    else {
        var client = net.connect(opts.port, function() {
            // create the monitor as a remote monitor
            _monitor = new ChangeMonitor(client);
            
            // fire the callback
            callback(null, _monitor);
        });

        client.on('error', function(e) {
            // if we couldn't establish a connection, then 
            // create the server
            if (e.code && e.code === 'ECONNREFUSED') {
                _createServer(opts, callback);
            }
        });
    }
    */
} // _getServer

function _guessType(target) {
    return 'filesystem';
} // _guessType

function _handleConnection(socket) {
    // console.log('got connection');
} // _handleConnection

exports.close = function(callback) {
    if (_server) {
        _server.on('close', callback);
        _server.close();
    }
}; // close

exports.monitor = function(target, opts, callback) {
    if (! callback && typeof opts == 'function') {
        callback = opts;
        opts = {};
    }

    opts = opts || {};
    opts.type = opts.type || _guessType(target);

    exports.start(opts, function(err, monitor) {
        if (! err) {
            monitor.monitor(target, opts, callback);
        }
        else {
            callback(err);
        }
    });
};

exports.start = function(opts, callback) {
    if (! callback && typeof opts == 'function') {
        callback = opts;
        opts = {};
    }

    // initialise options
    opts = opts || {};
    opts.port = opts.port || defaults.port;
    
    // firstly, check the monitor server state
    _getMonitor(opts, callback);
};