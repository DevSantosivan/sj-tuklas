const BACKEND_URL = 'https://sj-tuklas.onrender.com';

export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ============================================================
    // API
    // ============================================================

    const isApiRequest =
      url.pathname === '/api' || url.pathname.startsWith('/api/');

    // ============================================================
    // BUSINESS SIGNALR
    // ============================================================

    const isBusinessSignalR =
      url.pathname === '/hubs/business' ||
      url.pathname.startsWith('/hubs/business/');

    // ============================================================
    // EXPLORE 3D SIGNALR
    // ============================================================

    const isExplore3dSignalR =
      url.pathname === '/hubs/explore3d' ||
      url.pathname.startsWith('/hubs/explore3d/');

    // ============================================================
    // GLOBAL CHAT SIGNALR
    // ============================================================

    const isGlobalChatSignalR =
      url.pathname === '/hubs/global-chat' ||
      url.pathname.startsWith('/hubs/global-chat/');

    // ============================================================
    // PROXY TO BACKEND
    // ============================================================

    if (
      isApiRequest ||
      isBusinessSignalR ||
      isExplore3dSignalR ||
      isGlobalChatSignalR
    ) {
      const backendUrl = new URL(`${BACKEND_URL}${url.pathname}${url.search}`);

      const headers = new Headers(request.headers);

      // ----------------------------------------------------------
      // Forward browser cookies
      // ----------------------------------------------------------

      const cookie = request.headers.get('Cookie');

      if (cookie) {
        headers.set('Cookie', cookie);
      }

      // ----------------------------------------------------------
      // Forward SignalR WebSocket upgrade headers
      // ----------------------------------------------------------

      const upgrade = request.headers.get('Upgrade');

      if (upgrade) {
        headers.set('Upgrade', upgrade);
      }

      const connection = request.headers.get('Connection');

      if (connection) {
        headers.set('Connection', connection);
      }

      // ----------------------------------------------------------
      // Backend request
      // ----------------------------------------------------------

      const backendRequest = new Request(backendUrl.toString(), {
        method: request.method,
        headers,
        body:
          request.method === 'GET' || request.method === 'HEAD'
            ? undefined
            : request.body,
        redirect: 'manual',
      });

      const backendResponse = await fetch(backendRequest);

      // ----------------------------------------------------------
      // Return backend response
      // ----------------------------------------------------------

      const responseHeaders = new Headers(backendResponse.headers);

      return new Response(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
      });
    }

    // ============================================================
    // ANGULAR STATIC ASSETS
    // ============================================================

    return env.ASSETS.fetch(request);
  },
};
