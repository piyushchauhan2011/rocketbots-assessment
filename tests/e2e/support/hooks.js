import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

import { After, AfterAll, BeforeAll, setDefaultTimeout, Status } from '@cucumber/cucumber'
import { chromium } from '@playwright/test'

const baseUrl = 'http://127.0.0.1:4174'
let browser
let server
let serverOutput = ''

setDefaultTimeout(30_000)
async function waitForServer(attempt = 0) {
  if (server?.exitCode !== null) {
    throw new Error(`Vite exited before becoming ready.\n${serverOutput}`)
  }
  try {
    const response = await fetch(baseUrl)
    if (response.ok) return
  } catch {
    // The server is still starting.
  }
  if (attempt === 99) throw new Error(`Vite did not become ready.\n${serverOutput}`)
  await delay(100)
  await waitForServer(attempt + 1)
}

BeforeAll(async () => {
  server = spawn(
    'pnpm',
    ['exec', 'vite', '--host', '127.0.0.1', '--port', '4174', '--strictPort'],
    {
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  server.stdout?.on('data', (chunk) => {
    serverOutput += String(chunk)
  })
  server.stderr?.on('data', (chunk) => {
    serverOutput += String(chunk)
  })

  await waitForServer()

  browser = await chromium.launch()
})

After(async function ({ result }) {
  if (result?.status === Status.FAILED && this.page) {
    await this.attach(await this.page.screenshot({ fullPage: true }), 'image/png')
  }
  await this.dispose()
})

AfterAll(async () => {
  await browser?.close()
  if (!server || server.exitCode !== null || !server.pid) return

  if (process.platform === 'win32') server.kill('SIGTERM')
  else process.kill(-server.pid, 'SIGTERM')
})

export function getBrowser() {
  if (!browser) throw new Error('Playwright browser has not started')
  return browser
}

export { baseUrl }
