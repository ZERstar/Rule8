import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

const authServer =
  convexUrl && convexSiteUrl
    ? convexBetterAuthNextJs({
        convexUrl,
        convexSiteUrl,
      })
    : null;

const authUnavailable = async () =>
  new Response("Auth is not configured.", { status: 503 });

export const handler = authServer?.handler ?? {
  GET: authUnavailable,
  POST: authUnavailable,
};

export async function getToken() {
  if (!authServer) {
    return null;
  }

  return authServer.getToken();
}

export async function isAuthenticated() {
  if (!authServer) {
    return false;
  }

  return authServer.isAuthenticated();
}
