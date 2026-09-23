import { readFileSync } from 'node:fs'

import { setWorldConstructor, World } from '@cucumber/cucumber'
import { devices } from '@playwright/test'

import { FlowPage } from '../pages/FlowPage.js'
import { baseUrl, getBrowser } from './hooks.js'

const payload = JSON.parse(
  readFileSync(new URL('../../fixtures/payload.json', import.meta.url), 'utf8'),
)

export class FlowWorld extends World {
  context = null
  page = null
  flow = null

  async useDevice(deviceName) {
    const device =
      deviceName === 'mobile'
        ? devices['Pixel 7']
        : { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }

    this.context = await getBrowser().newContext(device)
    await this.context.addInitScript(() => {
      if (sessionStorage.getItem('flow-test-initialized')) return
      localStorage.removeItem('rocketbots-flow:v1')
      localStorage.removeItem('rocketbots-flow-positions:v1')
      localStorage.removeItem('rocketbots-flow-positions:v2')
      sessionStorage.setItem('flow-test-initialized', 'true')
    })
    this.page = await this.context.newPage()
    await this.page.route('**/api/payload', (route) => route.fulfill({ json: payload }))
    this.flow = new FlowPage(this.page, baseUrl)
  }

  async dispose() {
    await this.context?.close()
    this.context = null
    this.page = null
    this.flow = null
  }
}

setWorldConstructor(FlowWorld)
