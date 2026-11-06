// TinyURL shortening proxy — plain Node.js web service (Render version).
// Same logic as the Vercel serverless function: the browser cannot call
// TinyURL directly (TinyURL blocks cross-origin requests), so this service
// calls TinyURL server-side and returns the short link. Nothing is stored:
// the URL is processed in memory only and no logs, files or databases
// are written.
const http = require('http');

const TINYURL_API = 'https://tinyurl.com/api-create.php';
const PORT = process.env.PORT || 10000;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  };
}

function sendJson(res, status, body) {
  const headers = { ...corsHeaders(), 'Content-Type': 'application/json' };
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 10000) req.destroy();
    });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  if (url.pathname === '/' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, service: 'tinyurl-proxy' });
  }

  if (url.pathname !== '/api/shorten') {
    return sendJson(res, 404, { error: 'Not found.' });
  }

  let longUrl = '';
  if (req.method === 'GET') {
    longUrl = url.searchParams.get('url') || '';
  } else if (req.method === 'POST') {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      longUrl = typeof body.url === 'string' ? body.url : '';
    } catch {
      longUrl = '';
    }
  } else {
    return sendJson(res, 405, { error: 'Method not allowed. Use GET or POST.' });
  }

  let parsed;
  try {
    parsed = new URL(longUrl);
  } catch {
    return sendJson(res, 400, { error: 'A valid URL is required.' });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return sendJson(res, 400, { error: 'Only http and https URLs can be shortened.' });
  }

  try {
    const upstream = await fetch(
      `${TINYURL_API}?url=${encodeURIComponent(longUrl)}`,
      { method: 'GET', redirect: 'follow' }
    );
    const shortUrl = (await upstream.text()).trim();
    if (!upstream.ok || !shortUrl.startsWith('http')) {
      return sendJson(res, 502, { error: 'TinyURL did not return a short link.' });
    }
    return sendJson(res, 200, { shortUrl });
  } catch {
    return sendJson(res, 502, { error: 'Could not reach TinyURL. Please try again.' });
  }
});

server.listen(PORT, () => {
  console.log(`tinyurl-proxy listening on port ${PORT}`);
});
