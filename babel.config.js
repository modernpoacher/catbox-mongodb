const debug = require('debug')

const log = debug('@modernpoacher/catbox-mongodb')

const {
  env: {
    DEBUG = '@modernpoacher/catbox-mongodb',
    NODE_ENV = 'development'
  }
} = process

debug.enable(DEBUG)

log('`@modernpoacher/catbox-mongodb` is awake')

function env () {
  log({ NODE_ENV })

  return (
    NODE_ENV === 'production'
  )
}

const presets = [
  [
    '@babel/env', {
      useBuiltIns: 'entry',
      targets: {
        node: '12.18.1'
      },
      corejs: 3
    }
  ]
]

const plugins = [
  [
    'module-resolver', {
      alias: {
        '@modernpoacher/catbox-mongodb': './src'
      }
    }
  ]
]

module.exports = (api) => {
  if (api) api.cache.using(env)

  return {
    compact: true,
    comments: false,
    presets,
    plugins
  }
}
