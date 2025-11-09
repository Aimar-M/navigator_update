import { Helmet } from "react-helmet-async";
import { SITE_CONFIG, SEO_PAGES } from "@/lib/seo-constants";

interface SEOProps {
  page: keyof typeof SEO_PAGES;
  path?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

export function SEO({ page, path, noindex = false, nofollow = false }: SEOProps) {
  const pageData = SEO_PAGES[page];
  const canonicalPath = path || pageData.path;
  // Always use non-www URL for canonical (strip www if present)
  const baseUrl = SITE_CONFIG.url.replace(/^https?:\/\/(www\.)?/, 'https://');
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const ogImage = SITE_CONFIG.ogImage;

  // Organization structured data
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": SITE_CONFIG.company,
    "url": SITE_CONFIG.url,
    "logo": {
      "@type": "ImageObject",
      "url": `${SITE_CONFIG.url}/android-chrome-512x512.png`,
      "width": 512,
      "height": 512
    },
    "image": `${SITE_CONFIG.url}/android-chrome-512x512.png`,
    "description": SITE_CONFIG.description,
    "email": SITE_CONFIG.email,
    "sameAs": [] as string[], // Add social media URLs when available
  };

  // WebApplication structured data (for home page)
  const webApplicationSchema = page === "home" ? {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": SITE_CONFIG.name,
    "applicationCategory": "TravelApplication",
    "operatingSystem": "Web, iOS, Android",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "description": SITE_CONFIG.description,
    "url": SITE_CONFIG.url,
    "image": `${SITE_CONFIG.url}/android-chrome-512x512.png`,
    "screenshot": ogImage,
    "publisher": {
      "@type": "Organization",
      "name": SITE_CONFIG.company,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_CONFIG.url}/android-chrome-512x512.png`
      }
    },
  } : null;

  // BreadcrumbList structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": SITE_CONFIG.url,
      },
      ...(page !== "home" ? [{
        "@type": "ListItem",
        "position": 2,
        "name": pageData.title.split(" — ")[1] || pageData.title,
        "item": canonicalUrl,
      }] : []),
    ],
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{pageData.title}</title>
      <meta name="title" content={pageData.title} />
      <meta name="description" content={pageData.description} />
      <meta name="keywords" content={pageData.keywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex" />}
      {nofollow && <meta name="robots" content="nofollow" />}
      {!noindex && !nofollow && <meta name="robots" content="index, follow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={pageData.title} />
      <meta property="og:description" content={pageData.description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_CONFIG.name} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={pageData.title} />
      <meta name="twitter:description" content={pageData.description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Additional Meta Tags */}
      <meta name="author" content={SITE_CONFIG.company} />
      <meta name="theme-color" content="#2563eb" />
      <meta name="image" content={`${SITE_CONFIG.url}/android-chrome-512x512.png`} />
      <meta httpEquiv="content-language" content="en" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="distribution" content="global" />
      <meta name="rating" content="general" />

      {/* Structured Data - JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      {webApplicationSchema && (
        <script type="application/ld+json">
          {JSON.stringify(webApplicationSchema)}
        </script>
      )}
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
    </Helmet>
  );
}

