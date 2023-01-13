import fetch from 'node-fetch'

import extractMetadata from './extract-metadata.js'

const fullUrl = (relativeUrl: string, baseUrl: string) => (
  new URL(relativeUrl, baseUrl).toString()
)

export default async function fetchSiteMetadata(url: string) {
  const controller = new AbortController()
  const response = await fetch(url, {
    signal: controller.signal
  })
  if (!response.body) { throw new Error('response.body') }
  const metadata = await extractMetadata(response.body)
  controller.abort()

  return {
    ...metadata,
    icon: typeof metadata.icon === 'string' ? fullUrl(metadata.icon, url) : undefined,
    image: typeof metadata.image === 'string' ? fullUrl(metadata.image, url) : undefined,
  }
}
