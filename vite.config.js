import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { makeGenericAPIRouteHandler } from '@keystatic/core/api/generic';
import config from './keystatic.config';

// ... (keystaticMiddleware stays the same) ...
const keystaticMiddleware = () => {
  return {
    name: 'keystatic-middleware',
    configureServer(server) {
      server.middlewares.use('/api/keystatic', async (req, res, next) => {
        try {
          const url = `http://${req.headers.host}/api/keystatic${req.url}`;
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
              if (Array.isArray(value)) {
                  value.forEach(v => headers.append(key, v));
              } else if (typeof value === 'string') {
                  headers.append(key, value);
              }
          }

          const request = new Request(url, {
            method: req.method,
            headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' 
              ? await readBody(req) 
              : undefined,
          });

          const response = await makeGenericAPIRouteHandler({ config })(request);

          res.statusCode = response.status;
          const responseHeaders = response.headers || {};
          if (responseHeaders instanceof Headers || (responseHeaders.entries && typeof responseHeaders.entries === 'function')) {
            for (const [key, value] of responseHeaders.entries()) {
               res.setHeader(key, value);
            }
          } else if (typeof responseHeaders.forEach === 'function') {
             responseHeaders.forEach((value, key) => {
                res.setHeader(key, value);
             });
          } else {
            for (const [key, value] of Object.entries(responseHeaders)) {
              res.setHeader(key, value);
            }
          }

          if (typeof response.text === 'function') {
            const text = await response.text();
            res.end(text);
          } else if (response.body) {
             if (typeof response.body === 'string' || Buffer.isBuffer(response.body)) {
                res.end(response.body);
             } else if (response.body.pipe) {
                response.body.pipe(res);
             } else if (response.body.getReader) {
                const reader = response.body.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(value);
                }
                res.end();
             } else {
               res.end(JSON.stringify(response.body));
             }
          } else {
            res.end();
          }
        } catch (err) {
          console.error('Keystatic API Error:', err);
          next(err);
        }
      });
    },
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), keystaticMiddleware()],
  server: {
    port: 5174,
    strictPort: true,
    host: true,
    proxy: {

      '/api': {
        target: 'https://pixelpop-test.up.railway.app',
        changeOrigin: true,
        secure: false,
        // rewrite: (path) => path.replace(/^\/api/, ''), 
      },
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  }
})
