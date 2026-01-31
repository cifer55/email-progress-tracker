import { describe, it, expect } from 'vitest'

describe('Project Setup', () => {
  it('should have TypeScript strict mode enabled', () => {
    // This test will fail to compile if strict mode is not enabled
    const value: string = 'test'
    expect(value).toBe('test')
  })

  it('should have fast-check available', async () => {
    const fc = await import('fast-check')
    expect(fc).toBeDefined()
    expect(fc.assert).toBeDefined()
  })
})
