/**
 * RedditService – fetches real thread data from Reddit's API.
 *
 * Uses Reddit's OAuth2 client-credentials flow so requests come from an
 * authenticated app identity rather than an anonymous cloud IP.  Anonymous
 * requests from AWS Lambda IPs are blocked by Reddit's Cloudflare layer;
 * OAuth requests go to oauth.reddit.com which has no such restriction.
 *
 * Required environment variables:
 *   REDDIT_CLIENT_ID     – the "personal use script" app client id
 *   REDDIT_CLIENT_SECRET – the corresponding client secret
 *
 * How to create a Reddit app (free):
 *   1. Log in to reddit.com → Settings → Safety & Privacy → Manage third-party app authorisation → "create another app…"
 *   2. Select type "script".
 *   3. Copy the client ID (shown under the app name) and the secret.
 *
 * Supported URL formats:
 *   https://www.reddit.com/r/science/comments/abc123/title/
 *   reddit.com/r/science/comments/abc123/
 *   https://www.reddit.com/r/science/comments/abc123
 */

export interface RedditComment {
  id: string;
  author: string;
  content: string;
}

export interface RedditThread {
  threadId: string; // "reddit_<postId>"
  title: string;
  comments: RedditComment[];
}

const USER_AGENT = "CS485DebateAnalyzer/1.0 by aum23";
const MAX_COMMENTS = 25;

/** In-memory OAuth token cache (valid across warm Lambda invocations). */
let _cachedToken: string | null = null;
let _tokenExpiresAt = 0; // epoch ms

export class RedditService {
  /**
   * Parse the Reddit post ID from any recognised URL format.
   * Throws if the URL is not a valid Reddit thread URL.
   */
  parsePostId(url: string): string {
    const match = url.match(/reddit\.com\/r\/[^/]+\/comments\/([a-z0-9]+)/i);
    if (!match) {
      throw new Error(
        "Invalid Reddit URL. Expected format: https://www.reddit.com/r/<sub>/comments/<id>/..."
      );
    }
    return match[1];
  }

  /**
   * Fetch a Reddit thread and return its title plus top-level comments.
   * Externally visible.
   */
  async fetchThread(redditUrl: string): Promise<RedditThread> {
    const postId = this.parsePostId(redditUrl);
    const token = await this._getOAuthToken();
    const apiUrl = `https://oauth.reddit.com/comments/${postId}.json?limit=${MAX_COMMENTS}&raw_json=1`;

    let data: unknown;
    try {
      const res = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Reddit API returned HTTP ${res.status}`);
      }
      data = await res.json();
    } catch (err) {
      throw new Error(`Failed to reach Reddit API: ${(err as Error).message}`);
    }

    return this._parse(postId, data);
  }

  /**
   * Fetch the top N hot post URLs from a subreddit.
   * Returns full reddit.com URLs suitable for passing to fetchThread().
   * Externally visible.
   */
  async fetchSubredditHot(subreddit: string, limit = 3): Promise<string[]> {
    return this._fetchSubredditFeed(subreddit, "hot", limit);
  }

  /**
   * Fetch the N most recently submitted post URLs from a subreddit.
   * Updates every minute — use this for fresh content on each page load.
   * Externally visible.
   */
  async fetchSubredditNew(subreddit: string, limit = 10): Promise<string[]> {
    return this._fetchSubredditFeed(subreddit, "new", limit);
  }

  /** Shared fetcher for any subreddit feed (hot / new / rising). */
  private async _fetchSubredditFeed(subreddit: string, feed: string, limit: number): Promise<string[]> {
    const token = await this._getOAuthToken();
    const apiUrl = `https://oauth.reddit.com/r/${subreddit}/${feed}.json?limit=${limit}&raw_json=1`;
    try {
      const res = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { data: { children: Array<{ data: { id: string; stickied: boolean } }> } };
      return data.data.children
        .filter((c) => !c.data.stickied)
        .map((c) => `https://www.reddit.com/r/${subreddit}/comments/${c.data.id}`)
        .slice(0, limit);
    } catch (err) {
      throw new Error(`Failed to fetch r/${subreddit} ${feed}: ${(err as Error).message}`);
    }
  }

  /**
   * Obtain a Reddit OAuth access token using the client-credentials grant.
   * Token is cached in memory for its lifetime (~1 hour) so warm Lambda
   * invocations skip the extra round-trip.
   */
  private async _getOAuthToken(): Promise<string> {
    const now = Date.now();
    if (_cachedToken && now < _tokenExpiresAt - 60_000) {
      return _cachedToken;
    }

    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "Reddit OAuth credentials are not configured. " +
        "Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in Lambda environment variables."
      );
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      throw new Error(
        `Failed to reach Reddit API: Reddit OAuth token request failed with HTTP ${res.status}`
      );
    }

    const json = await res.json() as { access_token: string; expires_in: number };
    _cachedToken = json.access_token;
    _tokenExpiresAt = now + json.expires_in * 1000;
    return _cachedToken;
  }

  /** Parse the raw Reddit API response into our domain shape. */
  private _parse(postId: string, data: unknown): RedditThread {
    const listings = data as Array<{ data: { children: Array<{ data: { title?: string } }> } }>;

    if (!Array.isArray(listings) || listings.length < 2) {
      throw new Error("Unexpected Reddit API response format");
    }

    const postData = listings[0]?.data?.children?.[0]?.data;
    const title: string = (postData as { title?: string })?.title ?? "Reddit Thread";

    const commentChildren = listings[1]?.data?.children ?? [];

    const comments: RedditComment[] = [];
    for (const child of commentChildren as Array<{ kind: string; data: { id: string; author: string; body: string } }>) {
      if (child.kind !== "t1") continue;
      const d = child.data;
      // Skip deleted / removed / AutoModerator
      if (!d.body || d.body === "[deleted]" || d.body === "[removed]") continue;
      if (!d.author || d.author === "[deleted]" || d.author === "AutoModerator") continue;
      comments.push({
        id: `reddit_comment_${d.id}`,
        author: d.author,
        content: d.body.slice(0, 2000), // cap length
      });
      if (comments.length >= MAX_COMMENTS) break;
    }

    if (comments.length === 0) {
      throw new Error("No readable comments found in this Reddit thread");
    }

    return {
      threadId: `reddit_${postId}`,
      title,
      comments,
    };
  }
}
