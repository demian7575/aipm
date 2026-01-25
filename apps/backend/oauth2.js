/**
 * OAuth2 Authentication Module
 * Handles Google OAuth2 authentication flow
 */

/**
 * Generate OAuth2 authorization URL
 * @param {string} clientId - Google OAuth2 client ID
 * @param {string} redirectUri - Callback URL
 * @returns {string} Authorization URL
 */
export function getAuthorizationUrl(clientId, redirectUri) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code
 * @param {string} clientId - Google OAuth2 client ID
 * @param {string} clientSecret - Google OAuth2 client secret
 * @param {string} redirectUri - Callback URL
 * @returns {Promise<Object>} Token response
 */
export async function exchangeCodeForTokens(code, clientId, clientSecret, redirectUri) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get user profile from Google
 * @param {string} accessToken - OAuth2 access token
 * @returns {Promise<Object>} User profile
 */
export async function getUserProfile(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }
  
  return response.json();
}
