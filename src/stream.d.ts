interface ReadableStream<R = any> {
  [Symbol.asyncIterator](): AsyncIterator<R>;
}
