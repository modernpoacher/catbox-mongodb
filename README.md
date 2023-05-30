# `@modernpoacher/catbox-mongodb`

A MongoDB adapter for [catbox](https://github.com/hapijs/catbox).

**@modernpoacher/catbox-mongodb** serializes values to BSON using the MongoDB driver.

This adapter supports `Object`, `Array`, `Number`, `String`, `Date`, and `RegExp` data types.

## Installation

Install `@modernpoacher/catbox-mongodb` via NPM.

`@modernpoacher/catbox-mongodb` _requires_ [`catbox`](https://github.com/hapijs/catbox):

```
npm i @hapi/catbox @modernpoacher/catbox-mongodb
```
---

## Options
`@modernpoacher/catbox-mongodb` accepts the following options:

- `uri` - the [MongoDB URI](https://docs.mongodb.com/manual/reference/connection-string/), defaults to `'mongodb://127.0.0.1:27017/?maxPoolSize=5'`
- `partition` - the MongoDB database for cached items

## Usage

```javascript
import Catbox from '@hapi/catbox';
import Client from '@modernpoacher/catbox-mongodb'

const cache = new Catbox.Client(Client, {
  uri: 'your-mongodb-uri',
  partition: 'your-cache-partition'
})
```
