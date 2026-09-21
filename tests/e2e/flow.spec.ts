import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

const payload = JSON.parse(
  readFileSync(new URL('../fixtures/payload.json', import.meta.url), 'utf8'),
)
const remote = '**/api/payload'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('flow-test-initialized')) return
    localStorage.removeItem('rocketbots-flow:v1')
    localStorage.removeItem('rocketbots-flow-positions:v1')
    localStorage.removeItem('rocketbots-flow-positions:v2')
    sessionStorage.setItem('flow-test-initialized', 'true')
  })
  await page.route(remote, (route) => route.fulfill({ json: payload }))
})

test('loads, edits, uploads, persists, and directly opens a message', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.flow-node')).toHaveCount(7)
  await page.getByRole('button', { name: 'Send Message: Welcome Message' }).click()
  await expect(page).toHaveURL('/nodes/b0653a')
  await page.getByLabel('Title').fill('Welcome Updated')
  await page.getByLabel('Text item 1').fill('Updated greeting')
  await page.getByLabel('Add image').setInputFiles('tests/fixtures/upload.png')
  await expect(page.locator('.attachment img')).toHaveCount(2)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.reload()
  await expect(page.getByLabel('Title')).toHaveValue('Welcome Updated')
  await expect(page.getByLabel('Text item 1')).toHaveValue('Updated greeting')
  await expect(page.locator('.sheet')).toBeVisible()
})

test('creates and validates business hours with generated connectors', async ({ page }) => {
  await page.goto('/')
  const triggerNode = page.locator('.flow-node-shell').first()
  await triggerNode.getByRole('button', { name: 'Add node' }).click()
  await triggerNode.getByRole('button', { name: 'Add Business Hours node' }).click()
  await expect(page.locator('.flow-node')).toHaveCount(10)
  await expect(page.getByText('Business Hours', { exact: true }).last()).toBeVisible()
  await page.getByLabel('End', { exact: true }).first().fill('09:00')
  await expect(page.getByText('Start time must be earlier than end time')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await page.getByLabel('End', { exact: true }).first().fill('18:00')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
})

test('uses undo redo, deletes a subtree, and supports keyboard activation', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.flow-node')).toHaveCount(7)
  await page.getByRole('button', { name: 'Send Message: Welcome Message' }).click()
  await page.getByLabel('Title').fill('History change')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByRole('button', { name: 'Close details' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled()
  const away = page.getByRole('button', { name: 'Send Message: Away Message' })
  await away.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/nodes/b6a0c1')
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('This also deletes 1 descendant.')).toBeVisible()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Away Message', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Add Comment #1', { exact: true })).toHaveCount(0)
  await page.goto('/nodes/161f52')
  await expect(page).toHaveURL('/')
})
