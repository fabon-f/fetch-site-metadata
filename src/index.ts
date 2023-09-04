import imageSize from 'probe-image-size'

import extractMetadata from './extract-metadata.js'
import type { ImageInfo, Metadata } from './extract-metadata.js'

const fullUrl = (relativeUrl: string, baseUrl: string) => (
  new URL(relativeUrl, baseUrl).toString()
)

const validateInt = (str: string | undefined) => {
  const intRegex = /0|[1-9][0-9]*/
  if (str === undefined) {
    return undefined
  }
  if (intRegex.test(str)) {
    return str
  }
  return undefined
}

const normalizeMetadata = (data: Metadata, targetUrl: string): Metadata => {
  const image = data.image === undefined ? undefined : {
    ...data.image,
    src: fullUrl(data.image.src, targetUrl),
    width: validateInt(data.image.width),
    height: validateInt(data.image.height)
  }
  return {
    ...data,
    icon: data.icon === undefined ? undefined : fullUrl(data.icon, targetUrl),
    image
  }
}

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

export type Options = {
  suppressAdditionalRequest?: boolean
}

export type {
  Metadata,
  ImageInfo
}

export default async function fetchSiteMetadata(url: string | URL, options: Options = {}): Promise<Metadata> {
  const urlString = typeof url === 'string' ? url : url.toString()
  const controller = new AbortController()
  const response = await fetch(urlString, {
    signal: controller.signal
  })
  if (!response.body) { throw new Error('response.body') }
  const metadata = normalizeMetadata(await extractMetadata(response.body), url.toString())
  controller.abort()

  if (options.suppressAdditionalRequest) {
    return {
      ...metadata,
      icon: metadata.icon ?? new URL('/favicon.ico', url).toString()
    }
  }

  const [iconUrl, imageInfo] = await Promise.all([
    typeof metadata.icon === 'string' ? Promise.resolve(metadata.icon) : defaultFavicon(urlString),
    metadata.image === undefined ? Promise.resolve(undefined) : fetchImageInfo(metadata.image)
  ])

  return {
    ...metadata,
    icon: iconUrl,
    image: imageInfo
  }
}
