/**
 * RedditService – fetches real thread data from Reddit's public JSON API.
 *
 * No authentication required for public posts.
 * API: https://www.reddit.com/r/{sub}/comments/{id}.json?limit=25&raw_json=1
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

const USER_AGENT = "Mozilla/5.0 (compatible; CS485DebateAnalyzer/1.0; +https://github.com/aum-2004/CS485-Term-Project)";
const MAX_COMMENTS = 25;

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
    const apiUrl = `https://old.reddit.com/comments/${postId}.json?limit=${MAX_COMMENTS}&raw_json=1`;

    let data: unknown;
    try {
      const res = await fetch(apiUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
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
    const apiUrl = `https://old.reddit.com/r/${subreddit}/${feed}.json?limit=${limit}&raw_json=1`;
    try {
      const res = await fetch(apiUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Accept-Language": "en-US,en;q=0.9" },
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
