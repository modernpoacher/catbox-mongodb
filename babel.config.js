const debug = require('debug')

const log = debug('@modernpoacher/catbox-mongodb')

const {
  env: {
    NODE_ENV = 'development'
  }
} = process

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
      targets: {
        node: '12.19.0'
      },
      useBuiltIns: 'usage',
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
