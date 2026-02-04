// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Enable React strict mode for highlighting potential problems
}

// Export security headers for all routes
module.exports = {
  async headers() { // Define custom HTTP headers for security
    return [
      {
        // Apply these headers to all routes
        source: "/(.*)",
        headers: [
          { 
            key: "Referrer-Policy",  // Controls referrer information sent with requests
            value: "strict-origin-when-cross-origin" 
          }, 
          { 
            key: "X-Frame-Options", // Prevents site from being embedded in <iframe></iframe>
            value: "DENY" 
          },
          { 
            key: "X-Content-Type-Options", // Prevents MIME type sniffing
            value: "nosniff" 
          }, // Prevents executing malicious files as scripts
          {
            key: "X-XSS-Protection", // Enables XSS filtering
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security", // Enforces secure (HTTP over SSL/TLS) connections to the server
            value: "max-age=63072000; includeSubDomains; preload", // 2 years, applies to subdomains, preload
          },
          {
            key: "Permissions-Policy", // Disable sensitive browser features
            value: "microphone=(), geolocation=()", // Camera not disabled
          },
        ],
      },
    ];
  },
};
