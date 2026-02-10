// ESP8266 OTA Update Server
// This server hosts firmware files for ESP8266 devices

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS (allow ESP8266 to access our server)
app.use(cors());

// Serve static files from 'public' directory
app.use(express.static('public'));

// Logging middleware (shows all requests in console)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// ============================================
// API ENDPOINTS
// ============================================

// Root endpoint - Shows welcome page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ESP8266 OTA Server</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          max-width: 800px;
          width: 100%;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
          font-size: 2.5em;
        }
        .subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 1.1em;
        }
        .status {
          background: #e8f5e9;
          border-left: 4px solid #4caf50;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .status.online {
          background: #e8f5e9;
          border-color: #4caf50;
        }
        .section {
          margin: 30px 0;
        }
        .section h2 {
          color: #444;
          margin-bottom: 15px;
          font-size: 1.5em;
        }
        .endpoint {
          background: #f5f5f5;
          padding: 15px;
          margin: 10px 0;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s;
        }
        .endpoint:hover {
          background: #e0e0e0;
          transform: translateX(5px);
        }
        .endpoint a {
          color: #667eea;
          text-decoration: none;
          font-weight: bold;
        }
        .endpoint a:hover {
          text-decoration: underline;
        }
        .endpoint .desc {
          color: #666;
          font-size: 0.9em;
          font-family: 'Segoe UI', sans-serif;
        }
        .code-block {
          background: #2d2d2d;
          color: #f8f8f2;
          padding: 20px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 15px 0;
          font-family: 'Courier New', monospace;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #999;
          font-size: 0.9em;
        }
        .badge {
          display: inline-block;
          padding: 5px 15px;
          background: #4caf50;
          color: white;
          border-radius: 20px;
          font-size: 0.9em;
          margin-left: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 ESP8266 OTA Server</h1>
        <p class="subtitle">Over-The-Air Firmware Update Service</p>
        
        <div class="status online">
          <strong>✅ Status:</strong> Server is running and ready to serve firmware updates!
          <span class="badge">ONLINE</span>
        </div>

        <div class="section">
          <h2>📡 Available Endpoints</h2>
          <p>Your ESP8266 devices can access these URLs:</p>
          
          <div class="endpoint">
            <div>
              <a href="/version.txt" target="_blank">/version.txt</a>
              <div class="desc">Current firmware version number</div>
            </div>
          </div>
          
          <div class="endpoint">
            <div>
              <a href="/firmware.bin" target="_blank">/firmware.bin</a>
              <div class="desc">Firmware binary file for ESP8266</div>
            </div>
          </div>
          
          <div class="endpoint">
            <div>
              <a href="/firmware.md5" target="_blank">/firmware.md5</a>
              <div class="desc">MD5 checksum for firmware verification</div>
            </div>
          </div>
          
          <div class="endpoint">
            <div>
              <a href="/api/version" target="_blank">/api/version</a>
              <div class="desc">JSON API with version information</div>
            </div>
          </div>
          
          <div class="endpoint">
            <div>
              <a href="/health" target="_blank">/health</a>
              <div class="desc">Server health check endpoint</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>💻 ESP8266 Code Example</h2>
          <p>Use this URL in your ESP8266 sketch:</p>
          <div class="code-block">
const char* serverURL = "${req.protocol}://${req.get('host')}";<br>
const char* versionURL = "${req.protocol}://${req.get('host')}/version.txt";<br>
const char* firmwareURL = "${req.protocol}://${req.get('host')}/firmware.bin";
          </div>
        </div>

        <div class="section">
          <h2>📊 How to Update Firmware</h2>
          <ol style="line-height: 2; color: #555;">
            <li>Build new firmware in Arduino IDE</li>
            <li>Export compiled binary (Sketch → Export compiled Binary)</li>
            <li>Generate MD5 checksum</li>
            <li>Update version.txt with new version number</li>
            <li>Replace files in public/ folder</li>
            <li>Push to GitHub (Render auto-deploys)</li>
          </ol>
        </div>

        <div class="footer">
          <p>Made with ❤️ for ESP8266 OTA Updates</p>
          <p>Powered by Render.com • Node.js • Express</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Get version as plain text
app.get('/version.txt', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'version.txt');
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('version.txt not found');
  }
});

// Get firmware binary
app.get('/firmware.bin', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'firmware.bin');
  
  if (fs.existsSync(filePath)) {
    console.log(`📦 Serving firmware.bin to ${req.ip}`);
    res.sendFile(filePath);
  } else {
    res.status(404).send('firmware.bin not found');
  }
});

// Get MD5 checksum
app.get('/firmware.md5', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'firmware.md5');
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('firmware.md5 not found');
  }
});

// JSON API endpoint with full version info
app.get('/api/version', (req, res) => {
  try {
    const versionFile = path.join(__dirname, 'public', 'version.txt');
    const md5File = path.join(__dirname, 'public', 'firmware.md5');
    
    let version = 'unknown';
    let md5 = 'unknown';
    
    if (fs.existsSync(versionFile)) {
      version = fs.readFileSync(versionFile, 'utf8').trim();
    }
    
    if (fs.existsSync(md5File)) {
      md5 = fs.readFileSync(md5File, 'utf8').trim();
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({
      version: version,
      md5: md5,
      timestamp: new Date().toISOString(),
      server: 'ESP8266 OTA Server',
      endpoints: {
        version: `${baseUrl}/version.txt`,
        firmware: `${baseUrl}/firmware.bin`,
        md5: `${baseUrl}/firmware.md5`
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to read version info',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Not Found</h1>
    <p>The endpoint <code>${req.url}</code> does not exist.</p>
    <p><a href="/">Go back to home</a></p>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   ESP8266 OTA UPDATE SERVER           ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log('');
  console.log('📁 Serving files from: public/');
  console.log('');
  console.log('Available endpoints:');
  console.log('  - GET /              → Home page');
  console.log('  - GET /version.txt   → Firmware version');
  console.log('  - GET /firmware.bin  → Firmware binary');
  console.log('  - GET /firmware.md5  → MD5 checksum');
  console.log('  - GET /api/version   → JSON version info');
  console.log('  - GET /health        → Health check');
  console.log('');
  console.log('🔄 Waiting for ESP8266 connections...');
  console.log('════════════════════════════════════════');
});