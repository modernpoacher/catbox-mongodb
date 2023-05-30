import { expect } from 'chai'
import Catbox from '@hapi/catbox'
import Client from '@modernpoacher/catbox-mongodb'
import * as MongoDB from 'mongodb'

const CREATE_USER = {
  createUser: 'tester',
  pwd: 'secret',
  roles: ['dbAdmin']
}

describe('@modernpoacher/catbox-mongodb', () => {
  before(async () => {
    const mongoClient = await MongoDB.MongoClient.connect('mongodb://127.0.0.1:27017/unit-testing')
    const db = mongoClient.db()
    await db.dropDatabase()
    await db.command(CREATE_USER)
    await mongoClient.close()
  })

  after(async () => {
    const mongoClient = await MongoDB.MongoClient.connect('mongodb://127.0.0.1:27017/unit-testing')
    const db = mongoClient.db()
    await db.dropDatabase()
    await db.removeUser('tester')
    await mongoClient.close()
  })

  it('starts', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()
    expect(cacheClient.isReady()).to.equal(true)
    await cacheClient.stop()
  }).timeout(4000)

  it('stops', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()
    await cacheClient.stop()
    expect(cacheClient.isReady()).to.equal(false)
  }).timeout(4000)

  it('reconnects', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()
    await cacheClient.stop()
    await cacheClient.start()
    expect(cacheClient.isReady()).to.equal(true)
    await cacheClient.stop()
  }).timeout(4000)

  it('sets/gets an item', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()

    const key = { id: 'item', segment: 'mockSegment' }
    await cacheClient.set(key, '123', 500)
    const { item } = await cacheClient.get(key)

    expect(item).to.equal('123')

    await cacheClient.stop()
  })

  it('sets/gets an item (zero)', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()

    const key = { id: 'zero', segment: 'mockSegment' }
    await cacheClient.set(key, 0, 20)
    const { item } = await cacheClient.get(key)

    expect(item).to.equal(0)

    await cacheClient.stop()
  })

  it('sets/gets an item (Object, Array, Number, String, Date, RegExp)', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()

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

    await cacheClient.set(key, value, 500)
    const { item } = await cacheClient.get(key)

    expect(item).to.eql(value)

    await cacheClient.stop()
  })

  it('does not set/get an item with a non-positive ttl', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()

    const key = { id: 'non-positive-ttl', segment: 'mockSegment' }
    await cacheClient.set(key, 'mock value', 0)

    expect(await cacheClient.get(key)).to.be.null

    await cacheClient.stop()
  })

  it('returns null when getting an item with a null key', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()

    expect(await cacheClient.get(null)).to.equal(null)

    await cacheClient.stop()
  })

  it('returns null when getting an item which has expired', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()

    const key = { id: 'expired', segment: 'mockSegment' }

    await cacheClient.set(key, 'x', 1)
    await new Promise((resolve) => {
      setTimeout(async () => {
        expect(await cacheClient.get(key)).to.equal(null)

        await cacheClient.stop()

        resolve()
      }, 2)
    })
  })

  it('throws when getting an item with an invalid key', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()

    try {
      await cacheClient.get({})
    } catch ({ message }) {
      expect(message).to.equal('Invalid key')
    }

    await cacheClient.stop()
  })

  it('throws when setting an item with a null key', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()

    try {
      await cacheClient.set(null, {}, 1000)
    } catch ({ message }) {
      expect(message).to.equal('Invalid key')
    }

    await cacheClient.stop()
  })

  it('throws when setting an item with an invalid key', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()

    try {
      await cacheClient.set({}, {}, 1000)
    } catch ({ message }) {
      expect(message).to.equal('Invalid key')
    }

    await cacheClient.stop()
  })

  it('throws when setting an item with a circular reference', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()

    const key = { id: 'circular-reference', segment: 'mockSegment' }
    const value = { a: 1 }
    value.b = value

    try {
      await cacheClient.set(key, value, 10)
    } catch ({ message }) {
      expect(message).to.equal('Cannot convert circular structure to BSON')
    }

    await cacheClient.stop()
  })

  it('throws when dropping an item with a null key', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()

    try {
      await cacheClient.drop(null)
    } catch ({ message }) {
      expect(message).to.equal('Invalid key')
    }

    await cacheClient.stop()
  })

  it('throws when dropping an item with an invalid key', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()

    try {
      await cacheClient.drop({})
    } catch ({ message }) {
      expect(message).to.equal('Invalid key')
    }

    await cacheClient.stop()
  })

  it('throws when getting an item after the client is stopped', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()
    await cacheClient.stop()

    const key = { id: 'catbox-stopped', segment: 'mockSegment' }

    try {
      await cacheClient.get(key)
    } catch ({ message }) {
      expect(message).to.equal('Disconnected')
    }
  })

  it('throws when setting an item after the client is stopped', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()
    await cacheClient.stop()

    const key = { id: 'catbox-stopped', segment: 'mockSegment' }

    try {
      await cacheClient.set(key, 'y', 1)
    } catch ({ message }) {
      expect(message).to.equal('Disconnected')
    }
  })

  it('throws when dropping an item after the client is stopped', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()
    await cacheClient.stop()

    try {
      await cacheClient.drop('a')
    } catch ({ message }) {
      expect(message).to.equal('Disconnected')
    }
  })

  it('throws when dropping an item after the client is stopped (key)', async () => {
    const cacheClient = new Catbox.Client(Client)
    await cacheClient.start()
    await cacheClient.stop()

    const key = { id: 'catbox-stopped', segment: 'mockSegment' }

    try {
      await cacheClient.drop(key)
    } catch ({ message }) {
      expect(message).to.equal('Disconnected')
    }
  })

  it('throws when the segment name is zero length', () => {
    const config = {
      expiresIn: 50000
    }

    expect(() => {
      const cacheClient = new Catbox.Client(Client)
      return new Catbox.Policy(config, cacheClient, '')
    }).to.throw(Error)
  })

  it('throws when the segment name is invalid', () => {
    const config = {
      expiresIn: 50000
    }

    expect(() => {
      const cacheClient = new Catbox.Client(Client)
      return new Catbox.Policy(config, cacheClient, 'a\0b')
    }).to.throw(Error)
  })

  it('throws without the keyword "new"', () => {
    expect(() => {
      Client()
    }).to.throw(Error)
  })

  it('throws when using a reserved partition name (admin)', () => {
    const options = {
      partition: 'admin'
    }

    expect(() => {
      return new Client(options)
    }).to.throw(Error, 'Cache partition name cannot be "admin", "local", or "config" when using MongoDB')
  })

  it('throws when using a reserved partition name (local)', () => {
    const options = {
      partition: 'local'
    }

    expect(() => {
      return new Client(options)
    }).to.throw(Error, 'Cache partition name cannot be "admin", "local", or "config" when using MongoDB')
  })

  describe('`getSettings()`', () => {
    it('parses the connection string (without database)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017',
        partition: 'unit-testing'
      }

      const client = new Client(options)
      const settings = client.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017/unit-testing')
    })

    it('parses the connection string (without database but with slash)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017/',
        partition: 'unit-testing'
      }

      const client = new Client(options)
      const settings = client.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017/unit-testing')
    })

    it('parses the connection string (with credentials)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const client = new Client(options)
      const settings = client.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017/unit-testing?maxPoolSize=5')
    })

    it('parses the connection string (without credentials)', () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/test?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const client = new Client(options)
      const settings = client.getSettings(options)

      expect(settings.uri).to.equal('mongodb://127.0.0.1:27017/unit-testing?maxPoolSize=5')
    })

    it('parses the connection string with replica set (with database)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/test',
        partition: 'unit-testing'
      }

      const client = new Client(options)
      const settings = client.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/unit-testing')
    })

    it('parses the connection string with replica set (without database)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017',
        partition: 'unit-testing'
      }

      const client = new Client(options)
      const settings = client.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/unit-testing')
    })

    it('parses the connection string with replica set (without database but with slash)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/',
        partition: 'unit-testing'
      }

      const client = new Client(options)
      const settings = client.getSettings(options)

      expect(settings.uri).to.equal('mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/unit-testing')
    })

    it('parses the connection string with replica set (without database but with slash and query params)', () => {
      const options = {
        uri: 'mongodb://bob:password@127.0.0.1:27017,127.0.0.2:27017,127.0.0.3:27017/?maxPoolSize=5&replicaSet=rs',
        partition: 'unit-testing'
      }

      const client = new Client(options)
      const settings = client.getSettings(options)

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
        const client = new Client(options)

        await client.start()

        expect(client.isConnected).to.be.true

        await client.stop()
      })

      describe('`isReady()`', () => {
        it('returns true', async () => {
          const options = {
            uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
            partition: 'unit-testing'
          }
          const client = new Client(options)

          await client.start()

          expect(client.isReady()).to.be.true

          await client.stop()
        })
      })
    })

    describe('Authentication is not valid', () => {
      it('throws', async () => {
        const options = {
          uri: 'mongodb://bob:password@127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }
        const client = new Client(options)

        try {
          await client.start()
        } catch ({ message }) {
          expect(message).to.equal('Authentication failed.')
        }

        await client.stop()
      })

      describe('`isReady()`', () => {
        it('returns false', async () => {
          const options = {
            uri: 'mongodb://bob:password@127.0.0.1:27017/?maxPoolSize=5',
            partition: 'unit-testing'
          }
          const client = new Client(options)

          try {
            await client.start()
          } catch ({ message }) {
            expect(client.isReady()).to.be.false
          }

          await client.stop()
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

        const client = new Client(options)

        expect(() => client.validateSegmentName('')).to.throw(Error, 'Empty string')
      })

      it('throws when the name has a null character', () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const client = new Client(options)

        expect(() => client.validateSegmentName('\0test')).to.throw(Error, 'Includes null character')
      })

      it('throws when the name starts with "system."', () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const client = new Client(options)

        expect(() => client.validateSegmentName('system.')).to.throw(Error, 'Begins with "system."')
      })

      it('throws when the name has a "$" character', () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const client = new Client(options)

        expect(() => client.validateSegmentName('te$t')).to.throw(Error, 'Contains "$"')
      })

      it('throws when the name is greater than one hundred characters', () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const client = new Client(options)

        expect(() => client.validateSegmentName('0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789')).to.throw(Error, 'Segment and partition name lengths exceeds 100 characters')
      })
    })

    describe('The name is valid', () => {
      it('returns null', () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const client = new Client(options)

        expect(client.validateSegmentName('valid')).to.be.null
      })
    })
  })

  describe('`getCollection()`', () => {
    it('throws when the connection is not started', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const client = new Client(options)

      try {
        await client.getCollection('test')
      } catch ({ message }) {
        expect(message).to.equal('Connection not ready')
      }
    })

    it('returns a collection', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }
      const client = new Client(options)

      await client.start()

      expect(await client.getCollection('test')).to.not.be.undefined

      await client.stop()
    })

    it('throws when there is an error getting the collection (`getCollection`)', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const client = new Client(options)
      await client.start()

      try {
        await client.getCollection('')
      } catch ({ message }) {
        expect(message).to.equal('Collection name missing')
      }

      await client.stop()
    })

    it('throws when there is an error getting the collection (`createIndex`)', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }
      const client = new Client(options)

      await client.start()

      client.db.collection = (item) => (
        Promise.resolve({
          createIndex: () => Promise.reject(new Error('`createIndex` error'))
        })
      )

      try {
        await client.getCollection('MockCollection')
      } catch ({ message }) {
        expect(message).to.equal('`createIndex` error')
      }

      await client.stop()
    })
  })

  describe('`get()`', () => {
    describe('Always', () => {
      it('throws when the connection is not started', async () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const client = new Client(options)

        try {
          await client.get('test')
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

        const client = new Client(options)
        client.isConnectionStarted = true
        client.isConnected = true

        client.collections.mockSegment = {
          findOne: (item) => Promise.reject(new Error('`findOne` error'))
        }

        try {
          await client.get(key)
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

        const client = new Client(options)
        client.isConnectionStarted = true
        client.isConnected = true

        client.collections.mockSegment = {
          findOne: (item) => Promise.resolve({ stored: null })
        }

        try {
          await client.get(key)
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

        const client = new Client(options)
        client.isConnectionStarted = true
        client.isConnected = false

        client.collections.mockSegment = {
          findOne: (item) => Promise.resolve({ value: false })
        }

        try {
          await client.get(key)
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

        const client = new Client(options)

        await client.start()
        await client.set(key, 'mock value', 200)
        const { item } = await client.get(key)

        expect(item).to.equal('mock value')

        await client.stop()
      })
    })

    describe('The key does not exist', () => {
      it('returns null', async () => {
        const options = {
          uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
          partition: 'unit-testing'
        }

        const client = new Client(options)

        await client.start()

        expect(await client.get({ id: 'does-not-exist', segment: 'mockSegment' })).to.be.null

        await client.stop()
      })
    })
  })

  describe('`set()`', () => {
    it('throws when the connection is not started', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const client = new Client(options)

      try {
        await client.set({ id: 'item', segment: 'mockSegment' }, 'test1', 3600)
      } catch ({ message }) {
        expect(message).to.equal('Connection not started')
      }
    })

    it('returns undefined', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const client = new Client(options)
      await client.start()

      expect(await client.set({ id: 'item', segment: 'mockSegment' }, 'test1', 3600)).to.be.undefined

      await client.stop()
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

      const client = new Client(options)
      client.isConnectionStarted = true
      client.isConnected = true

      client.getCollection = (item) => Promise.reject(new Error('`getCollection` error'))

      try {
        await client.set(key, true, 0)
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

      const client = new Client(options)
      client.isConnectionStarted = true
      client.isConnected = true

      client.getCollection = (item) => (
        Promise.resolve({
          updateOne: () => Promise.reject(new Error('`updateOne` error'))
        })
      )

      try {
        await client.set(key, true, 0)
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

      const client = new Client(options)

      try {
        await client.drop({ id: 'item', segment: 'mockSegment' })
      } catch ({ message }) {
        expect(message).to.equal('Connection not started')
      }
    })

    it('returns undefined', async () => {
      const options = {
        uri: 'mongodb://127.0.0.1:27017/?maxPoolSize=5',
        partition: 'unit-testing'
      }

      const client = new Client(options)

      await client.start()

      expect(await client.drop({ id: 'item', segment: 'mockSegment' })).to.be.undefined

      await client.stop()
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
      const client = new Client(options)
      client.isConnectionStarted = true
      client.isConnected = true

      client.getCollection = (item) => Promise.reject(new Error('`getCollection` error'))

      try {
        await client.drop(key)
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
      const client = new Client(options)
      client.isConnectionStarted = true

      client.getCollection = (item) => (
        Promise.resolve({
          deleteOne: (criteria, safe) => Promise.reject(new Error('`deleteOne` error'))
        })
      )

      try {
        await client.drop(key)
      } catch ({ message }) {
        expect(message).to.equal('`deleteOne` error')
      }
    })
  })
})
