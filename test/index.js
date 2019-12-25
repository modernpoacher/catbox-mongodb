import { expect } from 'chai'
import Catbox from '@hapi/catbox'
import CatboxMongoDB from '@modernpoacher/catbox-mongodb'
import MongoDB from 'mongodb'

describe('@modernpoacher/catbox-mongodb', () => {
  before(async () => {
    const client = await MongoDB.MongoClient.connect('mongodb://localhost:27017/unit-testing', {
      autoReconnect: false,
      poolSize: 4,
      useNewUrlParser: true,
      useUnifiedTopology: false
    })

    const db = client.db()
    await db.dropDatabase()
    await db.addUser('tester', 'secret', {
      roles: ['dbAdmin']
    })
    await client.close()
  })

  after(async () => {
    const client = await MongoDB.MongoClient.connect('mongodb://localhost:27017/unit-testing', {
      autoReconnect: false,
      poolSize: 4,
      useNewUrlParser: true,
      useUnifiedTopology: false
    })

    const db = client.db()
    await db.dropDatabase()
    await db.removeUser('tester')
    await client.close()
  })

  it('starts', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()
    expect(client.isReady()).to.equal(true)
    await client.stop()
  })

  it('stops', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()
    await client.stop()
    expect(client.isReady()).to.equal(false)
  })

  it('connects after a previous connection has failed', async () => {
    const options = {
      uri: 'mongodb://wrong-uri',
      partition: 'unit-testing'
    }

    const client = new CatboxMongoDB(options)

    try {
      await client.start()
    } catch ({ message }) {
      expect(message).to.include('failed to connect to server [wrong-uri:27017] on first connect')
    }

    client.settings.uri = 'mongodb://127.0.0.1:27017/unit-testing?maxPoolSize=5'
    await client.start()

    expect(client.isReady()).to.equal(true)

    await client.stop()
  }).timeout(4000)

  it('sets/gets an item', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()

    const key = { id: 'item', segment: 'mockSegment' }
    await client.set(key, '123', 500)
    const { item } = await client.get(key)

    expect(item).to.equal('123')

    await client.stop()
  })

  it('sets/gets an item (zero)', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()

    const key = { id: 'zero', segment: 'mockSegment' }
    await client.set(key, 0, 20)
    const { item } = await client.get(key)

    expect(item).to.equal(0)

    await client.stop()
  })

  it('sets/gets an item (Object, Array, Number, String, Date, RegExp)', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()

    const key = { id: 'item', segment: 'mockSegment' }
    const value = {
      object: { a: 'b' },
      array: [1, 2, 3],
      number: 5.85,
      string: 'hapi',
      date: new Date('2014-03-07'),
      regexp: /[a-zA-Z]+/,
      boolean: false
    }

    await client.set(key, value, 500)
    const { item } = await client.get(key)

    expect(item).to.eql(value)

    await client.stop()
  })

  it('does not set/get an item with a non-positive ttl', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()

    const key = { id: 'non-positive-ttl', segment: 'mockSegment' }
    await client.set(key, 'mock value', 0)

    expect(await client.get(key)).to.be.null

    await client.stop()
  })

  it('returns null when getting an item with a null key', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()

    expect(await client.get(null)).to.equal(null)

    await client.stop()
  })

  it('returns null when getting an item which has expired', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()

    const key = { id: 'expired', segment: 'mockSegment' }

    await client.set(key, 'x', 1)
    await new Promise((resolve) => {
      setTimeout(async () => {
        expect(await client.get(key)).to.equal(null)

        await client.stop()

        resolve()
      }, 2)
    })
  })

  it('throws when getting an item with an invalid key', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()

    try {
      await client.get({})
    } catch ({ message }) {
      expect(message).to.equal('Invalid key')
    }

    await client.stop()
  })

  it('throws when setting an item with a null key', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()

    try {
      await client.set(null, {}, 1000)
    } catch ({ message }) {
      expect(message).to.equal('Invalid key')
    }

    await client.stop()
  })

  it('throws when setting an item with an invalid key', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()

    try {
      await client.set({}, {}, 1000)
    } catch ({ message }) {
      expect(message).to.equal('Invalid key')
    }

    await client.stop()
  })

  it('throws when setting an item with a circular reference', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()

    const key = { id: 'circular-reference', segment: 'mockSegment' }
    const value = { a: 1 }
    value.b = value

    try {
      await client.set(key, value, 10)
    } catch ({ message }) {
      expect(message).to.equal('cyclic dependency detected')
    }

    await client.stop()
  })

  it('throws when dropping an item with a null key', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()

    try {
      await client.drop(null)
    } catch ({ message }) {
      expect(message).to.equal('Invalid key')
    }

    await client.stop()
  })

  it('throws when dropping an item with an invalid key', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()

    try {
      await client.drop({})
    } catch ({ message }) {
      expect(message).to.equal('Invalid key')
    }

    await client.stop()
  })

  it('throws when getting an item after the client is stopped', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()
    await client.stop()

    const key = { id: 'client-stopped', segment: 'mockSegment' }

    try {
      await client.get(key)
    } catch ({ message }) {
      expect(message).to.equal('Disconnected')
    }
  })

  it('throws when setting an item after the client is stopped', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()
    await client.stop()

    const key = { id: 'client-stopped', segment: 'mockSegment' }

    try {
      await client.set(key, 'y', 1)
    } catch ({ message }) {
      expect(message).to.equal('Disconnected')
    }
  })

  it('throws when dropping an item after the client is stopped', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()
    await client.stop()

    try {
      await client.drop('a')
    } catch ({ message }) {
      expect(message).to.equal('Disconnected')
    }
  })

  it('throws when dropping an item after the client is stopped (key)', async () => {
    const client = new Catbox.Client(CatboxMongoDB)
    await client.start()
    await client.stop()

    const key = { id: 'client-stopped', segment: 'mockSegment' }

    try {
      await client.drop(key)
    } catch ({ message }) {
      expect(message).to.equal('Disconnected')
    }
  })

  it('throws when the segment name is zero length', () => {
    const config = {
      expiresIn: 50000
    }

    expect(() => {
      const client = new Catbox.Client(CatboxMongoDB)
      return new Catbox.Policy(config, client, '')
    }).to.throw(Error)
  })

  it('throws when the segment name is invalid', () => {
    const config = {
      expiresIn: 50000
    }

    expect(() => {
      const client = new Catbox.Client(CatboxMongoDB)
      return new Catbox.Policy(config, client, 'a\0b')
    }).to.throw(Error)
  })

  it('throws without the keyword "new"', () => {
    expect(() => {
      CatboxMongoDB()
    }).to.throw(Error)
  })

  it('throws when using a reserved partition name (admin)', () => {
    const options = {
      partition: 'admin'
    }

    expect(() => {
      return new CatboxMongoDB(options)
    }).to.throw(Error, 'Cache partition name cannot be "admin", "local", or "config" when using MongoDB')
  })

  it('throws when using a reserved partition name (local)', () => {
    const options = {
      partition: 'local'
    }

    expect(() => {
      return new CatboxMongoDB(options)
    }).to.throw(Error, 'Cache partition name cannot be "admin", "local", or "config" when using MongoDB')
  })

  describe('`getSettings()`', () => {
    it('parses the connection string (without database)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)
      const settings = mongo.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017/unit-testing')
    })

    it('parses the connection string (without database but with slash)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017/',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)
      const settings = mongo.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017/unit-testing')
    })

    it('parses the connection string (with credentials)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)
      const settings = mongo.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017/unit-testing?maxPoolSize=5')
    })

    it('parses the connection string (without credentials)', () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/test?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)
      const settings = mongo.getSettings(options)

      expect(settings.uri).to.equal('mongodb://127.0.0.1:27017/unit-testing?maxPoolSize=5')
    })

    it('parses the connection string with replica set (with database)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/test',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)
      const settings = mongo.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/unit-testing')
    })

    it('parses the connection string with replica set (without database)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)
      const settings = mongo.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/unit-testing')
    })

    it('parses the connection string with replica set (without database but with slash)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)
      const settings = mongo.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/unit-testing')
    })

    it('parses the connection string with replica set (without database but with slash and query params)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/?maxPoolSize=5&replicaSet=rs',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)
      const settings = mongo.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/unit-testing?maxPoolSize=5&replicaSet=rs')
    })
  })

  describe('`start()`', () => {
    describe('Authentication is valid', () => {
      it('connects', async () => {
        const options = {
          uri: 'mongodb://tester:secret@127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }
        const mongo = new CatboxMongoDB(options)

        await mongo.start()

        expect(mongo.isConnected).to.be.true

        await mongo.stop()
      })

      describe('`isReady()`', () => {
        it('returns true', async () => {
          const options = {
            uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
            partition: 'unit-testing'
          }
          const mongo = new CatboxMongoDB(options)

          await mongo.start()

          expect(mongo.isReady()).to.be.true

          await mongo.stop()
        })
      })
    })

    describe('Authentication is not valid', () => {
      it('throws', async () => {
        const options = {
          uri: 'mongodb://bob:password@127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const mongo = new CatboxMongoDB(options)

        try {
          await mongo.start()
        } catch ({ message }) {
          expect(message).to.include('failed to connect to server [127.0.0.1:27017] on first connect')
        }

        await mongo.stop()
      })

      describe('`isReady()`', () => {
        it('returns false', async () => {
          const options = {
            uri: 'mongodb://bob:password@127.0.0.1:27017/?maxPoolSize=5',
            partition: 'unit-testing'
          }
          const mongo = new CatboxMongoDB(options)

          try {
            await mongo.start()
          } catch ({ message }) {
            expect(mongo.isReady()).to.be.false
          }

          await mongo.stop()
        })
      })
    })
  })

  describe('`validateSegmentName()`', () => {
    describe('The name is not valid', () => {
      it('throws when the name is zero length', () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const mongo = new CatboxMongoDB(options)

        expect(() => mongo.validateSegmentName('')).to.throw(Error, 'Empty string')
      })

      it('throws when the name has a null character', () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const mongo = new CatboxMongoDB(options)

        expect(() => mongo.validateSegmentName('\0test')).to.throw(Error, 'Includes null character')
      })

      it('throws when the name starts with "system."', () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const mongo = new CatboxMongoDB(options)

        expect(() => mongo.validateSegmentName('system.')).to.throw(Error, 'Begins with "system."')
      })

      it('throws when the name has a "$" character', () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const mongo = new CatboxMongoDB(options)

        expect(() => mongo.validateSegmentName('te$t')).to.throw(Error, 'Contains "$"')
      })

      it('throws when the name is greater than one hundred characters', () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const mongo = new CatboxMongoDB(options)

        expect(() => mongo.validateSegmentName('0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789')).to.throw(Error, 'Segment and partition name lengths exceeds 100 characters')
      })
    })

    describe('The name is valid', () => {
      it('returns null', () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const mongo = new CatboxMongoDB(options)

        expect(mongo.validateSegmentName('valid')).to.be.null
      })
    })
  })

  describe('`getCollection()`', () => {
    it('throws when the connection is not started', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)

      try {
        await mongo.getCollection('test')
      } catch ({ message }) {
        expect(message).to.equal('Connection not ready')
      }
    })

    it('returns a collection', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }
      const mongo = new CatboxMongoDB(options)

      await mongo.start()

      expect(await mongo.getCollection('test')).to.not.be.undefined

      await mongo.stop()
    })

    it('throws when there is an error getting the collection (`getCollection`)', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)
      await mongo.start()

      try {
        await mongo.getCollection('')
      } catch ({ message }) {
        expect(message).to.equal('Collection name missing')
      }

      await mongo.stop()
    })

    it('throws when there is an error getting the collection (`createIndex`)', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }
      const mongo = new CatboxMongoDB(options)

      await mongo.start()

      mongo.db.collection = (item) => (
        Promise.resolve({
          createIndex: () => Promise.reject(new Error('`createIndex` error'))
        })
      )

      try {
        await mongo.getCollection('MockCollection')
      } catch ({ message }) {
        expect(message).to.equal('`createIndex` error')
      }

      await mongo.stop()
    })
  })

  describe('`get()`', () => {
    describe('Always', () => {
      it('throws when the connection is not started', async () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const mongo = new CatboxMongoDB(options)

        try {
          await mongo.get('test')
        } catch ({ message }) {
          expect(message).to.equal('Connection not started')
        }
      })

      it('throws when there is an error getting an item', async () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const key = {
          id: 'item',
          segment: 'mockSegment'
        }

        const mongo = new CatboxMongoDB(options)
        mongo.isConnectionStarted = true
        mongo.isConnected = true

        mongo.collections.mockSegment = {
          findOne: (item) => Promise.reject(new Error('`findOne` error'))
        }

        try {
          await mongo.get(key)
        } catch ({ message }) {
          expect(message).to.equal('`findOne` error')
        }
      })

      it('throws when there is an error getting an item because the structure is invalid', async () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const key = {
          id: 'item',
          segment: 'mockSegment'
        }

        const mongo = new CatboxMongoDB(options)
        mongo.isConnectionStarted = true
        mongo.isConnected = true

        mongo.collections.mockSegment = {
          findOne: (item) => Promise.resolve({ stored: null })
        }

        try {
          await mongo.get(key)
        } catch ({ message }) {
          expect(message).to.equal('Incorrect record structure')
        }
      })

      it('throws when there is an error getting an item because the connection is not ready', async () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const key = {
          id: 'item',
          segment: 'mockSegment'
        }

        const mongo = new CatboxMongoDB(options)
        mongo.isConnectionStarted = true
        mongo.isConnected = false

        mongo.collections.mockSegment = {
          findOne: (item) => Promise.resolve({ value: false })
        }

        try {
          await mongo.get(key)
        } catch ({ message }) {
          expect(message).to.equal('Connection not ready')
        }
      })
    })

    describe('The key exists', () => {
      it('returns an object', async () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const key = {
          id: 'item',
          segment: 'mockSegment'
        }

        const mongo = new CatboxMongoDB(options)

        await mongo.start()
        await mongo.set(key, 'mock value', 200)
        const { item } = await mongo.get(key)

        expect(item).to.equal('mock value')

        await mongo.stop()
      })
    })

    describe('The key does not exist', () => {
      it('returns null', async () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const mongo = new CatboxMongoDB(options)

        await mongo.start()

        expect(await mongo.get({ id: 'does-not-exist', segment: 'mockSegment' })).to.be.null

        await mongo.stop()
      })
    })
  })

  describe('`set()`', () => {
    it('throws when the connection is not started', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)

      try {
        await mongo.set({ id: 'item', segment: 'mockSegment' }, 'test1', 3600)
      } catch ({ message }) {
        expect(message).to.equal('Connection not started')
      }
    })

    it('returns undefined', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)
      await mongo.start()

      expect(await mongo.set({ id: 'item', segment: 'mockSegment' }, 'test1', 3600)).to.be.undefined

      await mongo.stop()
    })

    it('throws when there is an error setting an item (`getCollection`)', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const key = {
        id: 'item',
        segment: 'mockSegment'
      }

      const mongo = new CatboxMongoDB(options)
      mongo.isConnectionStarted = true
      mongo.isConnected = true

      mongo.getCollection = (item) => Promise.reject(new Error('`getCollection` error'))

      try {
        await mongo.set(key, true, 0)
      } catch ({ message }) {
        expect(message).to.equal('`getCollection` error')
      }
    })

    it('throws when there is an error setting an item (`updateOne`)', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const key = {
        id: 'item',
        segment: 'mockSegment'
      }

      const mongo = new CatboxMongoDB(options)
      mongo.isConnectionStarted = true
      mongo.isConnected = true

      mongo.getCollection = (item) => (
        Promise.resolve({
          updateOne: () => Promise.reject(new Error('`updateOne` error'))
        })
      )

      try {
        await mongo.set(key, true, 0)
      } catch ({ message }) {
        expect(message).to.equal('`updateOne` error')
      }
    })
  })

  describe('`drop()`', () => {
    it('throws when the connection is not started', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)

      try {
        await mongo.drop({ id: 'item', segment: 'mockSegment' })
      } catch ({ message }) {
        expect(message).to.equal('Connection not started')
      }
    })

    it('returns undefined', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const mongo = new CatboxMongoDB(options)

      await mongo.start()

      expect(await mongo.drop({ id: 'item', segment: 'mockSegment' })).to.be.undefined

      await mongo.stop()
    })

    it('throws when there is an error dropping an item (`getCollection`)', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }
      const key = {
        id: 'item',
        segment: 'mockSegment'
      }
      const mongo = new CatboxMongoDB(options)
      mongo.isConnectionStarted = true
      mongo.isConnected = true

      mongo.getCollection = (item) => Promise.reject(new Error('`getCollection` error'))

      try {
        await mongo.drop(key)
      } catch ({ message }) {
        expect(message).to.equal('`getCollection` error')
      }
    })

    it('throws when there is an error dropping an item (`deleteOne`)', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }
      const key = {
        id: 'item',
        segment: 'mockSegment'
      }
      const mongo = new CatboxMongoDB(options)
      mongo.isConnectionStarted = true

      mongo.getCollection = (item) => (
        Promise.resolve({
          deleteOne: (criteria, safe) => Promise.reject(new Error('`deleteOne` error'))
        })
      )

      try {
        await mongo.drop(key)
      } catch ({ message }) {
        expect(message).to.equal('`deleteOne` error')
      }
    })
  })
})
