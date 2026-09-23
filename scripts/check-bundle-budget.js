import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

/** @typedef {{ file: string, imports?: string[], css?: string[] }} ManifestChunk */
/** @typedef {Record<string, ManifestChunk>} Manifest */
/** @typedef {{ rawKiB: number, gzipKiB: number }} BudgetLimit */
/** @typedef {{ initialEntries: string[], limits: Record<string, BudgetLimit> }} BudgetConfig */
/** @typedef {{ raw: number, gzip: number }} Size */

const metricLabels = {
  initialJavaScript: 'Initial JavaScript',
  totalJavaScript: 'Total JavaScript',
  largestJavaScriptChunk: 'Largest JavaScript chunk',
  totalStyles: 'Total styles',
}

function option(name, fallback) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1]
}

/** @param {string} filePath @returns {Size} */
function measureFile(filePath) {
  const content = readFileSync(filePath)
  return { raw: content.byteLength, gzip: gzipSync(content, { level: 9 }).byteLength }
}

/** @param {string[]} filePaths @returns {Size} */
function measureTotal(filePaths) {
  return filePaths.reduce(
    (total, filePath) => {
      const size = measureFile(filePath)
      return { raw: total.raw + size.raw, gzip: total.gzip + size.gzip }
    },
    { raw: 0, gzip: 0 },
  )
}

/** @param {string} directory @param {string} extension @returns {string[]} */
function findFiles(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    return entry.isDirectory()
      ? findFiles(entryPath, extension)
      : entry.name.endsWith(extension)
        ? [entryPath]
        : []
  })
}

/**
 * @param {Manifest} manifest
 * @param {string[]} entryKeys
 * @returns {{ javascript: Set<string>, styles: Set<string> }}
 */
function collectInitialFiles(manifest, entryKeys) {
  const visited = new Set()
  const javascript = new Set()
  const styles = new Set()

  /** @param {string} key */
  function visit(key) {
    if (visited.has(key)) return
    const chunk = manifest[key]
    if (!chunk) throw new Error(`Initial bundle entry "${key}" is missing from the Vite manifest`)

    visited.add(key)
    if (chunk.file.endsWith('.js')) javascript.add(chunk.file)
    for (const cssFile of chunk.css || []) styles.add(cssFile)
    for (const importedKey of chunk.imports || []) visit(importedKey)
  }

  for (const entryKey of entryKeys) visit(entryKey)
  return { javascript, styles }
}

/** @param {BudgetConfig} config */
function validateConfig(config) {
  if (!Array.isArray(config.initialEntries) || config.initialEntries.length === 0) {
    throw new Error('bundle-budgets.json must define at least one initialEntries item')
  }
  for (const metric of Object.keys(metricLabels)) {
    const limit = config.limits?.[metric]
    if (!limit || limit.rawKiB <= 0 || limit.gzipKiB <= 0) {
      throw new Error(`Bundle budget "${metric}" must define positive rawKiB and gzipKiB limits`)
    }
  }
}

/** @param {number} bytes */
function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`
}

/** @param {Size} size @param {BudgetLimit} limit */
function violations(size, limit) {
  const failures = []
  const rawLimit = limit.rawKiB * 1024
  const gzipLimit = limit.gzipKiB * 1024
  if (size.raw > rawLimit) failures.push(`raw ${formatKiB(size.raw)} > ${limit.rawKiB} KiB`)
  if (size.gzip > gzipLimit) failures.push(`gzip ${formatKiB(size.gzip)} > ${limit.gzipKiB} KiB`)
  return failures
}

function main() {
  const distDirectory = path.resolve(option('--dist', 'dist'))
  const configPath = path.resolve(option('--config', 'bundle-budgets.json'))
  const manifestPath = path.join(distDirectory, '.vite', 'manifest.json')
  const config = /** @type {BudgetConfig} */ (JSON.parse(readFileSync(configPath, 'utf8')))
  const manifest = /** @type {Manifest} */ (JSON.parse(readFileSync(manifestPath, 'utf8')))
  validateConfig(config)

  const initial = collectInitialFiles(manifest, config.initialEntries)
  const initialJavaScript = [...initial.javascript].map((file) => path.join(distDirectory, file))
  const allJavaScript = findFiles(path.join(distDirectory, 'assets'), '.js')
  const allStyles = findFiles(path.join(distDirectory, 'assets'), '.css')
  const chunkSizes = allJavaScript.map(measureFile)
  const metrics = {
    initialJavaScript: measureTotal(initialJavaScript),
    totalJavaScript: measureTotal(allJavaScript),
    largestJavaScriptChunk: {
      raw: Math.max(...chunkSizes.map((size) => size.raw)),
      gzip: Math.max(...chunkSizes.map((size) => size.gzip)),
    },
    totalStyles: measureTotal(allStyles),
  }

  const failures = []
  console.log('\nBundle budget report')
  for (const [metric, label] of Object.entries(metricLabels)) {
    const size = metrics[metric]
    const limit = config.limits[metric]
    const metricFailures = violations(size, limit)
    const status = metricFailures.length === 0 ? 'PASS' : 'FAIL'
    console.log(
      `${status.padEnd(4)}  ${label.padEnd(26)} ${formatKiB(size.raw).padStart(11)} raw / ${formatKiB(size.gzip).padStart(11)} gzip`,
    )
    failures.push(...metricFailures.map((failure) => `${label}: ${failure}`))
  }

  if (failures.length > 0) {
    console.error('\nBundle budgets exceeded:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }
  console.log('\nAll bundle budgets passed.')
}

try {
  main()
} catch (error) {
  console.error(`Bundle budget check failed: ${error instanceof Error ? error.message : error}`)
  process.exitCode = 1
}
