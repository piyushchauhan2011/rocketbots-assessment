/** @typedef {string | number} NodeId */

/** @typedef {'trigger' | 'sendMessage' | 'addComment' | 'dateTime' | 'dateTimeConnector'} NodeKind */

/** @typedef {'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'} Weekday */

/**
 * @typedef {object} BusinessHourTime
 * @property {Weekday} day
 * @property {string} startTime
 * @property {string} endTime
 */

/**
 * @typedef {object} MessageTextPayload
 * @property {'text'} type
 * @property {string} text
 */

/**
 * @typedef {object} MessageAttachmentPayload
 * @property {'attachment'} type
 * @property {string} attachment
 */

/** @typedef {MessageTextPayload | MessageAttachmentPayload} MessagePayloadItem */

/**
 * @typedef {object} NodeRecordData
 * @property {string} [description]
 * @property {MessagePayloadItem[]} [payload]
 * @property {string} [comment]
 * @property {'success' | 'failure' | string} [connectorType]
 * @property {'businessHours' | string} [action]
 * @property {string} [timezone]
 * @property {NodeId[]} [connectors]
 * @property {BusinessHourTime[]} [times]
 * @property {string} [type]
 * @property {boolean} [oncePerContact]
 */

/**
 * @typedef {object} NodeRecord
 * @property {NodeId} id
 * @property {NodeId} parentId
 * @property {NodeKind} type
 * @property {string} [name]
 * @property {NodeRecordData} data
 */

/**
 * @typedef {object} Position
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {object} FlowNodeCommandMove
 * @property {'move'} kind
 * @property {string} nodeId
 * @property {Position} before
 * @property {Position} after
 */

/**
 * @typedef {object} FlowNodeCommandUpdate
 * @property {'update'} kind
 * @property {string} nodeId
 * @property {NodeRecord} beforeRecord
 * @property {NodeRecord} afterRecord
 */

/** @typedef {FlowNodeCommandMove | FlowNodeCommandUpdate} FlowNodeCommand */

export {}
