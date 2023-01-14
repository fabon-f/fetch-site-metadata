import test from 'ava'
import listen from 'test-listen'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import fetchSiteMetadata from '../src/index.js'

const testServer = createServer(async (req, res) => {
  if (req.url === undefined) { throw new Error('req.url is undefined') }
  if (req.url === '/slow') {
    res.write('<title>title</title><div>')
    await new Promise(resolve => setTimeout(resolve, 5000))
    res.end('</div></html>')
    return
  }
  try {
    res.end(await readFile(join('./test/fixtures/', req.url)))
  } catch {}

  res.statusCode = 404
  res.end('')
})

const testServerWithoutFavicon = createServer((req, res) => {
  if (req.url === undefined) { throw new Error('req.url is undefined') }
  if (req.url === '/') {
    res.end('!<DOCTYPE html><html><head><title>title</title></head><body></body></html>')
    return
  }
  res.statusCode = 404
  res.end('')
})

const url = await listen(testServer)
const siteWithoutFavicon = await listen(testServerWithoutFavicon)

test('Interrupt request when <body> starts', async t => {
  t.timeout(300)
  const res = await fetchSiteMetadata(new URL('/slow', url))
  t.deepEqual(res, {
    title: 'title',
    description: undefined,
    icon: new URL('/favicon.ico', url).toString(),
    image: undefined
  })
})

test('Website without favicon', async t => {
  const res = await fetchSiteMetadata(siteWithoutFavicon)
  t.is(res.icon, undefined)
})

test.after(() => {
  testServer.close()
  testServerWithoutFavicon.close()
})
