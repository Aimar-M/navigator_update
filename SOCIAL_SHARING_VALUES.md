# Social Sharing Meta Tags - Current Values

## 📋 Complete Breakdown

### **Title (og:title / twitter:title)**
**Property:** `og:title`  
**Content:** Varies by page (from `SEO_PAGES`)

**Home Page:**
```
Navigator — Group Travel Planner | Plan Trips with Friends | Navigator 1802
```

**Other Pages:**
- About: `About — Navigator Technologies 1802`
- Contact: `Contact — Navigator`
- Terms: `Terms of Service — Navigator`
- Privacy: `Privacy Policy — Navigator`
- Legal: `Legal — Navigator Technologies 1802`

**Fallback (index.html):**
```
Navigator — One-Stop shop for group trips
```

---

### **Site Name (og:site_name)**
**Property:** `og:site_name`  
**Content:** `Navigator`  
**Source:** `SITE_CONFIG.name`

---

### **URL (og:url / twitter:url)**
**Property:** `og:url`  
**Content:** Dynamic based on current page

**Home Page:**
```
https://navigatortrips.com/
```

**Other Pages:**
```
https://navigatortrips.com/about
https://navigatortrips.com/contact
https://navigatortrips.com/terms
https://navigatortrips.com/privacy
https://navigatortrips.com/legal
```

**Fallback (index.html):**
```
https://navigatortrips.com
```

---

### **Description (og:description / twitter:description)**
**Property:** `og:description`  
**Content:** Varies by page (from `SEO_PAGES`)

**Home Page:**
```
Navigator is the best group travel planner for planning trips with friends. Plan group trips, split expenses, coordinate flights, and chat — all in one place. Navigator 1802 makes travel planning simple.
```

**Other Pages:**
- About: `Learn about Navigator Technologies 1802, the team building seamless tools to simplify group travel and coordination.`
- Contact: `Get in touch with Navigator Technologies 1802. We're here to help you simplify your next group adventure.`
- Terms: `Read the terms and conditions for using Navigator's group travel tools and services.`
- Privacy: `Learn how Navigator Technologies 1802 handles your data responsibly and transparently.`
- Legal: `Legal information and compliance resources for Navigator Technologies 1802.`

**Fallback (index.html):**
```
Plan group trips effortlessly with Navigator. Split expenses, coordinate flights, chat, and vote on plans — all in one place.
```

---

### **Image (og:image / twitter:image)**
**Property:** `og:image`  
**Content:** `https://navigatortrips.com/og-image.png`  
**Source:** `SITE_CONFIG.ogImage`

**Additional Image Meta Tags:**
- `og:image:url`: `https://navigatortrips.com/og-image.png`
- `og:image:secure_url`: `https://navigatortrips.com/og-image.png`
- `og:image:type`: `image/png`
- `og:image:width`: `1200`
- `og:image:height`: `630`
- `og:image:alt`: `Navigator — One-Stop shop for group trips`
- `twitter:image:alt`: `Navigator — One-Stop shop for group trips`

---

### **Type (og:type)**
**Property:** `og:type`  
**Content:** `website`

---

### **Locale (og:locale)**
**Property:** `og:locale`  
**Content:** `en_US`

---

### **Twitter Card Type**
**Property:** `twitter:card`  
**Content:** `summary_large_image`

---

## 📊 Summary Table

| Meta Tag | Property | Home Page Value | Source |
|----------|----------|----------------|--------|
| **Title** | `og:title` | `Navigator — Group Travel Planner \| Plan Trips with Friends \| Navigator 1802` | `SEO_PAGES.home.title` |
| **Site Name** | `og:site_name` | `Navigator` | `SITE_CONFIG.name` |
| **URL** | `og:url` | `https://navigatortrips.com/` | Dynamic (canonicalUrl) |
| **Description** | `og:description` | `Navigator is the best group travel planner...` | `SEO_PAGES.home.description` |
| **Image** | `og:image` | `https://navigatortrips.com/og-image.png` | `SITE_CONFIG.ogImage` |
| **Image Width** | `og:image:width` | `1200` | Hardcoded |
| **Image Height** | `og:image:height` | `630` | Hardcoded |
| **Image Alt** | `og:image:alt` | `Navigator — One-Stop shop for group trips` | `SITE_CONFIG.name + tagline` |
| **Type** | `og:type` | `website` | Hardcoded |
| **Locale** | `og:locale` | `en_US` | Hardcoded |

---

## 🔍 Where Values Come From

### **Constants File:** `client/src/lib/seo-constants.ts`

```typescript
SITE_CONFIG = {
  name: "Navigator",                    // → og:site_name
  tagline: "One-Stop shop for group trips",  // → og:image:alt
  description: "Plan group trips...",   // → Fallback description
  url: "https://navigatortrips.com",   // → Base URL
  ogImage: "https://navigatortrips.com/og-image.png"  // → og:image
}

SEO_PAGES = {
  home: {
    title: "Navigator — Group Travel Planner...",  // → og:title
    description: "Navigator is the best...",       // → og:description
    path: "/"                                       // → URL path
  }
  // ... other pages
}
```

### **SEO Component:** `client/src/components/SEO.tsx`
- Dynamically generates meta tags based on current page
- Uses `SEO_PAGES[page]` for page-specific content
- Uses `SITE_CONFIG` for site-wide constants

---

## 📝 Current Configuration Files

1. **`client/src/lib/seo-constants.ts`** - All constants and page data
2. **`client/src/components/SEO.tsx`** - Dynamic meta tag generation
3. **`client/index.html`** - Fallback meta tags (used before React loads)

---

## 🎯 Quick Reference

**For Home Page Sharing:**
- **Title:** `Navigator — Group Travel Planner | Plan Trips with Friends | Navigator 1802`
- **Site Name:** `Navigator`
- **URL:** `https://navigatortrips.com/`
- **Description:** `Navigator is the best group travel planner for planning trips with friends. Plan group trips, split expenses, coordinate flights, and chat — all in one place. Navigator 1802 makes travel planning simple.`
- **Image:** `https://navigatortrips.com/og-image.png` (1200×630px)

