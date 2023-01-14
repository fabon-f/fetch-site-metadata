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
    const file = await readFile(join('./test/fixtures/', req.url))
    if (req.url.endsWith('.html')) {
      const rule = {
        '{{base}}': url
      } as Record<string, string>
      res.end(file.toString('utf-8').replace(/{{.*?}}/g, match => rule[match] ?? match))
    } else {
      res.end(file)
    }
    return
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

test('Website with OGP image', async t => {
  const expectedUrl = new URL('/ogp.png', url).toString()
  t.deepEqual((await fetchSiteMetadata(new URL('/1.html', url))).image, {
    src: expectedUrl,
    width: '1200',
    height: '630',
    alt: undefined
  })
  t.deepEqual((await fetchSiteMetadata(new URL('/2.html', url))).image, {
    src: expectedUrl,
    width: '600',
    height: '315',
    alt: 'alt text'
  })
  t.deepEqual((await fetchSiteMetadata(new URL('/3.html', url))).image, {
    src: expectedUrl,
    width: '1200',
    height: '630',
    alt: undefined
  })
})

test.after(() => {
  testServer.close()
  testServerWithoutFavicon.close()
})
