
import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  // Use the NEXT_PUBLIC_SITE_URL environment variable if it exists, otherwise fallback.
  // This variable is set by the App Hosting build process.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.landhare.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/profile/', '/my-listings/', '/bookings/', '/transactions/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
