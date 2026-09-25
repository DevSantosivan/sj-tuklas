const BACKEND_URL = 'https://sj-tuklas.onrender.com';

export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const isApiRequest =
      url.pathname === '/api' || url.pathname.startsWith('/api/');

    const isSignalRRequest =
      url.pathname === '/hubs/business' ||
      url.pathname.startsWith('/hubs/business/');

    if (isApiRequest || isSignalRRequest) {
      const backendUrl = new URL(`${BACKEND_URL}${url.pathname}${url.search}`);

      const headers = new Headers(request.headers);

      // The browser's cookie is forwarded to Render.
      const cookie = request.headers.get('Cookie');

      if (cookie) {
        headers.set('Cookie', cookie);
      }

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

      const responseHeaders = new Headers(backendResponse.headers);

      return new Response(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
