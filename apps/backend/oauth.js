/**
 * OAuth2 Authentication Module
 * Handles OAuth2 authentication flow with multiple providers
 */

const crypto = require('crypto');

// In-memory session store (use Redis/DynamoDB in production)
const sessions = new Map();
const authCodes = new Map();

/**
 * Generate authorization URL for OAuth2 provider
 * @param {string} provider - Provider name (google, github, microsoft)
 * @param {string} clientId - OAuth2 client ID
 * @param {string} redirectUri - Callback URL
 * @returns {Object} Authorization URL and state
 */
function getAuthorizationUrl(provider, clientId, redirectUri) {
  const state = crypto.randomBytes(16).toString('hex');
  const providers = {
    google: 'https://accounts.google.com/o/oauth2/v2/auth',
    github: 'https://github.com/login/oauth/authorize',
    microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
  };
  
  const baseUrl = providers[provider];
  if (!baseUrl) throw new Error('Unsupported provider');
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    scope: 'openid email profile'
  });
  
  return { url: `${baseUrl}?${params}`, state };
}

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code
 * @returns {Object} Session data
 */
function exchangeCodeForToken(code) {
  const authData = authCodes.get(code);
  if (!authData) throw new Error('Invalid authorization code');
  
  authCodes.delete(code);
  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, { userId: authData.userId, email: authData.email });
  
  return { sessionId, userId: authData.userId, email: authData.email };
}

/**
 * Validate session token
 * @param {string} sessionId - Session identifier
 * @returns {Object|null} Session data or null
 */
function validateSession(sessionId) {
  return sessions.get(sessionId) || null;
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForToken,
  validateSession
};
