const crypto = require('crypto');

/**
 * Generate random string of specified length
 */
function generateRandomString(length = 10) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Generate malicious payloads for security testing
 */
function generatePayloads(type) {
  const payloads = {
    xss: [
      '<script>alert("xss")</script>',
      '"><script>alert("xss")</script>',
      '<img src="x" onerror="alert(\'xss\')">', 
      'javascript:alert("xss")',
      '<svg onload="alert(\'xss\')">'
    ],
    sql: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users; --",
      "') OR ('1'='1",
      "admin'--"
    ],
    noSql: [
      '{ "$gt": "" }',
      '{ "$ne": null }',
      '{ "$where": "function() { return true; }" }',
      '{ "$regex": ".*" }',
      '{"$gt": ""}'
    ],
    commandInjection: [
      '; ls -la',
      '| cat /etc/passwd',
      '`` rm -rf /',
      '$(echo vulnerable)',
      '; ping -c 4 attacker.com'
    ],
    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\SAM',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '....//....//....//etc/passwd',
      '/dev/null'
    ],
    fileUpload: [
      'file.php%00.jpg',  // Null byte injection
      '../../file.php',   // Path traversal
      'file.jpg.php',     // Double extension
      'file.PHP5',        // Case sensitivity
      'file.phtml'        // Alternative extensions
    ],
    headers: {
      'X-Forwarded-For': ['127.0.0.1', 'localhost', '0.0.0.0'],
      'X-Forwarded-Host': ['evil.com', '127.0.0.1:80'],
      'X-Frame-Options': ['ALLOWALL', 'null'],
      'Content-Security-Policy': ['none', '*']
    },
    cookies: [
      'javascript:alert(1)',
      '"><script>alert(1)</script>',
      '; document.cookie="stolen="+document.cookie; //',
      'PHPSESSID=../../../etc/passwd'
    ]
  };

  return payloads[type] || [];
}

/**
 * Generate test files with various MIME types
 */
function generateTestFiles() {
  return [
    { 
      name: 'test.exe', 
      content: Buffer.from('MZ'), 
      type: 'application/x-msdownload' 
    },
    { 
      name: 'test.php', 
      content: Buffer.from('<?php ?>'), 
      type: 'application/x-httpd-php' 
    },
    { 
      name: 'test.jpg', 
      content: Buffer.from('JFIF'), 
      type: 'image/jpeg' 
    },
    { 
      name: 'test.html', 
      content: Buffer.from('<html></html>'), 
      type: 'text/html' 
    },
    {
      name: 'test.js',
      content: Buffer.from('alert(1)'),
      type: 'application/javascript'
    },
    {
      name: 'test.svg',
      content: Buffer.from('<svg onload="alert(1)"></svg>'),
      type: 'image/svg+xml'
    }
  ];
}

/**
 * Generate mock IP addresses for testing
 */
function generateIpAddresses(count = 5) {
  return Array(count).fill().map((_, i) => 
    `192.168.1.${i + 1}`
  );
}

/**
 * Generate problematic authentication tokens
 */
function generateBadTokens() {
  return [
    'totally.invalid.token',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    'expired.token.here',
    'malformed.token',
    '',
    null,
    undefined,
    'Bearer ',
    'Basic YWRtaW46YWRtaW4=',  // Basic auth: admin:admin
    'Bearer null',
    'Bearer undefined'
  ];
}

/**
 * Generate test user data
 */
function generateTestUser() {
  const timestamp = Date.now();
  return {
    email: `test${timestamp}@example.com`,
    password: `TestP@ssw0rd${timestamp}`,
    firstName: 'Test',
    lastName: 'User'
  };
}

/**
 * Generate known vulnerable endpoints
 */
function getVulnerableEndpoints() {
  return {
    fileOperations: [
      '/api/upload',
      '/api/download',
      '/api/export',
      '/api/import'
    ],
    authentication: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/reset-password',
      '/api/auth/forgot-password'
    ],
    dataAccess: [
      '/api/users',
      '/api/events',
      '/api/admin',
      '/api/reports'
    ]
  };
}

/**
 * Generate security test metadata
 */
function getTestMetadata() {
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    testSuite: 'security',
    serverInfo: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
}

module.exports = {
  generateRandomString,
  generatePayloads,
  generateTestFiles,
  generateIpAddresses,
  generateBadTokens,
  generateTestUser,
  getVulnerableEndpoints,
  getTestMetadata
};