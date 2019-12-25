import MongoDB from 'mongodb'
import Hoek from '@hapi/hoek'
import {
  Boom
} from '@hapi/boom'

const OPTIONS = {
  uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5'
}

const CONNECTION = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 1000,
  serverSelectionTimeoutMS: 1000
}

export default class Connection {
  constructor (options) {
    Hoek.assert(this instanceof Connection, 'MongoDB cache client must be instantiated using new')

    this.collections = {}
    this.isConnected = false
    this.isConnectionStarted = false
    this.settings = this.getSettings(options)

    return this
  }

  getSettings (options) {
    /*
     *  Database names:
     *
     *  - empty string is not valid
     *  - cannot contain space, "*<>:|?
     *  - limited to 64 bytes (after conversion to UTF-8)
     *  - admin, local and config are reserved
     */

    Hoek.assert(options.partition !== 'admin' && options.partition !== 'local' && options.partition !== 'config', 'Cache partition name cannot be "admin", "local", or "config" when using MongoDB')
    Hoek.assert(options.partition.length < 64, 'Cache partition must be less than 64 bytes when using MongoDB')

    const settings = Hoek.applyToDefaults(OPTIONS, options)

    settings.uri = settings.uri.replace(/(mongodb:\/\/[^/]*)([^?]*)(.*)/, `$1/${settings.partition}$3`)

    return settings
  }

  async start () {
    if (this.isConnected) {
      return
    }

    if (this.isConnectionStarted) {
      return
    }

    this.isConnectionStarted = true

    try {
      const client = await MongoDB.MongoClient.connect(this.settings.uri, CONNECTION)
      this.client = client
      this.db = client.db()
      this.isConnected = true
    } catch (e) {
      this.isConnectionStarted = false
      this.isConnected = false
      throw e
    }
  }

  async stop () {
    if (this.client) {
      await this.client.close()
      delete this.client
      delete this.db
      this.collections = {}
      this.isConnectionStarted = false
      this.isConnected = false
    }
  }

  isReady () {
    return this.isConnected
  }

  validateSegmentName (name) {
    /*
     *  Collection names:
     *
     *  - empty string is not valid
     *  - cannot contain "\0"
     *  - avoid creating any collections with "system." prefix
     *  - user created collections should not contain "$" in the name
     *  - database name + collection name < 100 (actual 120)
     */

    if (!name) {
      throw new Boom('Empty string')
    }

    if (name.includes('\0')) {
      throw new Boom('Includes null character')
    }

    if (name.startsWith('system.')) {
      throw new Boom('Begins with "system."')
    }

    if (name.includes('$')) {
      throw new Boom('Contains "$"')
    }

    if (name.length + this.settings.partition.length >= 100) {
      throw new Boom('Segment and partition name lengths exceeds 100 characters')
    }

    return null
  }

  async getCollection (name) {
    if (!this.isConnected) {
      throw new Boom('Connection not ready')
    }

    if (!name) {
      throw new Boom('Collection name missing')
    }

    if (this.collections[name]) {
      return this.collections[name]
    }

    const collection = await this.db.collection(name)
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

    this.collections[name] = collection
    return collection
  }

  async get ({ id, segment }) {
    if (!this.isConnectionStarted) {
      throw new Boom('Connection not started')
    }

    const collection = await this.getCollection(segment)
    const criteria = { _id: id }
    const record = await collection.findOne(criteria)

    if (!record) {
      return null
    }

    if (!record.stored) {
      throw new Boom('Incorrect record structure')
    }

    const envelope = {
      item: record.value,
      stored: record.stored.getTime(),
      ttl: record.ttl
    }

    return envelope
  }

  async set ({ id, segment }, value, ttl) {
    if (!this.isConnectionStarted) {
      throw new Boom('Connection not started')
    }

    const collection = await this.getCollection(segment)
    const expiresAt = new Date()
    expiresAt.setMilliseconds(expiresAt.getMilliseconds() + ttl)

    const record = {
      value,
      stored: new Date(),
      ttl,
      expiresAt
    }

    const criteria = { _id: id }

    await collection.updateOne(criteria, { $set: record }, { upsert: true, safe: true })
  }

  async drop ({ id, segment }) {
    if (!this.isConnectionStarted) {
      throw new Boom('Connection not started')
    }

    const collection = await this.getCollection(segment)

    const criteria = { _id: id }
    await collection.deleteOne(criteria, { safe: true })
  }
}
