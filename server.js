const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Normalize and parse requested URL path
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  } else if (reqPath === '/about' || reqPath === '/about/') {
    reqPath = '/about.html';
  }

  // Log non-image requests or periodic image requests
  if (!reqPath.includes('.jpg')) {
    console.log(`[${req.method}] ${reqPath}`);
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // Handle Property Inquiry Submission API
  if (req.method === 'POST' && reqPath === '/api/inquiry') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { projectType, propertyType, propertyArea, constructionDate, location, phoneNumber, fullName } = data;

        const errors = {};
        if (!projectType) errors.projectType = 'Please select a project type.';
        if (!fullName || fullName.trim().length < 2) errors.fullName = 'Please enter your full name.';
        if (!phoneNumber || !/^[0-9+\s().-]{7,25}$/.test(phoneNumber.trim())) {
          errors.phoneNumber = 'Please enter a valid phone number (min 7 digits).';
        }
        if (!propertyType || propertyType.trim().length === 0) errors.propertyType = 'Please enter property type.';
        if (!location || location.trim().length === 0) errors.location = 'Please enter preferred location.';

        if (Object.keys(errors).length > 0) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          return res.end(JSON.stringify({ success: false, errors }));
        }

        const inquiryId = `LX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
        const record = {
          inquiryId,
          timestamp: new Date().toISOString(),
          projectType,
          propertyType: propertyType.trim(),
          propertyArea: propertyArea ? propertyArea.trim() : 'Flexible',
          constructionDate: constructionDate ? constructionDate.trim() : 'Immediate',
          location: location.trim(),
          phoneNumber: phoneNumber.trim(),
          fullName: fullName.trim()
        };

        const inquiriesFile = path.join(ROOT_DIR, 'inquiries.json');
        let allInquiries = [];
        try {
          if (fs.existsSync(inquiriesFile)) {
            allInquiries = JSON.parse(fs.readFileSync(inquiriesFile, 'utf8') || '[]');
          }
        } catch (e) {
          allInquiries = [];
        }
        allInquiries.push(record);
        fs.writeFileSync(inquiriesFile, JSON.stringify(allInquiries, null, 2), 'utf8');

        console.log(`[INQUIRY SAVED] ${inquiryId} - ${record.fullName} (${record.phoneNumber}) for ${record.projectType}`);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(JSON.stringify({
          success: true,
          message: 'Thank you! Your inquiry has been received. Our team will contact you shortly.',
          inquiryId,
          data: record
        }));
      } catch (err) {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(JSON.stringify({ success: false, error: 'Invalid JSON request payload' }));
      }
    });
    return;
  }

  let safePath = path.normalize(path.join(ROOT_DIR, reqPath));

  // Security check to ensure requested path is within project root
  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  // Automatic clean URL and directory index fallback
  try {
    if (fs.existsSync(safePath)) {
      if (fs.statSync(safePath).isDirectory()) {
        const indexPath = path.join(safePath, 'index.html');
        if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
          safePath = indexPath;
        }
      }
    } else {
      if (fs.existsSync(safePath + '.html') && fs.statSync(safePath + '.html').isFile()) {
        safePath = safePath + '.html';
      }
    }
  } catch (e) {
    // Continue to standard stat check
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Access-Control-Allow-Origin': '*'
    };

    // Cache images aggressively for smooth scrubbing
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.png') {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'no-cache';
    }

    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      return res.end();
    }
    fs.createReadStream(safePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
