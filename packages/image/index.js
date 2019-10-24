'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/image.cjs.prod.js')
} else {
  module.exports = require('./dist/image.cjs.js')
}
