# tinyurl-proxy

A tiny serverless-style proxy for TinyURL shortening.

Browsers cannot call TinyURL directly (TinyURL blocks cross-origin
requests), so this service calls TinyURL server-side and returns the
short link. Nothing is stored: the URL is processed in memory only.

## Endpoints

- `GET /api/shorten?url=<long-url>`
- `POST /api/shorten` with JSON body `{"url": "<long-url>"}`
- `GET /` health check

Both return JSON: `{"shortUrl": "https://tinyurl.com/..."}`.

## Run

```bash
npm install
npm start
```

Deployed on Render (free plan) as a fallback for the Vercel deployment.
