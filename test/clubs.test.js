import assert from 'node:assert/strict'
import test from 'node:test'

import { clubLabel, validateRoster } from '../src/clubs.js'

const roster = [
  { id: 0, slug: 'boston-bruins', city: 'Boston', name: 'Bruins', crest: 'boston' },
  { id: 1, slug: 'toronto-maple-leafs', city: 'Toronto', name: 'Maple Leafs', crest: 'toronto' },
]

test('accepts a unique complete roster', () => {
  assert.equal(validateRoster(roster), roster)
  assert.equal(clubLabel(roster[0]), 'Boston Bruins')
})

test('rejects duplicate club identity', () => {
  assert.throws(() => validateRoster([roster[0], { ...roster[1], id: 0 }]), /invalid/)
  assert.throws(() => validateRoster([roster[0], { ...roster[1], slug: roster[0].slug }]), /invalid/)
})
