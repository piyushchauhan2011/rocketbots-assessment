import { Given, Then, When } from '@cucumber/cucumber'

/** @param {import('@cucumber/cucumber').IWorld & { flow?: import('../pages/FlowPage.js').FlowPage }} world */
function flow(world) {
  if (!world.flow) throw new Error('A browser must be selected before using the flow page')
  return world.flow
}

Given('I use a {string} browser', async function (device) {
  await this.useDevice(device)
})

Given('I open the canonical flow', async function () {
  await flow(this).open()
})

Given('I open the direct route {string}', async function (path) {
  await flow(this).open(path)
})

Then('the flow contains {int} nodes', async function (count) {
  await flow(this).expectNodeCount(count)
})

When('I open the {string} message node', async function (name) {
  await flow(this).openMessage(name)
})

Then('the details route is {string}', async function (path) {
  await flow(this).expectPath(path)
})

When('I change the title to {string}', async function (title) {
  await flow(this).fillTitle(title)
})

When('I clear the title', async function () {
  await flow(this).fillTitle('')
})

When('I change the first message to {string}', async function (message) {
  await flow(this).fillMessage(message)
})

When('I clear the first message', async function () {
  await flow(this).fillMessage('')
})

When('I clear the comment', async function () {
  await flow(this).fillComment('')
})

When('I upload the image fixture', async function () {
  await flow(this).uploadImage('tests/fixtures/upload.png')
})

When('I upload an unsupported file', async function () {
  await flow(this).uploadImage('package.json')
})

Then('the message contains {int} image attachments', async function (count) {
  await flow(this).expectAttachmentCount(count)
})

When('I save the node', async function () {
  await flow(this).save()
})

When('I save the node and reload the page', async function () {
  await flow(this).save()
  await flow(this).reload()
})

Then('the title is {string}', async function (title) {
  await flow(this).expectFieldValue('Title', title)
})

Then('the first message is {string}', async function (message) {
  await flow(this).expectFieldValue('Text item 1', message)
})

Then('the details drawer is visible', async function () {
  await flow(this).expectDrawerVisible()
})

When('I add a node after the trigger', async function () {
  await flow(this).addNodeAfterTrigger()
})

When('I submit the empty node form', async function () {
  await flow(this).submitCreateNode()
})

Then('the title and description are required', async function () {
  await flow(this).expectFieldInvalid('Title')
  await flow(this).expectTextVisible('Title is required')
  await flow(this).expectFieldInvalid('Description')
  await flow(this).expectTextVisible('Description is required')
})

When(
  'I enter the node title {string} and description {string}',
  async function (title, description) {
    await flow(this).fillTitle(title)
    await flow(this).fillDescription(description)
  },
)

When('I choose the {string} node type', async function (type) {
  await flow(this).chooseNodeType(type)
})

When('I create the node', async function () {
  await flow(this).submitCreateNode()
})

Then('the {string} editor is visible', async function (name) {
  await flow(this).expectTextVisible(name)
})

When('I choose {string} as the first end time', async function (time) {
  await flow(this).chooseFirstEndTime(time)
})

Then('the first business-hours range is invalid', async function () {
  await flow(this).expectFirstBusinessHoursRangeInvalid()
})

Then('saving is disabled', async function () {
  await flow(this).expectSaveDisabled()
})

Then('the {string} field is invalid', async function (label) {
  await flow(this).expectFieldInvalid(label)
})

Then('the exact error {string} is visible', async function (message) {
  await flow(this).expectTextVisible(message)
})

Then('the image upload is invalid', async function () {
  await flow(this).expectUploadInvalid()
})

When('I close the details drawer', async function () {
  await flow(this).closeDrawer()
})

Then('the flow route is restored', async function () {
  await flow(this).expectPath('/')
})

Then('the {string} button is enabled', async function (name) {
  await flow(this).expectButtonEnabled(name)
})

When('I click the {string} button', async function (name) {
  await flow(this).clickButton(name)
})

When('I keyboard-activate the {string} message node', async function (name) {
  await flow(this).activateMessageWithKeyboard(name)
})

Then('the deletion reconnection warning is visible', async function () {
  await flow(this).expectTextVisible(
    'Only this step is removed. Nodes below it stay connected to the step above.',
  )
})

When('I confirm deletion', async function () {
  await flow(this).confirmDelete()
})

Then('{string} is absent', async function (text) {
  await flow(this).expectTextAbsent(text)
})

Then('{string} is visible', async function (text) {
  await flow(this).expectTextVisible(text)
})
