/**
 * OAuth2 Authentication Module
 * Supports Google, GitHub, and Microsoft providers
 */

const OAUTH_PROVIDERS = {
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
export function getAuthorizationUrl(provider, clientId, redirectUri, state) {
  const config = OAUTH_PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state: state
  });

  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(provider, code, clientId, clientSecret, redirectUri) {
  const config = OAUTH_PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
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
 * Fetch user profile information
 */
export async function getUserProfile(provider, accessToken) {
  const config = OAUTH_PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  const response = await fetch(config.userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Validate access token
 */
export function validateToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  // Basic validation - token should be non-empty string
  return token.length > 0;
}
