import { readFile } from 'node:fs/promises'

const { version } = JSON.parse(await readFile('package.json', 'utf8'))
let changelog
try {
  changelog = await readFile('CHANGELOG.md', 'utf8')
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  console.log('No changelog yet; waiting for the first version PR.')
  process.exit(0)
}

const sections = changelog.split(/^## /m)
const section = sections.find((entry) => entry.split('\n', 1)[0].trim() === version)
if (!section) throw new Error(`CHANGELOG.md has no release notes for ${version}`)
const notes = section.slice(section.indexOf('\n') + 1).trim()
if (!notes) throw new Error(`Release notes for ${version} are empty`)

const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA } = process.env
if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !GITHUB_SHA) {
  throw new Error('GITHUB_TOKEN, GITHUB_REPOSITORY, and GITHUB_SHA are required')
}
const api = process.env.GITHUB_API_URL || 'https://api.github.com'
const url = `${api}/repos/${GITHUB_REPOSITORY}/releases`
const headers = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}
const tag = `v${version}`
const existing = await fetch(`${url}/tags/${tag}`, { headers })
if (existing.ok) {
  console.log(`Release ${tag} already exists; nothing to publish.`)
  process.exit(0)
}
if (existing.status !== 404) {
  throw new Error(`Checking release ${tag} failed (${existing.status}): ${await existing.text()}`)
}

const response = await fetch(url, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tag_name: tag,
    target_commitish: GITHUB_SHA,
    name: tag,
    body: notes,
    draft: false,
    prerelease: false,
  }),
})
if (!response.ok) {
  throw new Error(`Creating release ${tag} failed (${response.status}): ${await response.text()}`)
}
console.log(`Created release ${(await response.json()).html_url}`)
