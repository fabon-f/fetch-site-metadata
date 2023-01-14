import fetch from 'node-fetch'
import imageSize from 'probe-image-size'

import extractMetadata from './extract-metadata.js'
import type { ImageInfo } from './extract-metadata.js'

const fullUrl = (relativeUrl: string, baseUrl: string) => (
  new URL(relativeUrl, baseUrl).toString()
)

const defaultFavicon = async (baseUrl: string) => {
  const defaultFaviconUrl = new URL('/favicon.ico', baseUrl).toString()
  const response = await fetch(defaultFaviconUrl)
  return response.ok ? defaultFaviconUrl : undefined
}

const fetchImageInfo = async (info: ImageInfo) => {
  const intRegex = /0|[1-9][0-9]*/
  if (info.width !== undefined && info.height !== undefined && intRegex.test(info.width) && intRegex.test(info.height)) {
    return {
      src: info.src,
      width: info.width,
      height: info.height,
      alt: info.alt
    }
  }
  try {
    const actualSize = await imageSize(info.src)
    return {
      src: info.src,
      width: actualSize.width.toString(),
      height: actualSize.height.toString(),
      alt: info.alt
    }
  } catch {
    return info
  }
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

  const [iconUrl, imageInfo] = await Promise.all([
    typeof metadata.icon === 'string' ? Promise.resolve(fullUrl(metadata.icon, urlString)) : defaultFavicon(urlString),
    metadata.image === undefined ? Promise.resolve(undefined) : fetchImageInfo({
      ...metadata.image,
      src: fullUrl(metadata.image.src, urlString)
    })
  ])

  return {
    ...metadata,
    icon: iconUrl,
    image: imageInfo
  }
}
