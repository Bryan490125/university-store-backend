import { BrowserCacheLocation, InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
const apiScope = import.meta.env.VITE_AZURE_SCOPE;

export const microsoftEnabled = Boolean(tenantId && clientId && apiScope);
let clientPromise;

async function getClient() {
  if (!microsoftEnabled) throw new Error('Microsoft sign-in is not configured.');
  if (!clientPromise) {
    const client = new PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: `${window.location.origin}/store/`,
        postLogoutRedirectUri: `${window.location.origin}/store/`
      },
      cache: { cacheLocation: BrowserCacheLocation.LocalStorage }
    });
    clientPromise = client.initialize().then(async () => {
      const result = await client.handleRedirectPromise();
      if (result?.account) client.setActiveAccount(result.account);
      return client;
    }).catch((error) => {
      clientPromise = undefined;
      throw error;
    });
  }
  return clientPromise;
}

export async function getMicrosoftToken() {
  const client = await getClient();
  const account = client.getActiveAccount() || client.getAllAccounts()[0];
  if (!account) return null;
  try {
    const response = await client.acquireTokenSilent({ account, scopes: [apiScope] });
    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) return null;
    throw error;
  }
}

export async function loginWithMicrosoft() {
  const client = await getClient();
  await client.loginRedirect({ scopes: [apiScope], prompt: 'select_account' });
}

export async function logoutMicrosoft() {
  const client = await getClient();
  const account = client.getActiveAccount() || client.getAllAccounts()[0];
  if (account) await client.logoutRedirect({ account });
}
