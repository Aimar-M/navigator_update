# Fix OG Image for Social Sharing

## 🚨 Critical Issue

Your current `og-image.png` is **3334×1251px** but needs to be **1200×630px** for proper social sharing.

## ✅ Immediate Fix Applied

1. **Switched to static image**: Changed from dynamic `/api/og` endpoint to static `/og-image.png`
   - More reliable across all platforms
   - Instagram, WhatsApp, and Google prefer static images
   - No query parameters = better compatibility

2. **Updated all meta tags**: All OG image references now point to `/og-image.png`

## ⚠️ ACTION REQUIRED: Resize Your OG Image

Your current `client/public/og-image.png` needs to be resized:

**Current**: 3334×1251px (wrong aspect ratio, too large)  
**Required**: 1200×630px (1.91:1 aspect ratio)

### How to Fix:

1. **Option 1: Online Tool (Easiest)**
   - Go to [ILoveIMG Resize](https://www.iloveimg.com/resize-image)
   - Upload `client/public/og-image.png`
   - Set dimensions to: **1200×630px**
   - Download and replace the file

2. **Option 2: ImageMagick (Command Line)**
   ```bash
   convert client/public/og-image.png -resize 1200x630^ -gravity center -extent 1200x630 -quality 90 client/public/og-image.png
   ```

3. **Option 3: Photoshop/GIMP/Figma**
   - Open `client/public/og-image.png`
   - Resize canvas to 1200×630px
   - Center and crop as needed
   - Export as PNG

### After Resizing:

1. Replace `client/public/og-image.png` with the resized version
2. Deploy to production
3. Clear caches:
   - **Facebook**: [Sharing Debugger](https://developers.facebook.com/tools/debug/) → Scrape Again
   - **WhatsApp**: Share link again (caches for 24-48 hours)
   - **Instagram**: May take a few days to update

## 🧪 Testing

After resizing, test with:

1. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
   - Enter: `https://navigatortrips.com`
   - Should show 1200×630px image

2. **WhatsApp**: Share the link - should show preview

3. **Instagram**: Share link in story/post - should show image

4. **Google**: Search for your site - should show image in results

## 📊 Why Static Image is Better

- ✅ **More Reliable**: Works on all platforms
- ✅ **Faster**: No server processing needed
- ✅ **Compatible**: Instagram/WhatsApp prefer static
- ✅ **Cached**: Better performance
- ✅ **Simple**: No query parameters or dynamic generation

## 🔄 Future: Dynamic Images (Optional)

If you want dynamic images later:
1. Fix the `/api/og` endpoint to work properly
2. Use path-based routing instead of query params
3. Keep static as fallback
4. Test thoroughly on all platforms

---

**Status**: ✅ Code updated | ⚠️ Image resize required

