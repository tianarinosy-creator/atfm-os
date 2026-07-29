/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Nécessaire pour l'image Docker de production (apps/web/Dockerfile) : ne
  // copie que la trace des modules réellement utilisés, pas tout node_modules.
  output: "standalone",
};

export default nextConfig;
