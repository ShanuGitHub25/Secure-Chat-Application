const PRIVATE_KEY_STORAGE_KEY = "arkchat-private-key";
const PUBLIC_KEY_STORAGE_KEY = "arkchat-public-key";

function getCurrentUserId() {
  try {
    const storedUser = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);
    if (!storedUser) return null;
    const parsedUser = JSON.parse(storedUser);
    return parsedUser?._id || null;
  } catch (error) {
    return null;
  }
}

function getKeyStorageKeys(userId = null) {
  const resolvedUserId = userId || getCurrentUserId();
  const privateKeyStorageKey = resolvedUserId
    ? `${PRIVATE_KEY_STORAGE_KEY}-${resolvedUserId}`
    : PRIVATE_KEY_STORAGE_KEY;
  const publicKeyStorageKey = resolvedUserId
    ? `${PUBLIC_KEY_STORAGE_KEY}-${resolvedUserId}`
    : PUBLIC_KEY_STORAGE_KEY;

  return { privateKeyStorageKey, publicKeyStorageKey };
}

function bufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(value) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function isValidJwk(jwk) {
  return Boolean(jwk && jwk.kty && jwk.crv && jwk.x && jwk.y);
}

export function parsePublicKey(publicKey) {
  if (!publicKey) return null;
  
  // Already a JWK object
  if (typeof publicKey === 'object' && publicKey.kty) {
    return publicKey;
  }
  
  if (typeof publicKey === 'string') {
    // Try direct JSON string parsing
    try {
      const parsed = JSON.parse(publicKey);
      if (parsed.kty) return parsed;
    } catch (e) {
      // Continue to next fallback
    }

    // Try base64-decoding a JSON JWK payload
    try {
      const decoded = window.atob(publicKey);
      const parsed = JSON.parse(decoded);
      if (parsed.kty) return parsed;
    } catch (e) {
      // Not base64 JSON either
    }
  }
  
  return null;
}

async function getKeyFingerprint(keyData) {
  const bytes = keyData instanceof Uint8Array ? keyData : new Uint8Array(keyData);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeJwkForImport(jwk) {
  if (!jwk || typeof jwk !== "object") return null;

  const normalized = { ...jwk };
  if (normalized.key_ops) {
    delete normalized.key_ops;
  }
  if (!normalized.ext) {
    normalized.ext = true;
  }
  return normalized;
}

async function importPrivateKey(jwk) {
  const sanitizedJwk = normalizeJwkForImport(jwk);
  if (!isValidJwk(sanitizedJwk)) return null;
  try {
    return await window.crypto.subtle.importKey(
      "jwk",
      sanitizedJwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits", "deriveKey"]
    );
  } catch (error) {
    console.error("[E2EE] Failed to import private key:", error.message);
    return null;
  }
}

async function importPublicKey(jwk) {
  const sanitizedJwk = normalizeJwkForImport(jwk);
  if (!isValidJwk(sanitizedJwk)) return null;
  try {
    return await window.crypto.subtle.importKey(
      "jwk",
      sanitizedJwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );
  } catch (error) {
    console.error("[E2EE] Failed to import public key:", error.message);
    return null;
  }
}

async function deriveAesKey(privateKeyJwk, peerPublicKeyJwk) {
  const privateKey = await importPrivateKey(privateKeyJwk);
  const publicKey = await importPublicKey(peerPublicKeyJwk);

  if (!privateKey || !publicKey) {
    console.error("[E2EE] Key import failed:", { privateKey: !!privateKey, publicKey: !!publicKey });
    return null;
  }

  try {
    const sharedSecret = await window.crypto.subtle.deriveBits(
      {
        name: "ECDH",
        public: publicKey,
      },
      privateKey,
      256
    );

    const sharedSecretBytes = new Uint8Array(sharedSecret);
    const aesKeyBytes = new Uint8Array(
      await window.crypto.subtle.digest("SHA-256", sharedSecretBytes)
    );

    console.log("[E2EE] Derivation debug", {
      sharedSecretFingerprint: await getKeyFingerprint(sharedSecretBytes),
      aesKeyFingerprint: await getKeyFingerprint(aesKeyBytes),
      sharedSecretLength: sharedSecretBytes.length,
      aesKeyLength: aesKeyBytes.length,
      peerPublicKey: peerPublicKeyJwk ? { x: peerPublicKeyJwk.x, y: peerPublicKeyJwk.y } : null,
      privateKey: privateKeyJwk ? { x: privateKeyJwk.x, y: privateKeyJwk.y } : null,
    });

    return window.crypto.subtle.importKey(
      "raw",
      aesKeyBytes,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("[E2EE] Key derivation failed:", error);
    return null;
  }
}

export async function ensureE2EEKeyPair(userId = null) {
  const { privateKeyStorageKey, publicKeyStorageKey } = getKeyStorageKeys(userId);
  const existingPrivate = localStorage.getItem(privateKeyStorageKey);
  const existingPublic = localStorage.getItem(publicKeyStorageKey);

  const legacyPrivate = !existingPrivate ? localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) : null;
  const legacyPublic = !existingPublic ? localStorage.getItem(PUBLIC_KEY_STORAGE_KEY) : null;

  if (existingPrivate && existingPublic) {
    return {
      privateKeyJwk: JSON.parse(existingPrivate),
      publicKeyJwk: JSON.parse(existingPublic),
    };
  }

  if (legacyPrivate && legacyPublic) {
    localStorage.setItem(privateKeyStorageKey, legacyPrivate);
    localStorage.setItem(publicKeyStorageKey, legacyPublic);
    return {
      privateKeyJwk: JSON.parse(legacyPrivate),
      publicKeyJwk: JSON.parse(legacyPublic),
    };
  }

  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits", "deriveKey"]
  );

  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);

  localStorage.setItem(privateKeyStorageKey, JSON.stringify(privateKeyJwk));
  localStorage.setItem(publicKeyStorageKey, JSON.stringify(publicKeyJwk));

  return { privateKeyJwk, publicKeyJwk };
}

