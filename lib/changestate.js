var fs = require('fs'),
    path = require('path'),
    datafile = path.resolve('changestate.json'),
    _main;

function ChangeState() {
    // initialise empty data
    this._data = {
        targets: []
    };
    
    // initialise the persist callbacks
    this._persistCallbacks = [];
    
    // try to load data from the changestate.json file
    try {
        this._data = JSON.parse(fs.readFileSync(datafile, 'utf8'));
        
        // iterate through the targets and add the prototype
        (this._data.targets || []).forEach(function(targetData) {
            targetData.__proto__ = ChangeState.prototype;
        });
    }
    catch (e) {
        // no existing state
    }
} // ChangeState

ChangeState.prototype.initTarget = function(target) {
    var data;
    
    // iterate through the targets in the data
    this._data.targets.forEach(function(targetData) {
        if (targetData.id === target) {
            data = targetData;
        }
    });
    
    if (! data) {
        data = {
            id: target
        };
        
        data.__proto__ = ChangeState.prototype;
        
        this._data.targets.push(data);
        this.persist();
    }
    
    return data;
};

ChangeState.prototype.persist = function(callback) {
    if (this !== _main) {
        _main.persist(callback);
    }
    else {
        if (callback) {
            this._persistCallbacks.push(callback);
        }
        
        clearTimeout(this._persistTimer);
        this._persistTimer = setTimeout(function() {
            fs.writeFile(datafile, JSON.stringify(_main._data), 'utf8', function() {
                _main._persistCallbacks.forEach(Function.prototype.call);
                _main._persistCallbacks = [];
            });
        }, 1000);
    }
};

_main = module.exports = new ChangeState();