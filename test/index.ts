import test from 'ava'
import { listen } from 'async-listen'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { setTimeout as setTimeoutPromise } from 'node:timers/promises'
import fetchSiteMetadata from '../src/index.js'

const wait = (time: number, signal: AbortSignal) => {
  return setTimeoutPromise(time, null, { signal }).catch(_ => null)
}

const controllers: AbortController[] = []

const testServer = createServer(async (req, res) => {
  if (req.url === undefined) { throw new Error('req.url is undefined') }
  if (req.url === '/slow') {
    const controller = new AbortController()
    controllers.push(controller)
    res.write('<title>title</title><div>')
    await wait(5000, controller.signal)
    res.end('</div></html>')
    return
  }
  if (req.url === '/header-test') {
    if (req.headers['test'] === 'true') {
      res.end('<title>title</title>')
    } else {
      res.end('<title>error</title>')
    }
    return
  }
  if (req.url === '/utf8-stream') {
    res.write('<title>あい')
    res.write(Uint8Array.from([227]))
    await new Promise(resolve => setTimeout(resolve, 100))
    res.write(Uint8Array.from([129, 134]))
    res.end('</title>')
    return
  }
  try {
    const file = await readFile(join('./test/fixtures/', req.url))
    if (req.url.endsWith('.html')) {
      const rule = {
        '{{base}}': url.origin
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

test('Normalize URLs', async t => {
  const res = await fetchSiteMetadata(new URL('/3.html', url))
  t.deepEqual(res, {
    title: 'title',
    description: undefined,
    icon: new URL('/favicon2.ico', url).toString(),
    image: {
      src: new URL('/ogp.png', url).toString(),
      width: '1200',
      height: '630',
      alt: undefined
    }
  })

  const res2 = await fetchSiteMetadata(new URL('/3.html', url), {
    suppressAdditionalRequest: true
  })
  t.is(res2.icon, new URL('/favicon2.ico', url).toString())
  t.not(res2.image, undefined)
  t.is(res2.image!.src, new URL('/ogp.png', url).toString())
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

test('Decode HTML entities', async t => {
  const res = await fetchSiteMetadata(new URL('/4.html', url))
  t.is(res.title, '&quot;Oh my god&quot; - he said.')
  t.is(res.description, '&quot;Oh my god&quot; - he said.')
})

test('suppressAdditionalRequest option', async t => {
  const res = await fetchSiteMetadata(new URL('/1.html', url), {
    suppressAdditionalRequest: true
  })
  t.deepEqual(res.image, {
    src: new URL('/ogp.png', url).toString(),
    width: undefined,
    height: undefined,
    alt: undefined
  })
  const res2 = await fetchSiteMetadata(new URL('/3.html', url), {
    suppressAdditionalRequest: true
  })
  t.deepEqual(res2.image, {
    src: new URL('/ogp.png', url).toString(),
    width: undefined,
    height: undefined,
    alt: undefined
  })

  const res3 = await fetchSiteMetadata(siteWithoutFavicon, {
    suppressAdditionalRequest: true
  })
  // Actually `${siteWithoutFavicon}/favicon.ico` doesn't exist though
  t.is(res3.icon, new URL('favicon.ico', siteWithoutFavicon).toString())
})

test('Deprecated icon rel', async t => {
  const res = await fetchSiteMetadata(new URL('/4.html', url))
  t.is(res.icon, new URL('/favicon2.ico', url).toString());
})

test('Passing fetch options', async t => {
  const res = await fetchSiteMetadata(new URL('/header-test', url), {
    headers: { 'test': 'true' }
  })
  t.is(res.title, 'title')
})

test('Chunks which are invalid in UTF-8', async t => {
  const res = await fetchSiteMetadata(new URL('/utf8-stream', url))
  t.is(res.title, 'あいう')
})

test.after(() => {
  testServer.close()
  testServerWithoutFavicon.close()
  for (const controller of controllers) {
    controller.abort()
  }
})
