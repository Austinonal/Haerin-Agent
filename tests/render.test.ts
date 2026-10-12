import { describe, expect, it } from 'vitest';
import { splitFences } from '../src/components/chat/MessageItem';

describe('splitFences', () => {
  it('separates prose and fenced code, trimming blank lines around code', () => {
    expect(splitFences('ก่อน\n\n```js\nconst a = 1;\n```\n\nหลัง')).toEqual([
      { code: false, lang: '', body: 'ก่อน' },
      { code: true, lang: 'js', body: 'const a = 1;' },
      { code: false, lang: '', body: 'หลัง' },
    ]);
  });

  it('keeps an unterminated fence (still streaming) as code', () => {
    expect(splitFences('x\n```py\nprint(1)')).toEqual([
      { code: false, lang: '', body: 'x' },
      { code: true, lang: 'py', body: 'print(1)' },
    ]);
  });

  it('treats HTML as plain text parts (rendered by React as text, never as markup)', () => {
    expect(splitFences('<img src=x onerror=alert(1)>')).toEqual([{ code: false, lang: '', body: '<img src=x onerror=alert(1)>' }]);
  });
});
