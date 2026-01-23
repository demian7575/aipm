/**
 * OAuth2 Authentication Module
 * Handles OAuth2 provider integration for user authentication
 */

import { randomUUID } from 'node:crypto';

// In-memory session store (use Redis/DynamoDB in production)
const sessions = new Map();
const oauthStates = new Map();

/**
 * OAuth2 provider configurations
 */
const providers = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile'
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: 'read:user user:email'
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: 'openid email profile'
  }
};

/**
 * Generate OAuth2 authorization URL
 */
export function getAuthorizationUrl(provider, clientId, redirectUri) {
  const config = providers[provider];
  if (!config) {
    throw new Error(`Unsupported OAuth2 provider: ${provider}`);
  }

  const state = randomUUID();
  oauthStates.set(state, { provider, timestamp: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state
  });

  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(provider, code, clientId, clientSecret, redirectUri) {
  const config = providers[provider];
  if (!config) {
    throw new Error(`Unsupported OAuth2 provider: ${provider}`);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch user info from OAuth2 provider
 */
export async function getUserInfo(provider, accessToken) {
  const config = providers[provider];
  if (!config) {
    throw new Error(`Unsupported OAuth2 provider: ${provider}`);
  }

  const response = await fetch(config.userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Verify OAuth2 state parameter
 */
export function verifyState(state) {
  const stateData = oauthStates.get(state);
  if (!stateData) {
    return false;
  }

  // State expires after 10 minutes
  const isExpired = Date.now() - stateData.timestamp > 10 * 60 * 1000;
  if (isExpired) {
    oauthStates.delete(state);
    return false;
  }

  oauthStates.delete(state);
  return true;
}

/**
 * Create user session
 */
export function createSession(userId, userEmail, provider, accessToken, expiresIn = 3600) {
  const sessionId = randomUUID();
  const expiresAt = Date.now() + (expiresIn * 1000);

  sessions.set(sessionId, {
    userId,
    userEmail,
    provider,
    accessToken,
    expiresAt
  });

  return { sessionId, expiresAt };
}

/**
 * Validate session
 */
export function validateSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * Destroy session
 */
export function destroySession(sessionId) {
  return sessions.delete(sessionId);
}
