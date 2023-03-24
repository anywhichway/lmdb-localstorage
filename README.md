# lmdb-localstorage

A browser localStorage implementation of the NodeJS [lmdb](https://www.npmjs.com/package/lmdb) API.

This is ALPHA software. Unit tests not yet in place.

# Rationale

I personally prefer isomorphic programming and lmdb is not available in the browser. `localStorage` provides a synchronous API that maps to the synchronous read approach of [lmdb](https://www.npmjs.com/package/lmdb).

I will create an async only version using `indexedDB` as a back-end given sufficient interest.

# Installation

```
npm install lmdb-localstorage
```

Copy the file `node_modules/lmdb-localstorage/lmdb-localstorage.js' and files in `node_modules/lmdb-localstorage/src' to you preferred location.

# Usage

```
<script type="module">
    import {open, ABORT} from "lmdb-localstorage.js";`
</script>
```

Except for documented exceptions below, see the documentation for LMDB at [https://github.com/kriszyp/lmdb-js](https://github.com/kriszyp/lmdb-js) for how to use.

# Unsupported/Differences/Under Development DB Options

`encoding` - The only encoding supported is `json`, so the option is ignored.

`encoder` - Custom encoding is not supported.

`sharedStructuresKey` - Not supported because `msgpack` is not supported.

`compression` - `true` or `false` only, configurable options under development.

`cache` - `true` or `false` only, configurable options under development.

`useVersions` - The standard documentation says "Set this to true if you will be setting version numbers on the entries in the database. Note that you can not change this flag once a database has entries in it (or they won't be read correctly)". For `lmdb-localstorage` turning versions off after initial use does not break the database, they simply won't be used.

`key-encoding` - `ordered-binary` (the LMDB default) is currently simulated and the sole options, values are ignored.

`keyEncoder` - Custom encoding is not supported.

`dupSort` - Under development.

`strictAsyncOrder` - Option not supported. API may operate this way. Not yet tested.

`maxDbs` - Currently unlimited. Under development.

`maxReaders` - Not supported. Ignored.

`overlappingSync` - Option not supported. API may operate this way. Not yet tested.

`separateFlushed` - Not supported.

`pageSize` - Not supported. Underlying `localStorage` does not support.

`eventTurnBatching` - Unlike the core LMDB package, this defaults to `false` and `true` is not supported.

`commitDelay` - Not supported. Ignored.

`LMDB Flags` - None of the LMDB environment flags are supported.

# Unsupported/Under Development Methods

`db.getValues(key, options?: RangeOptions): Iterable<any>` - Not supported because `dupSort`, i.e. duplicate entries per key are not currently supported. Under development.

# Events

As an EventEmitter `lmdb-localstorage` has limitations as documented at [eventemitter3](https://www.npmjs.com/package/eventemitter3).

`beforecommit` - supported

# Change History (Reverse Chronological Order)

2023-03-25 v0.0.2 Added [ChaCha8](https://www.npmjs.com/package/js-chacha8) encryption, cache control, compression control, event emitting.

2023-03-24 v0.0.1 First public release