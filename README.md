# Embeddable M3U8 Player

A self-hosted HLS stream player with built-in CORS proxy for streams that block cross-origin requests.

## Quick Start

```bash
npm start
```

Open http://localhost:3000 in your browser.

## How It Works

The server acts as a proxy that:
1. Fetches the M3U8 stream with spoofed `Origin` and `Referer` headers
2. Rewrites segment URLs to route through the proxy
3. Serves everything with proper CORS headers

## Embedding

```html
<iframe 
    src="http://your-server:3000" 
    width="100%" 
    height="100%" 
    frameborder="0" 
    allow="autoplay; fullscreen" 
    allowfullscreen>
</iframe>
```

## Deployment

Deploy to any Node.js host (Heroku, Railway, Render, VPS, etc.):

```bash
# Set port via environment variable
PORT=8080 node server.js
```

## Files

- `server.js` - Proxy server with header spoofing
- `index.html` - Autoplay fullscreen HLS player
- `package.json` - Project configuration
