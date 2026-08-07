const RP_NAME = 'Jeevanam'

function bufferToBase64Url(buf: ArrayBuffer): string {
  let binary = ''
  for (const byte of new Uint8Array(buf)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBuffer(base64Url: string): ArrayBuffer {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/** Whether this device has a fingerprint/face platform authenticator the
 * browser can prompt — feature-detected so the Settings toggle only shows
 * up where it can actually work. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Registers a local platform-authenticator (fingerprint/face) credential and
 * returns its id to store locally. There's no server here to verify the
 * attestation against — like the PIN, this only gates the local App Lock
 * screen rather than a real auth backend — so a random challenge and a
 * credential that was created without throwing is all we need.
 */
export async function registerBiometricCredential(userId: string): Promise<string | null> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: RP_NAME },
        user: {
          id: new TextEncoder().encode(userId),
          name: 'owner',
          displayName: 'Owner',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000,
      },
    })
    if (!credential) return null
    return bufferToBase64Url((credential as PublicKeyCredential).rawId)
  } catch {
    return null
  }
}

/** Prompts the platform authenticator (fingerprint/face) and resolves true
 * only if the user verifies successfully. */
export async function verifyBiometricCredential(credentialId: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: base64UrlToBuffer(credentialId), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return assertion !== null
  } catch {
    return false
  }
}
