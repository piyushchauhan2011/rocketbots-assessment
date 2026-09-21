export type NodeId = string | number

export type NodeKind = 'trigger' | 'sendMessage' | 'addComment' | 'dateTime' | 'dateTimeConnector'

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface BusinessHourTime {
  day: Weekday
  startTime: string
  endTime: string
}

export interface MessageTextPayload {
  type: 'text'
  text: string
}

export interface MessageAttachmentPayload {
  type: 'attachment'
  attachment: string
}

export type MessagePayloadItem = MessageTextPayload | MessageAttachmentPayload

export interface NodeRecord {
  id: NodeId
  parentId: NodeId
  type: NodeKind
  name?: string
  data: {
    description?: string
    payload?: MessagePayloadItem[]
    comment?: string
    connectorType?: 'success' | 'failure' | string
    action?: 'businessHours' | string
    timezone?: string
    connectors?: NodeId[]
    times?: BusinessHourTime[]
    type?: string
    oncePerContact?: boolean
  }
}

export interface Position {
  x: number
  y: number
}

export interface FlowNodeCommandMove {
  kind: 'move'
  nodeId: string
  before: Position
  after: Position
}

export interface FlowNodeCommandUpdate {
  kind: 'update'
  nodeId: string
  beforeRecord: NodeRecord
  afterRecord: NodeRecord
}

export type FlowNodeCommand = FlowNodeCommandMove | FlowNodeCommandUpdate
