import test from 'ava'
import fetchSiteMetadata from '../src/index.js'

test('fn() doesn\'t throw error', t => {
	t.notThrows(() => fetchSiteMetadata())
})
