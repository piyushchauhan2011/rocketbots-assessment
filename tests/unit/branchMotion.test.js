import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MOTION_MS,
  advanceBranchMotions,
  createBranchMotion,
  paintBranch,
  releaseSettledPositions,
} from '@/features/flow/lib/branchMotion'

/** @type {Record<string, { x: number, y: number }>} */
let overlay

beforeEach(() => {
  overlay = {}
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
})

describe('branch motion', () => {
  it('eases a slide from its origin to the stored coordinate', () => {
    const motion = { from: { x: 0, y: 0 }, to: { x: 80, y: 40 }, started: 0 }
    paintBranch(overlay, 'node', motion, 0)
    expect(overlay.node).toEqual({ x: 0, y: 0 })

    paintBranch(overlay, 'node', motion, 0.5)
    expect(overlay.node).toEqual({ x: 70, y: 35 })

    paintBranch(overlay, 'node', motion, 1)
    expect(overlay.node).toEqual({ x: 80, y: 40 })
  })

  it('snaps an early sample and skips the node being dragged', () => {
    const motions = new Map([
      ['drag', { from: { x: 0, y: 0 }, to: { x: 10, y: 0 }, started: 20 }],
      ['slide', { from: { x: 0, y: 0 }, to: { x: 16, y: 0 }, started: 20 }],
    ])

    expect(advanceBranchMotions(overlay, motions, 0, 'drag')).toBe(false)
    expect(overlay).toEqual({ drag: { x: 10, y: 0 }, slide: { x: 16, y: 0 } })
    expect(motions.size).toBe(0)
  })

  it('finishes immediately when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const motions = new Map([['slide', { from: { x: 0, y: 8 }, to: { x: 0, y: 40 }, started: 0 }]])

    expect(advanceBranchMotions(overlay, motions, MOTION_MS / 2, '')).toBe(false)
    expect(overlay.slide).toEqual({ x: 0, y: 40 })
  })

  it('drops finished overrides and coordinates for nodes that left the canvas', () => {
    overlay = { kept: { x: 1, y: 1 }, gone: { x: 9, y: 9 }, moving: { x: 0, y: 0 } }
    releaseSettledPositions(
      overlay,
      { kept: { x: 1, y: 1 }, moving: { x: 4, y: 4 } },
      new Set(['moving']),
      '',
    )
    expect(overlay).toEqual({ moving: { x: 0, y: 0 } })

    const motion = createBranchMotion(overlay, {
      draggingNodeId: () => '',
      findNode: () => undefined,
    })
    motion.prune(['moving'])
    expect(overlay).toEqual({ moving: { x: 0, y: 0 } })
    motion.prune([])
    expect(overlay).toEqual({})
  })

  it('clears the overlay once a stored move has finished sliding', () => {
    vi.stubGlobal('requestAnimationFrame', (callback) => callback(0))
    const motion = createBranchMotion(overlay, {
      draggingNodeId: () => 'dragged',
      findNode: (nodeId) => (nodeId === 'node' ? { position: { x: 0, y: 0 } } : undefined),
    })

    motion.sync({ node: { x: 32, y: 48 }, dragged: { x: 4, y: 4 } })

    expect(overlay).toEqual({})
  })
})
