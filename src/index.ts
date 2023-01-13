import fetch from 'node-fetch'

import extractMetadata from './extract-metadata.js'

export default async function fetchSiteMetadata(url: string) {
  const controller = new AbortController()
  const response = await fetch(url, {
    signal: controller.signal
  })
  if (!response.body) { throw new Error('response.body') }
  const metadata = await extractMetadata(response.body)
  controller.abort()
  return metadata
}
