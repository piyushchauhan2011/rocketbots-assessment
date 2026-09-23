import { expect } from '@playwright/test'

export class FlowPage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {string} baseUrl
   */
  constructor(page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async open(path = '/') {
    await this.page.goto(new URL(path, this.baseUrl).href)
  }

  async reload() {
    await this.page.reload()
  }

  async expectPath(path) {
    await expect(this.page).toHaveURL(new URL(path, this.baseUrl).href)
  }

  async expectNodeCount(count) {
    await expect(this.page.locator('.flow-node')).toHaveCount(count)
  }

  async openMessage(name) {
    await this.page.getByRole('button', { name: `Send Message: ${name}` }).click()
  }

  async expectDrawerVisible() {
    await expect(this.page.locator('.sheet')).toBeVisible()
  }

  async fillTitle(value) {
    await this.page.getByLabel('Title').fill(value)
  }

  async fillDescription(value) {
    await this.page.getByLabel('Description').fill(value)
  }

  async fillMessage(value) {
    await this.page.getByLabel('Text item 1').fill(value)
  }

  async fillComment(value) {
    await this.page.getByRole('textbox', { name: 'Comment', exact: true }).fill(value)
  }

  async uploadImage(path) {
    await this.page.getByLabel('Add image').setInputFiles(path)
  }

  async expectAttachmentCount(count) {
    await expect(this.page.locator('.attachment img')).toHaveCount(count)
  }

  async save() {
    await this.page.getByRole('button', { name: 'Save changes' }).click()
  }

  async closeDrawer() {
    await this.page.getByRole('button', { name: 'Close details' }).click()
  }
  async expectFieldValue(label, value) {
    await expect(this.page.getByLabel(label)).toHaveValue(value)
  }

  async expectFieldInvalid(label) {
    await expect(this.page.getByLabel(label, { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  }

  async expectTextVisible(text) {
    await expect(this.page.getByText(text, { exact: true }).last()).toBeVisible()
  }

  async expectTextAbsent(text) {
    await expect(this.page.getByText(text, { exact: true })).toHaveCount(0)
  }

  async addNodeAfterTrigger() {
    await this.page
      .locator('.flow-node-shell')
      .first()
      .getByRole('button', { name: 'Add node' })
      .click()
  }

  async submitCreateNode() {
    await this.page.getByRole('button', { name: 'Create node' }).click()
  }

  async chooseNodeType(type) {
    await this.page.getByRole('combobox', { name: 'Type of node' }).click()
    await this.page.getByRole('option', { name: type }).click()
  }

  async chooseFirstEndTime(time) {
    await this.page.getByRole('combobox', { name: /^End:/ }).first().click()
    await this.page
      .getByRole('listbox', { name: 'End times' })
      .getByRole('option', { name: time })
      .click()
  }

  async expectFirstBusinessHoursRangeInvalid() {
    await expect(this.page.getByRole('combobox', { name: /^Start:/ }).first()).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(this.page.getByRole('combobox', { name: /^End:/ }).first()).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await this.expectTextVisible('Start time must be earlier than end time')
  }

  async expectSaveDisabled() {
    await expect(this.page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  }

  async expectUploadInvalid() {
    await expect(this.page.getByLabel('Add image')).toHaveAttribute('aria-invalid', 'true')
  }

  async expectButtonEnabled(name) {
    await expect(this.page.getByRole('button', { name })).toBeEnabled()
  }

  async clickButton(name) {
    await this.page.getByRole('button', { name }).click()
  }

  async activateMessageWithKeyboard(name) {
    const node = this.page.getByRole('button', { name: `Send Message: ${name}` })
    await node.focus()
    await this.page.keyboard.press('Enter')
  }

  async confirmDelete() {
    await this.page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  }
}
