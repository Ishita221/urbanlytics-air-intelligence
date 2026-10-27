declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    OPENAQ_API_KEY?: string;
    FIRMS_MAP_KEY?: string;
  }
}
