const debug = require('debug')

const log = debug('@modernpoacher/catbox-mongodb')

const {
  env: {
    DEBUG = '@modernpoacher/catbox-mongodb',
    NODE_ENV = 'development'
  }
} = process

debug.enable(DEBUG)

const presets = [
  [
    '@babel/env', {
      useBuiltIns: 'entry',
      targets: {
        node: 'current'
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

function using () {
  log({ NODE_ENV })

  return NODE_ENV === 'production'
}

module.exports = (api) => {
  if (api) api.cache.using(using)

  return {
    compact: true,
    comments: false,
    presets,
    plugins
  }
}
