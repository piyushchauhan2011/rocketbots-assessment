import { Given, Then, When } from '@cucumber/cucumber'

/** @typedef {import('../support/world.js').FlowWorld} FlowWorld */

/**
 * @param {import('@cucumber/cucumber').IWorld & { flow?: import('../pages/FlowPage.js').FlowPage | null }} world
 */
function flow(world) {
  if (!world.flow) throw new Error('A browser must be selected before using the flow page')
  return world.flow
}

/** @param {(this: FlowWorld) => Promise<void>} callback */
function step(callback) {
  return callback
}

/** @param {(this: FlowWorld, value: string) => Promise<void>} callback */
function stringStep(callback) {
  return callback
}

/** @param {(this: FlowWorld, value: 'desktop' | 'mobile') => Promise<void>} callback */
function deviceStep(callback) {
  return callback
}

/** @param {(this: FlowWorld, value: number) => Promise<void>} callback */
function numberStep(callback) {
  return callback
}

/** @param {(this: FlowWorld, first: string, second: string) => Promise<void>} callback */
function twoStringStep(callback) {
  return callback
}

Given(
  'I use a {string} browser',
  deviceStep(async function (device) {
    await this.useDevice(device)
  }),
)

Given(
  'I open the canonical flow',
  step(async function () {
    await flow(this).open()
  }),
)

Given(
  'I open the direct route {string}',
  stringStep(async function (path) {
    await flow(this).open(path)
  }),
)

Then(
  'the flow contains {int} nodes',
  numberStep(async function (count) {
    await flow(this).expectNodeCount(count)
  }),
)

When(
  'I open the {string} message node',
  stringStep(async function (name) {
    await flow(this).openMessage(name)
  }),
)

Then(
  'the details route is {string}',
  stringStep(async function (path) {
    await flow(this).expectPath(path)
  }),
)

When(
  'I change the title to {string}',
  stringStep(async function (title) {
    await flow(this).fillTitle(title)
  }),
)

When(
  'I clear the title',
  step(async function () {
    await flow(this).fillTitle('')
  }),
)

When(
  'I change the first message to {string}',
  stringStep(async function (message) {
    await flow(this).fillMessage(message)
  }),
)

When(
  'I clear the first message',
  step(async function () {
    await flow(this).fillMessage('')
  }),
)

When(
  'I clear the comment',
  step(async function () {
    await flow(this).fillComment('')
  }),
)

When(
  'I upload the image fixture',
  step(async function () {
    await flow(this).uploadImage('tests/fixtures/upload.png')
  }),
)

When(
  'I upload an unsupported file',
  step(async function () {
    await flow(this).uploadImage('package.json')
  }),
)

Then(
  'the message contains {int} image attachments',
  numberStep(async function (count) {
    await flow(this).expectAttachmentCount(count)
  }),
)

When(
  'I save the node',
  step(async function () {
    await flow(this).save()
  }),
)

When(
  'I save the node and reload the page',
  step(async function () {
    await flow(this).save()
    await flow(this).reload()
  }),
)

Then(
  'the title is {string}',
  stringStep(async function (title) {
    await flow(this).expectFieldValue('Title', title)
  }),
)

Then(
  'the first message is {string}',
  stringStep(async function (message) {
    await flow(this).expectFieldValue('Text item 1', message)
  }),
)

Then(
  'the details drawer is visible',
  step(async function () {
    await flow(this).expectDrawerVisible()
  }),
)

When(
  'I add a node after the trigger',
  step(async function () {
    await flow(this).addNodeAfterTrigger()
  }),
)

When(
  'I submit the empty node form',
  step(async function () {
    await flow(this).submitCreateNode()
  }),
)

Then(
  'the title and description are required',
  step(async function () {
    await flow(this).expectFieldInvalid('Title')
    await flow(this).expectTextVisible('Title is required')
    await flow(this).expectFieldInvalid('Description')
    await flow(this).expectTextVisible('Description is required')
  }),
)

When(
  'I enter the node title {string} and description {string}',
  twoStringStep(async function (title, description) {
    await flow(this).fillTitle(title)
    await flow(this).fillDescription(description)
  }),
)

When(
  'I choose the {string} node type',
  stringStep(async function (type) {
    await flow(this).chooseNodeType(type)
  }),
)

When(
  'I create the node',
  step(async function () {
    await flow(this).submitCreateNode()
  }),
)

Then(
  'the {string} editor is visible',
  stringStep(async function (name) {
    await flow(this).expectTextVisible(name)
  }),
)

When(
  'I choose {string} as the first end time',
  stringStep(async function (time) {
    await flow(this).chooseFirstEndTime(time)
  }),
)

Then(
  'the first business-hours range is invalid',
  step(async function () {
    await flow(this).expectFirstBusinessHoursRangeInvalid()
  }),
)

Then(
  'saving is disabled',
  step(async function () {
    await flow(this).expectSaveDisabled()
  }),
)

Then(
  'the {string} field is invalid',
  stringStep(async function (label) {
    await flow(this).expectFieldInvalid(label)
  }),
)

Then(
  'the exact error {string} is visible',
  stringStep(async function (message) {
    await flow(this).expectTextVisible(message)
  }),
)

Then(
  'the notification {string} is visible',
  stringStep(async function (message) {
    await flow(this).expectNotificationAboveDrawer(message)
  }),
)

Then(
  'the image upload is invalid',
  step(async function () {
    await flow(this).expectUploadInvalid()
  }),
)

When(
  'I close the details drawer',
  step(async function () {
    await flow(this).closeDrawer()
  }),
)

Then(
  'the flow route is restored',
  step(async function () {
    await flow(this).expectPath('/')
  }),
)

Then(
  'the {string} button is enabled',
  stringStep(async function (name) {
    await flow(this).expectButtonEnabled(name)
  }),
)

When(
  'I click the {string} button',
  stringStep(async function (name) {
    await flow(this).clickButton(name)
  }),
)

When(
  'I keyboard-activate the {string} message node',
  stringStep(async function (name) {
    await flow(this).activateMessageWithKeyboard(name)
  }),
)

Then(
  'the deletion reconnection warning is visible',
  step(async function () {
    await flow(this).expectTextVisible(
      'Only this step is removed. Nodes below it stay connected to the step above.',
    )
  }),
)

When(
  'I confirm deletion',
  step(async function () {
    await flow(this).confirmDelete()
  }),
)

Then(
  '{string} is absent',
  stringStep(async function (text) {
    await flow(this).expectTextAbsent(text)
  }),
)

Then(
  '{string} is visible',
  stringStep(async function (text) {
    await flow(this).expectTextVisible(text)
  }),
)
