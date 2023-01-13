import { HTMLRewriter } from 'html-rewriter-wasm'
import rules from './rules.js'
import type { Rule } from './rules.js'

function extractAttribute(rewriter: HTMLRewriter, selector: string, attribute: string): Promise<string | undefined> {
  return new Promise(resolve => {
    rewriter.on(selector, {
      element(el) {
        const attr = el.getAttribute(attribute)
        if (attr) {
          resolve(attr)
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
          resolve(str)
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

export default async function extractMetadata(stream: NodeJS.ReadableStream) {
  const rewriter = new HTMLRewriter(() => {})
  const encoder = new TextEncoder()

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
  }

  for await (const chunk of stream) {
    await rewriter.write(typeof chunk === 'string' ? encoder.encode(chunk) : chunk)
    if (end) {
      break
    }
  }
  await rewriter.end()
  rewriter.free()

  await Promise.all([promises.title, promises.description, promises.icon, promises.image])

  return {
    title: await promises.title,
    description: await promises.description,
    icon: await promises.icon,
    image: await promises.image
  }
}
