# lmdb-localstorage

A browser localStorage implementation of the NodeJS lmdb API.

This is ALPHA software.

# Installation

npm install lmdb-localstorage

# Usage

```
<script type="module">
    import {open, ABORT} from "lmdb-localstorage.js";`
</script>
```

Except for documented exceptions below, see the documentation for LMDB at [https://github.com/kriszyp/lmdb-js](https://github.com/kriszyp/lmdb-js).

## Unsupported/Under Development DB Options

`encoding` - The only encoding supported is `json`, so the option is ignored.

`encoder` - Custom encoding is not supported.

`sharedStructuresKey` - Not supported because `msgpack` is not supported.

`compression` - Compression is under development.

`cache` - Caching is currently used and can't be turned off and has no expiration. Improvements are under development.

`key-encoding` - `ordered-binary` (the LMDB default) is currently simulated and the sole options, values are ignored.

`keyEncoder` - Custom encoding is not supported.

`dupSort` - Under development.

`strictAsyncOrder` - Option not supported. API may operate this way. Not yet tested.

`maxDbs` - Currently unlimited. Under development.

`maxReaders` - Not supported. Ignored.

`overlappingSync` - Option not supported. API may operate this way. Not yet tested.

`separateFlushed` - Not supported.

`pageSize` - Not supported. Underlying `localStorage` does not support.

`eventTurnBatching` - Unlike the the core LMDB package, this defaults to `false`.

`encryptionKey` - Not supported. Under development.

`commitDelay` - Not supported. Ignored.

`LMDB Flags` - None of the LMDB environment flags are supported.

## Unsupported Methods

`db.getValues(key, options?: RangeOptions): Iterable<any>` - Not supported because `dupSort`, i.e. duplicate entries per key are not currently supported. Under development.


# Change History (Reverse Chronological Order)

2023-03-24 v0.0.1 First public release