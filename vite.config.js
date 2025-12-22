import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { makeGenericAPIRouteHandler } from '@keystatic/core/api/generic';
import config from './keystatic.config';

// Custom plugin to handle Keystatic API routes in Vite dev server
const keystaticMiddleware = () => {
  return {
    name: 'keystatic-middleware',
    configureServer(server) {
      server.middlewares.use('/api/keystatic', async (req, res, next) => {
        try {
          // Create a standard Web Request object from Node's req
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

          // Send response back
          res.statusCode = response.status;
          // Headers
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

          // Body Handling
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}



const generationMiddleware = () => {
  return {
    name: 'generation-middleware',
    configureServer(server) {
      server.middlewares.use('/api/generation', async (req, res, next) => {
        console.log(`[Middleware] Hit /api/generation path. Method: ${req.method} URL: ${req.url}`);
        if (req.method === 'POST') {
          try {
            const bodyBuffer = await readBody(req);
            const body = JSON.parse(bodyBuffer.toString());
            
            console.log('----------------------------------------');
            console.log('📷 GENERATION REQUEST RECEIVED');
            console.log('Model:', body.model_config.model);
            console.log('Quality:', body.model_config.quality);
            console.log('Prompt:', body.prompt);
            console.log('Style ID:', body.style_id);
            console.log('----------------------------------------');

            // Simulate High Quality generation delay (e.g. 2-3 seconds)
            await new Promise(resolve => setTimeout(resolve, 2000));

            const response = {
              status: 'success',
              image_url: 'https://placehold.co/1024x1024/png?text=AI+Generated+Image', // Mock response
              metadata: {
                model: body.model_config.model,
                tokens_used: 4160 // Example for High Quality
              }
            };

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response));
          } catch (err) {
            console.error('Generation Middleware Error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        } else {
          next();
        }
      });
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [generationMiddleware(), react(), keystaticMiddleware()],
  server: {
    port: 5174,
    strictPort: true,
    host: true
  }
})
