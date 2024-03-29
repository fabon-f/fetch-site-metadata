import fetchImageSize from './fetch-image-size.js'

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

const defaultFavicon = async (baseUrl: string, fetchOptions: RequestInit) => {
  const defaultFaviconUrl = new URL('/favicon.ico', baseUrl).toString()
  const response = await fetch(defaultFaviconUrl, fetchOptions)
  return response.ok ? defaultFaviconUrl : undefined
}

const fetchImageInfo = async (info: ImageInfo, fetchOptions: RequestInit) => {
  const intRegex = /0|[1-9][0-9]*/
  if (info.width !== undefined && info.height !== undefined && intRegex.test(info.width) && intRegex.test(info.height)) {
    return {
      src: info.src,
      width: info.width,
      height: info.height,
      alt: info.alt
    }
  }
  const actualSize = await fetchImageSize(info.src, fetchOptions)
  if (actualSize) {
    return {
      src: info.src,
      width: actualSize.width.toString(),
      height: actualSize.height.toString(),
      alt: info.alt
    }
  }
  return info
}

type IntrinsicOptions = {
  suppressAdditionalRequest?: boolean
}

export type Options = IntrinsicOptions & Parameters<typeof fetch>[1]

export type {
  Metadata,
  ImageInfo
}

function getFetchOptions(options: Options): RequestInit {
  const res = {} as Record<string, any>
  const optionKeys = ['suppressAdditionalRequest']
  for (const [k, v] of Object.entries(options)) {
    if (!optionKeys.includes(k)) {
      res[k] = v
    }
  }
  return res
}

export default async function fetchSiteMetadata(url: string | URL, options: Options = {}): Promise<Metadata> {
  const urlString = typeof url === 'string' ? url : url.toString()
  const controller = new AbortController()
  const fetchOptions = getFetchOptions(options)
  const response = await fetch(urlString, {
    ...fetchOptions,
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
    typeof metadata.icon === 'string' ? Promise.resolve(metadata.icon) : defaultFavicon(urlString, fetchOptions),
    metadata.image === undefined ? Promise.resolve(undefined) : fetchImageInfo(metadata.image, fetchOptions)
  ])

  return {
    ...metadata,
    icon: iconUrl,
    image: imageInfo
  }
}
