import { imageDimensionsFromStream } from 'image-dimensions'

export default async function fetchImageSize(url: string, options: RequestInit) {
    const controller = new AbortController()
    const response = await fetch(url, {
        ...options,
        signal: controller.signal
    })
    if (!response.body) {
        return undefined
    }
    const result = await imageDimensionsFromStream(response.body)
    controller.abort()
    return result
}
