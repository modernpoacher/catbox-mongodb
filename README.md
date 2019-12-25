# @modernpoacher/catbox-mongodb

MongoDB adapter for [catbox](https://github.com/hapijs/catbox)

**@modernpoacher/catbox-mongodb** serializes values to BSON using the MongoDB driver. The following data types are supported for this adapter: Object, Array, Number, String, Date, RegExp.


## Installation
Install `@modernpoacher/catbox-mongodb` via NPM.

`@modernpoacher/catbox-mongodb` _requires_ [`catbox`](https://github.com/hapijs/catbox):

```
npm install catbox @modernpoacher/catbox-mongodb
```
---

## Options
`@modernpoacher/catbox-mongodb` accepts the following options:

- `uri` - the [MongoDB URI](https://docs.mongodb.com/manual/reference/connection-string/), defaults to `'mongodb://127.0.0.1:27017/?maxPoolSize=5'`
- `partition` - the MongoDB database for cached items

## Usage
Sample catbox cache initialization :

```js
const Catbox = require('catbox');

const cache = new Catbox.Client(require('@modernpoacher/catbox-mongodb'), {
  uri: 'your-mongodb-uri', // Defaults to 'mongodb://127.0.0.1:27017/?maxPoolSize=5'
  partition: 'your-cache-partition'
})
```

Or configure your hapi server to use `@modernpoacher/catbox-mongodb` as the caching strategy.

For hapi `v17`:

```js
const Hapi = require('hapi')

const server = new Hapi.Server({
  cache: [
    {
      name: 'mongodb-cache',
      engine: require('@modernpoacher/catbox-mongodb'),
      uri: 'your-mongodb-uri', // Defaults to 'mongodb://127.0.0.1:27017/?maxPoolSize=5'
      partition: 'your-cache-partition'
    }
  ]
})
```

For hapi `v18`:

```js
const Hapi = require('hapi')

const server = new Hapi.Server({
  cache : [
    {
      name: 'mongodb-cache',
      provider: {
        constructor: require('@modernpoacher/catbox-mongodb'),
        options: {
          uri: 'your-mongodb-uri', // Defaults to 'mongodb://127.0.0.1:27017/?maxPoolSize=5'
          partition: 'your-cache-partition'
        }
      }
    }
  ]
})
```
