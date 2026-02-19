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
              "frame-ancestors 'self' https://basmanovatatyana.getcourse.ru https://beup.beolymp.ru https://1olymp.ru https://www.1olymp.ru/;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
