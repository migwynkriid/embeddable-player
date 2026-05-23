const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;
const TARGET_BASE = 'https://streamer.nknews.org';
const ALLOWED_ORIGIN = 'https://kcnawatch.org';

const server = http.createServer((req, res) => {
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Serve the player HTML
    if (req.url === '/' || req.url === '/index.html') {
        const fs = require('fs');
        const path = require('path');
        const htmlPath = path.join(__dirname, 'index.html');
        
        fs.readFile(htmlPath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading player');
                return;
            }
            res.setHeader('Content-Type', 'text/html');
            res.writeHead(200);
            res.end(data);
        });
        return;
    }

    // Proxy stream requests
    if (req.url.startsWith('/stream/')) {
        const streamPath = req.url.replace('/stream', '');
        const targetUrl = TARGET_BASE + streamPath;
        
        console.log(`Proxying: ${targetUrl}`);

        const options = {
            hostname: 'streamer.nknews.org',
            path: streamPath,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:149.0) Gecko/20100101 Firefox/149.0',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'identity', // No compression for simpler handling
                'Origin': ALLOWED_ORIGIN,
                'Referer': ALLOWED_ORIGIN + '/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            // Get content type from upstream
            let contentType = proxyRes.headers['content-type'] || 'application/octet-stream';
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'no-cache');

            // For m3u8 files, rewrite URLs to go through proxy
            if (contentType.includes('mpegurl') || streamPath.endsWith('.m3u8')) {
                let body = '';
                proxyRes.on('data', chunk => body += chunk);
                proxyRes.on('end', () => {
                    // Rewrite relative URLs to go through our proxy
                    // Match lines that are just segment filenames (not starting with # or /)
                    const rewritten = body.replace(/^([a-zA-Z0-9_-]+\.ts)$/gm, '/stream/tvhls/$1')
                                          .replace(/^([a-zA-Z0-9_-]+\.m3u8)$/gm, '/stream/tvhls/$1');
                    res.writeHead(proxyRes.statusCode);
                    res.end(rewritten);
                });
            } else {
                // Stream binary data directly (for .ts segments)
                // Pass through content-length for binary files
                if (proxyRes.headers['content-length']) {
                    res.setHeader('Content-Length', proxyRes.headers['content-length']);
                }
                res.writeHead(proxyRes.statusCode);
                proxyRes.pipe(res);
            }
        });

        proxyReq.on('error', (err) => {
            console.error('Proxy error:', err.message);
            res.writeHead(502);
            res.end('Proxy error: ' + err.message);
        });

        proxyReq.end();
        return;
    }

    // 404 for unknown routes
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`\n🎬 Stream proxy server running at http://localhost:${PORT}`);
    console.log(`📺 Open http://localhost:${PORT} in your browser to watch\n`);
});
