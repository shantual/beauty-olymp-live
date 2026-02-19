/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://basmanovatatyana.getcourse.ru https://beup.beolymp.ru;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
