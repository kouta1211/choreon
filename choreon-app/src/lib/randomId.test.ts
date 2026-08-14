import { randomId } from './randomId';

/**
 * ID の採番。**crypto が無い端末でも止まらないこと**がこのファイルの主題。
 * Web版には無いテストで、ネイティブ（Hermes に crypto が無い）のために足した。
 */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomId', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
  });

  function setCrypto(value: unknown) {
    Object.defineProperty(globalThis, 'crypto', {
      value,
      configurable: true,
      writable: true,
    });
  }

  it('randomUUID があればそれを使う', () => {
    const randomUUID = jest.fn(() => '11111111-2222-4333-8444-555555555555');
    setCrypto({ randomUUID });

    expect(randomId()).toBe('11111111-2222-4333-8444-555555555555');
    expect(randomUUID).toHaveBeenCalled();
  });

  // http:// で開いた実機（セキュアコンテキストではない）はこちらへ落ちる
  it('randomUUID が無くても getRandomValues から v4 を組み立てる', () => {
    setCrypto({
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0xab);
        return bytes;
      },
    });

    expect(randomId()).toMatch(UUID_V4);
  });

  // Hermes（iOS/Android の実機）。ここで投げると「追加」が押せなくなる
  it('crypto がまったく無くても v4 を返す', () => {
    setCrypto(undefined);

    expect(randomId()).toMatch(UUID_V4);
  });

  it('呼ぶたびに違う値になる', () => {
    setCrypto(undefined);

    const ids = new Set(Array.from({ length: 100 }, () => randomId()));

    expect(ids.size).toBe(100);
  });
});
