
import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  // IMPORTANT: Replace 'https://landshare.example.com' with your actual production domain.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://landshare.example.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/profile/', '/my-listings/', '/bookings/', '/transactions/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
