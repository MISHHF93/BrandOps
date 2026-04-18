/** Shared PKCE helpers for OAuth in the extension (Google, GitHub, LinkedIn). */

export const randomString = (length: number) => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
};

export const toBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const createCodeChallenge = async (verifier: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return toBase64Url(digest);
};

export const isExtensionIdentityAvailable = () =>
  typeof chrome !== 'undefined' &&
  Boolean(chrome.identity?.launchWebAuthFlow) &&
  Boolean(chrome.identity?.getRedirectURL);

export const getOAuthRedirectUrl = (pathSuffix: string): string | null => {
  if (!isExtensionIdentityAvailable()) return null;
  return chrome.identity.getRedirectURL(pathSuffix);
};
