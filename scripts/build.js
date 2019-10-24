const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const execa = require('execa')
const { gzipSync } = require('zlib')
const { compress } = require('brotli')
const { targets: allTargets, fuzzyMatchTarget } = require('./utils')

const args = require('minimist')(process.argv.slice(2))
const targets = args._
const formats = args.formats || args.f
const devOnly = args.devOnly || args.d
const prodOnly = !devOnly && (args.prodOnly || args.p)
const buildAllMatching = args.all || args.a
const commit = execa.sync('git', ['rev-parse', 'HEAD']).stdout.slice(0, 7)

;(async () => {
    if (!targets.length) {
      await buildAll(allTargets)
      checkAllSizes(allTargets)
    } else {
      await buildAll(fuzzyMatchTarget(targets, buildAllMatching))
      checkAllSizes(fuzzyMatchTarget(targets, buildAllMatching))
    }
})()

async function buildAll(targets) {
    for (const target of targets) {
      await build(target)
    }
}

async function build(target) {
    const pkgDir = path.resolve(`packages/${target}`)
    const pkg = require(`${pkgDir}/package.json`)
  
    await fs.remove(`${pkgDir}/dist`)
  
    const env =
      (pkg.buildOptions && pkg.buildOptions.env) ||
      (devOnly ? 'development' : 'production')
  
    await execa(
      'rollup',
      [
        '-c',
        '--environment',
        [
          `COMMIT:${commit}`,
          `NODE_ENV:${env}`,
          `TARGET:${target}`,
          formats ? `FORMATS:${formats}` : ``,
          args.types ? `TYPES:true` : ``,
          prodOnly ? `PROD_ONLY:true` : ``
        ]
          .filter(_ => _)
          .join(',')
      ],
      { stdio: 'inherit' }
    )
}

function checkAllSizes(targets) {
    console.log()
    for (const target of targets) {
      checkSize(target)
    }
    console.log()
}
  
function checkSize(target) {
    const pkgDir = path.resolve(`packages/${target}`)
    const esmProdBuild = `${pkgDir}/dist/${target}.esm-browser.prod.js`
    if (fs.existsSync(esmProdBuild)) {
      const file = fs.readFileSync(esmProdBuild)
      const minSize = (file.length / 1024).toFixed(2) + 'kb'
      const gzipped = gzipSync(file)
      const gzippedSize = (gzipped.length / 1024).toFixed(2) + 'kb'
      const compressed = compress(file)
      const compressedSize = (compressed.length / 1024).toFixed(2) + 'kb'
      console.log(
        `${chalk.gray(
          chalk.bold(target)
        )} min:${minSize} / gzip:${gzippedSize} / brotli:${compressedSize}`
      )
    }
}
