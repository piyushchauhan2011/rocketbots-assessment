import { afterEach, beforeEach } from 'vitest'

beforeEach(() => localStorage.clear())
afterEach(() => document.body.replaceChildren())
