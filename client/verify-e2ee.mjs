import { webcrypto as crypto } from 'node:crypto';

globalThis.window = {
  crypto,
  btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
};
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };

const { encryptMessage, decryptMessage } = await import('./src/utils/e2ee.js');

const aliceKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
const bobKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
const alicePrivateJwk = await crypto.subtle.exportKey('jwk', aliceKeyPair.privateKey);
const bobPublicJwk = await crypto.subtle.exportKey('jwk', bobKeyPair.publicKey);
const alicePublicJwk = await crypto.subtle.exportKey('jwk', aliceKeyPair.publicKey);
const bobPrivateJwk = await crypto.subtle.exportKey('jwk', bobKeyPair.privateKey);

try {
  const cipher = await encryptMessage('hello world', bobPublicJwk, alicePrivateJwk);
  console.log('cipher', cipher);
  const plain = await decryptMessage(cipher?.ciphertext, cipher?.iv, alicePublicJwk, bobPrivateJwk);
  console.log('plain', plain);
} catch (error) {
  console.error('error', error);
}
