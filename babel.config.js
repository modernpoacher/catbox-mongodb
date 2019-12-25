module.exports = {
  compact: true,
  comments: false,
  presets: [
    [
      '@babel/env', {
        useBuiltIns: 'entry',
        targets: {
          node: 'current'
        },
        corejs: 3
      }
    ]
  ],
  plugins: [
    [
      'module-resolver', {
        alias: {
          '@modernpoacher/catbox-mongodb': './src'
        }
      }
    ]
  ]
}
