/**
 * Cloudflare Worker – Reddit API proxy
 *
 * Proxies requests to Reddit's JSON API so that AWS Lambda (whose IPs are
 * blocked by Reddit's Cloudflare layer) can fetch Reddit data by routing
 * through Cloudflare's edge network instead.
 *
 * Deploy at: https://dash.cloudflare.com → Workers & Pages → Create Worker
 * Usage: set REDDIT_PROXY_URL=https://<worker>.workers.dev in Lambda env vars
 *
 * The worker mirrors the Reddit JSON API path exactly:
 *   GET /comments/<id>.json?...          → reddit.com/comments/<id>.json?...
 *   GET /r/<sub>/hot.json?...            → reddit.com/r/<sub>/hot.json?...
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const redditUrl = `https://www.reddit.com${url.pathname}${url.search}`;

    const response = await fetch(redditUrl, {
      headers: {
        "User-Agent": "CS485DebateAnalyzer/1.0 by aum23",
        "Accept": "application/json",
      },
    });

    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  },
};
