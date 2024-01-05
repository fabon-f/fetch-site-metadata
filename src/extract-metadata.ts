import { HTMLRewriter } from 'html-rewriter-wasm'
import { decodeHTML } from 'entities'
import rules from './rules.js'
import type { Rule } from './rules.js'

export type ImageInfo = {
  src: string
  width: string | undefined
  height: string | undefined
  alt: string | undefined
}

export type Metadata = {
  title: string | undefined
  description: string | undefined
  icon: string | undefined
  image: ImageInfo | undefined
}

function extractAttribute(rewriter: HTMLRewriter, selector: string, attribute: string): Promise<string | undefined> {
  return new Promise(resolve => {
    rewriter.on(selector, {
      element(el) {
        const attr = el.getAttribute(attribute)
        if (attr) {
          resolve(decodeHTML(attr))
        }
      }
    }).onDocument({
      end() {
        resolve(undefined)
      }
    })
  })
}

function extractText(rewriter: HTMLRewriter, selector: string): Promise<string | undefined> {
  return new Promise(resolve => {
    let str = ''
    rewriter.on(selector, {
      text(node) {
        str += node.text
        if (node.lastInTextNode) {
          resolve(decodeHTML(str))
        }
      }
    }).onDocument({
      end() {
        resolve(undefined)
      }
    })
  })
}

const ruleToPromise = (rewriter: HTMLRewriter, rule: Rule) => (
  rule[0] === 'attr' ? extractAttribute(rewriter, rule[1], rule[2]) : extractText(rewriter, rule[1])
)

const extract = async (rewriter: HTMLRewriter, rules: Rule[]) => {
  const values = await Promise.all(rules.map(r => ruleToPromise(rewriter, r)))
  return values.find(s => s !== undefined)
}

export default async function extractMetadata(stream: ReadableStream<Uint8Array>) {
  const rewriter = new HTMLRewriter(() => {})

  const elementsBeforeBody = ['html', 'head', 'base', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title']

  let end = false
  rewriter.on('*', {
    element(el) {
      if (!elementsBeforeBody.includes(el.tagName)) {
        end = true
      }
    }
  })

  const promises = {
    title: extract(rewriter, rules.title),
    description: extract(rewriter, rules.description),
    icon: extract(rewriter, rules.icon),
    image: extract(rewriter, rules.image),
    imageWidth: extractAttribute(rewriter, 'meta[property="og:image:width"]', 'content'),
    imageHeight: extractAttribute(rewriter, 'meta[property="og:image:height"]', 'content'),
    imageAlt: extractAttribute(rewriter, 'meta[property="og:image:alt"]', 'content')
  }

  for await (const chunk of stream) {
    await rewriter.write(chunk)
    if (end) {
      break
    }
  }
  await rewriter.end()
  rewriter.free()

  await Promise.all(Object.values(promises))

  const imageSrc = await promises.image

  return {
    title: await promises.title,
    description: await promises.description,
    icon: await promises.icon,
    image: imageSrc === undefined ? undefined : {
      src: imageSrc,
      width: await promises.imageWidth,
      height: await promises.imageHeight,
      alt: await promises.imageAlt
    }
  }
}
