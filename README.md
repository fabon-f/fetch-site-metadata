# fetch-site-metadata

High-performance metadata scraper for Node.js

## Features

* Don't download whole contents to get site metadata.
  * Fetch and parse the content of the `head` element only. Interrupt HTTP request when the `<body>` element starts.
  * Download only first few kilobytes to determine image size (by `probe-image-size` package)

## Install

```sh
npm install fetch-site-metadata
```

## Usage

This package requires Node.js v16 or higher. ESM only.

```ts
import fetchSiteMetadata from 'fetch-site-metadata'
await fetchSiteMetadata('https://github.com/')

// result:
{
  title: 'GitHub: Let’s build from here',
  description: 'GitHub is where over 94 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, review code like a pro, track bugs and feat...',
  icon: 'https://github.githubassets.com/favicons/favicon.svg',
  image: {
    src: 'https://github.githubassets.com/images/modules/site/social-cards/campaign-social.png',
    width: '1200',
    height: '630',
    alt: 'GitHub is where over 94 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, review code like a pro, track bugs and feat...'
  }
}
```

## API

### `fetchSiteMetadata(url: string | URL, options?: Options)`

Return value: `Promise<Metadata>`

Fetch target site and scrape metadata. This function send multiple requests to determine OG image size and other informations by default.

`suppressAdditionalRequest` option suppress this behavior. With `suppressAdditionalRequest`option, this function fetches only the specified URL and reduces processing time, but provides only information which can be extracted from the specified page.

```ts
type Options = {
  suppressAdditionalRequest?: boolean
}

type ImageInfo = {
  src: string
  width: string | undefined
  height: string | undefined
  alt: string | undefined
}

type Metadata = {
  title: string | undefined
  description: string | undefined
  icon: string | undefined
  image: ImageInfo | undefined
}
```
