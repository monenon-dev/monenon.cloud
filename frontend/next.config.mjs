/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // lesson (titanic)
      { source: "/titanic-home", destination: "/lesson/titanic-home", permanent: true },
      { source: "/titanic-home/:path*", destination: "/lesson/titanic-home/:path*", permanent: true },
      { source: "/silicon-valley/admin", destination: "/lesson/silicon-valley/admin", permanent: true },
      // lifestyle
      { source: "/closet", destination: "/lifestyle/closet", permanent: true },
      { source: "/refrigerator", destination: "/lifestyle/refrigerator", permanent: true },
      { source: "/chats", destination: "/lifestyle/chats", permanent: true },
      { source: "/music", destination: "/lifestyle/music", permanent: true },
      { source: "/dashboard", destination: "/lifestyle/dashboard", permanent: true },
      { source: "/schedule", destination: "/lifestyle/schedule", permanent: true },
      { source: "/settings", destination: "/oauth/mypage?section=preferences", permanent: false },
      { source: "/lifestyle/settings", destination: "/oauth/mypage?section=preferences", permanent: false },
      { source: "/agent-settings", destination: "/oauth/mypage?section=preferences", permanent: false },
      { source: "/mypage/preferences", destination: "/oauth/mypage?section=preferences", permanent: false },
      // oauth
      { source: "/login", destination: "/oauth/login", permanent: true },
      { source: "/signup", destination: "/oauth/signup", permanent: true },
      { source: "/mypage", destination: "/oauth/mypage", permanent: true },
      { source: "/admin", destination: "/oauth/admin", permanent: true },
      { source: "/admin/login", destination: "/oauth/admin/login", permanent: true },
      { source: "/admin/dashboard", destination: "/oauth/admin/dashboard", permanent: true },
      { source: "/admin/user-settings", destination: "/oauth/admin/user-settings", permanent: true },
      // mails
      { source: "/mailbox", destination: "/mails/mailbox", permanent: true },
      { source: "/mail", destination: "/mails/mail", permanent: true },
      { source: "/calendar", destination: "/mails/calendar", permanent: true },
    ];
  },
};

export default nextConfig;
