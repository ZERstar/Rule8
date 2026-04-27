import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const AUTH_PROXY_TIMEOUT_MS = 15_000;
const AUTH_PROXY_ATTEMPTS = 2;

const authServer =
  convexUrl && convexSiteUrl
    ? convexBetterAuthNextJs({
        convexUrl,
        convexSiteUrl,
      })
    : null;

const authUnavailable = async () =>
  new Response("Auth is not configured.", { status: 503 });

function buildAuthProxyHeaders(request: Request, targetUrl: URL) {
  const requestUrl = new URL(request.url);
  const headers = new Headers(request.headers);

  headers.set("accept-encoding", "identity");
  headers.set("host", targetUrl.host);
  headers.set("x-forwarded-host", requestUrl.host);
  headers.set("x-forwarded-proto", requestUrl.protocol.replace(/:$/, ""));
  headers.set("x-better-auth-forwarded-host", requestUrl.host);
  headers.set("x-better-auth-forwarded-proto", requestUrl.protocol.replace(/:$/, ""));
  headers.delete("content-length");
  headers.delete("transfer-encoding");

  return headers;
}

async function proxyAuthRequest(request: Request) {
  if (!convexSiteUrl) {
    return authUnavailable();
  }

  const requestUrl = new URL(request.url);
  const targetUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, convexSiteUrl);
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  for (let attempt = 1; attempt <= AUTH_PROXY_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(targetUrl, {
        body,
        headers: buildAuthProxyHeaders(request, targetUrl),
        method: request.method,
        redirect: "manual",
        signal: AbortSignal.timeout(AUTH_PROXY_TIMEOUT_MS),
      });
    } catch (error) {
      console.error(`Auth proxy request failed, attempt ${attempt}/${AUTH_PROXY_ATTEMPTS}`, error);
    }
  }

  return Response.json(
    {
      error: "Auth backend unavailable",
      message: "Could not reach Convex Auth. Please retry.",
    },
    { status: 504 },
  );
}

export const handler = authServer?.handler ?? {
  GET: authUnavailable,
  POST: authUnavailable,
};

export const authProxyHandler =
  convexUrl && convexSiteUrl
    ? {
        GET: proxyAuthRequest,
        POST: proxyAuthRequest,
      }
    : handler;

export async function getToken() {
  if (!authServer) {
    return null;
  }

  try {
    return await authServer.getToken();
  } catch (error) {
    console.error("Failed to fetch auth token from Convex Auth", error);
    return null;
  }
}

export async function isAuthenticated() {
  if (!authServer) {
    return false;
  }

  try {
    return await authServer.isAuthenticated();
  } catch (error) {
    console.error("Failed to check Convex Auth session", error);
    return false;
  }
}
