/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    domains: ['res.cloudinary.com'],
  },
  async rewrites() {
    return [
      {
        source: '/reset-password',
        destination: '/reset-password',
      },
    ];
  },
  // Optional: Add if you need environment variables in the browser
  env: {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL, // Add for password reset redirect
  },
};