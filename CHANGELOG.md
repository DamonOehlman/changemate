# changemate changelog

## 0.4.5

- Added travis CI integration
- Removed callbacks still kicking around in the couch notifier.
- Renamed state to checkpoint as it is more accurate

## 0.4.4

- Fixed errors with `change` events being fired after a notifier has been manually closed.

## 0.4.3

- Updated `change` events to emit state information in addition to update item data
- Started recording changelog 