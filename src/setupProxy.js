const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api': '/api', // Rewrite the path to remove /api if needed
      },
      onProxyReq: (proxyReq, req, res) => {
        // Add CORS headers
        proxyReq.setHeader('Access-Control-Allow-Origin', '*');
        proxyReq.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        proxyReq.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
        
        // Log the proxy request for debugging
        console.log('Proxying request:', {
          method: proxyReq.method,
          path: proxyReq.path,
          headers: proxyReq.getHeaders(),
        });
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({
          error: 'Proxy Error',
          details: err.message,
        });
      },
    })
  );
};
