type AttributeRule = ['attr', string, string]
type TextRule = ['text', string]
export type Rule = AttributeRule | TextRule

export default {
  title: [
    ['attr', 'meta[property="og:title"]', 'content'],
    ['attr', 'meta[name="twitter:title"]', 'content'],
    ['attr', 'meta[property="twitter:title"]', 'content'],
    ['text', 'title']
  ] as Rule[],
  description: [
    ['attr', 'meta[property="og:description"]', 'content'],
    ['attr', 'meta[name="description" i]', 'content'],
    ['attr', 'meta[name="twitter:description"]', 'content']
  ] as Rule[],
  icon: [
    ['attr', 'link[rel="apple-touch-icon"]', 'href'],
    ['attr', 'link[rel="apple-touch-icon-precomposed"]', 'href'],
    ['attr', 'link[rel="icon" i]', 'href']
  ] as Rule[],
  image: [
    ['attr', 'meta[property="og:image:secure_url"]', 'content'],
    ['attr', 'meta[property="og:image:url"]', 'content'],
    ['attr', 'meta[property="og:image"]', 'content'],
    ['attr', 'meta[name="twitter:image"]', 'content'],
    ['attr', 'meta[property="twitter:image"]', 'content'],
    ['attr', 'meta[name="thumbnail"]', 'content']
  ] as Rule[]
}
