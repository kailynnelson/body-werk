/** @type {import('next').NextConfig} */
import { readFileSync } from 'fs';
import { join } from 'path';

const nextConfig = {
  server: {
    https: {
      key: readFileSync('./certificates/key.pem'),
      cert: readFileSync('./certificates/cert.pem'),
    },
  },
};

export default nextConfig; 