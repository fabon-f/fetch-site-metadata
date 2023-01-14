import fetch from 'node-fetch'

import extractMetadata from './extract-metadata.js'

const fullUrl = (relativeUrl: string, baseUrl: string) => (
  new URL(relativeUrl, baseUrl).toString()
)

const defaultFavicon = async (baseUrl: string) => {
  const defaultFaviconUrl = new URL('/favicon.ico', baseUrl).toString()
  const response = await fetch(defaultFaviconUrl)
  return response.ok ? defaultFaviconUrl : undefined
}

export default async function fetchSiteMetadata(url: string | URL) {
  const urlString = typeof url === 'string' ? url : url.toString()
  const controller = new AbortController()
  const response = await fetch(urlString, {
    signal: controller.signal
  })
  if (!response.body) { throw new Error('response.body') }
  const metadata = await extractMetadata(response.body)
  controller.abort()

  const iconUrl = typeof metadata.icon === 'string' ? fullUrl(metadata.icon, urlString) : await defaultFavicon(urlString)

  return {
    ...metadata,
    icon: iconUrl,
    image: typeof metadata.image === 'string' ? fullUrl(metadata.image, urlString) : undefined,
  }
}
