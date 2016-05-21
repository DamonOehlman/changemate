var changemate = require('../');
var counter = 0;
var notifier;
var _checkpoint;

function _createNotifier() {
  // reset the counter
  counter = 0;

  console.log(_checkpoint);

  // create the notifier
  notifier = changemate(
    '<:couch:> https://fluxant.cloudant.com/seattle_neighbourhood', // target
    {}, // options
    _checkpoint // checkpoint
  );

  notifier.on('change', function(data, checkpoint) {
    // save the checkpoint
    _checkpoint = checkpoint;

    console.log('got change id: ' + data.id + ', seq: ' + data.seq + ', counter: ' + (++counter));
    if (counter >= 100) {
      notifier.close();
      _createNotifier();
    }
  });
}

// create the notifier
_createNotifier();