export async function encryptMessage(plainText, peerPublicKeyJwk, privateKeyJwk) {
  if (!plainText || !peerPublicKeyJwk || !privateKeyJwk) {
    return null;
  }

  try {
    const aesKey = await deriveAesKey(privateKeyJwk, peerPublicKeyJwk);
    if (!aesKey) {
      return null;
    }

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      new TextEncoder().encode(plainText)
    );

    console.log("[E2EE] Encrypt params", {
      ivFingerprint: await getKeyFingerprint(iv),
      ciphertextLength: cipherBuffer.byteLength,
      plaintextLength: new TextEncoder().encode(plainText).length,
    });

    return {
      ciphertext: bufferToBase64(cipherBuffer),
      iv: bufferToBase64(iv),
    };
  } catch (error) {
    console.error("[E2EE] Encryption failed:", error);
    return null;
  }
}

export async function decryptMessage(ciphertext, iv, peerPublicKeyJwk, privateKeyJwk) {
  if (!ciphertext || !iv || !peerPublicKeyJwk || !privateKeyJwk) {
    console.error("[E2EE] Decrypt missing args:", { ciphertext: !!ciphertext, iv: !!iv, peerPublicKeyJwk: !!peerPublicKeyJwk, privateKeyJwk: !!privateKeyJwk });
    return { decryptionFailed: true, message: "Unable to decrypt message" };
  }

  try {
    console.log("[E2EE] Starting decrypt:", {
      peerPublicKeyKeys: Object.keys(peerPublicKeyJwk || {}),
      privateKeyKeys: Object.keys(privateKeyJwk || {}),
      ciphertextLength: ciphertext.length,
      ivLength: iv.length,
      ivFingerprint: await getKeyFingerprint(base64ToBuffer(iv)),
    });
    
    const aesKey = await deriveAesKey(privateKeyJwk, peerPublicKeyJwk);
    if (!aesKey) {
      console.error("[E2EE] AES key derivation returned null");
      return { decryptionFailed: true, message: "Unable to decrypt message" };
    }

    console.log("[E2EE] AES key derived successfully, attempting decrypt");
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBuffer(iv) },
      aesKey,
      base64ToBuffer(ciphertext)
    );

    return {
      message: new TextDecoder().decode(decryptedBuffer),
      decryptionFailed: false,
    };
  } catch (error) {
    console.error("[E2EE] Decryption failed:", error.name, error.message);
    return { decryptionFailed: true, message: "Unable to decrypt message" };
  }
}

export function getStoredPublicKeyJwk(userId = null) {
  const { publicKeyStorageKey } = getKeyStorageKeys(userId);
  const stored = localStorage.getItem(publicKeyStorageKey);
  return stored ? JSON.parse(stored) : null;
}
