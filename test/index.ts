import test from 'ava'
import listen from 'test-listen'
import { createServer } from 'node:http'
import fetchSiteMetadata from '../src/index.js'

const testServer = createServer(async (req, res) => {
  if (req.url === undefined) { throw new Error('req.url is undefined') }
  if (req.url === '/slow') {
    res.write('<title>title</title><div>')
    await new Promise(resolve => setTimeout(resolve, 5000))
    res.end('</div></html>')
    return
  }
  res.end('')
})

const url = await listen(testServer)

test('Interrupt request when <body> starts', async t => {
  t.timeout(300)
  const res = await fetchSiteMetadata(new URL('/slow', url).toString())
  t.deepEqual(res, {
    title: 'title',
    description: undefined,
    icon: undefined,
    image: undefined
  })
})

test.after(() => {
  testServer.close()
})
