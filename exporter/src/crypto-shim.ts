/**
 * GramJS (Helpers.js) calls `r.default.randomBytes(...)`.
 * Vite + CJS/ESM interop can yield a module whose `default` is missing
 * `randomBytes`, which crashes on connect. This shim always exposes:
 *
 *   shim.randomBytes
 *   shim.default.randomBytes
 *
 * Implementation is crypto-browserify. Do not assign to `window.crypto` —
 * it is read-only in browsers and would throw.
 */
import nodeCrypto from "crypto-browserify";

type RandomBytes = (size: number, callback?: (err: Error | null, buf: Uint8Array) => void) => Uint8Array;

type CryptoApi = {
  randomBytes: RandomBytes;
  getRandomValues?: (array: ArrayBufferView) => ArrayBufferView;
  subtle?: SubtleCrypto;
  [key: string]: unknown;
};

const impl = ((nodeCrypto as { default?: CryptoApi }).default ??
  (nodeCrypto as unknown as CryptoApi)) as CryptoApi;

export const randomBytes: RandomBytes = ((...args: Parameters<RandomBytes>) =>
  impl.randomBytes(...args)) as RandomBytes;

const webCrypto = globalThis.crypto;

const shim = {
  ...impl,
  randomBytes,
  // If a bundler rewrites a bare `crypto` identifier to this module,
  // GramJS's browser helpers still need Web Crypto — without touching
  // the read-only `window.crypto` binding.
  getRandomValues: (array: ArrayBufferView) => webCrypto.getRandomValues(array),
  subtle: webCrypto.subtle,
} as CryptoApi & { default: CryptoApi };

shim.default = shim;
Object.defineProperty(shim, "__esModule", { value: true });

export default shim;

export const createHash = impl.createHash;
export const createHmac = impl.createHmac;
export const createCipheriv = impl.createCipheriv;
export const createDecipheriv = impl.createDecipheriv;
export const pbkdf2 = impl.pbkdf2;
export const pbkdf2Sync = impl.pbkdf2Sync;
export const createECDH = impl.createECDH;
export const publicEncrypt = impl.publicEncrypt;
export const privateDecrypt = impl.privateDecrypt;
export const randomFillSync = impl.randomFillSync;
export const randomFill = impl.randomFill;
