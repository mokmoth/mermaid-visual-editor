import { describe, expect, it } from 'vitest'
import { hashPassword, hashPasswordLegacy, verifyPassword } from './storage'

describe('password hashing', () => {
  it('produces a sha256 prefixed hash', async () => {
    const hash = await hashPassword('test1234')
    expect(hash.startsWith('sha256$')).toBe(true)
    expect(hash.length).toBeGreaterThan(20)
  })

  it('verifies a matching password', async () => {
    const hash = await hashPassword('secret')
    expect(await verifyPassword('secret', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('still accepts the legacy djb2 hash so old local accounts can log in', async () => {
    const legacy = hashPasswordLegacy('oldpass')
    expect(legacy.startsWith('sha256$')).toBe(false)
    expect(await verifyPassword('oldpass', legacy)).toBe(true)
    expect(await verifyPassword('nope', legacy)).toBe(false)
  })
})

