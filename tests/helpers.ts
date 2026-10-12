import { vi } from 'vitest';

/** A ReadableStream that delivers the given string split into the given chunk sizes (bytes). */
export function streamOf(text: string, chunkBytes = 7): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  let i = 0;
  return new ReadableStream({
    pull(c) {
      if (i >= bytes.length) return c.close();
      c.enqueue(bytes.slice(i, i + chunkBytes));
      i += chunkBytes;
    },
  });
}

export async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of gen) out.push(x);
  return out;
}

/** Replaces global fetch; records every URL requested. */
export function mockFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const urls: string[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    urls.push(url);
    return impl(url, init);
  });
  vi.stubGlobal('fetch', fn);
  return { urls, fn };
}
