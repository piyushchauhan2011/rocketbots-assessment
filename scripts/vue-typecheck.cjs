const path = require('node:path')

const compatibilityPackage = require.resolve('@typescript/typescript6/package.json')
const tscPath = require.resolve('@typescript/old/lib/tsc', {
  paths: [path.dirname(compatibilityPackage)],
})

require('vue-tsc').run(tscPath)
