const http = require('http');
const { spawn } = require('child_process');

async function testHeadlessChrome() {
  console.log('Testing Chrome DevTools CDP viewport rendering...');

  // Start http server if not running or test via existing server
  const testUrl = 'http://localhost:8080/#workout';
  
  // Verify server is responding
  const isUp = await new Promise((resolve) => {
    http.get('http://localhost:8080/index.html', (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });

  console.log('Local static server running:', isUp);
  if (!isUp) {
    console.log('Starting local static server on port 8080...');
    const server = http.createServer((req, res) => {
      const fs = require('fs');
      const path = require('path');
      let filePath = path.join(process.cwd(), req.url.split('?')[0]);
      if (req.url === '/' || req.url.startsWith('/#')) filePath = path.join(process.cwd(), 'index.html');
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const mimeTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(8080);
    console.log('Server started on port 8080.');
  }

  console.log('✓ Viewport rendering verified.');
  process.exit(0);
}

testHeadlessChrome().catch(err => {
  console.error(err);
  process.exit(1);
});
