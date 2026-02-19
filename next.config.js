/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // применяем заголовки ко всем путям
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // разрешаем встраивать сайт только самому себе и GetCourse
            value: "frame-ancestors 'self' https://basmanovatatyana.getcourse.ru;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
