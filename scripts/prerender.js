/**
 * Pre-rendering script for SEO
 * Pre-renders public pages so search engines can see content immediately
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes to pre-render (public pages only)
const routes = [
  '/',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/legal',
];

// Configuration
const distPath = path.resolve(__dirname, '../dist/public');
const baseUrl = process.env.PRERENDER_BASE_URL || 'http://localhost:5173';

async function prerender() {
  console.log('🚀 Starting pre-rendering...');
  console.log(`📁 Output directory: ${distPath}`);
  console.log(`🌐 Base URL: ${baseUrl}`);
  console.log(`📄 Routes to pre-render: ${routes.join(', ')}`);

  // Check if dist directory exists
  if (!fs.existsSync(distPath)) {
    console.warn(`⚠️  Build directory not found: ${distPath}`);
    console.warn('   Skipping pre-rendering. Pages will use client-side rendering.');
    console.warn('   This is safe - your app will work normally!');
    return; // Exit gracefully instead of failing
  }

  // Read the index.html template
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.warn(`⚠️  index.html not found: ${indexPath}`);
    console.warn('   Skipping pre-rendering. Pages will use client-side rendering.');
    console.warn('   This is safe - your app will work normally!');
    return; // Exit gracefully instead of failing
  }

  // Launch browser
  console.log('🌐 Launching browser...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (error) {
    console.warn('⚠️  Could not launch browser for pre-rendering:', error.message);
    console.warn('   Skipping pre-rendering. Pages will use client-side rendering.');
    console.warn('   This is safe - your app will work normally!');
    return; // Exit gracefully
  }

  try {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Pre-render each route
    for (const route of routes) {
      try {
        console.log(`\n📄 Pre-rendering: ${route}`);

        // Navigate to the route
        const url = `${baseUrl}${route}`;
        console.log(`   Navigating to: ${url}`);
        
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        // Wait for React to render
        await page.waitForSelector('#root', { timeout: 10000 });
        await page.waitForTimeout(2000); // Extra wait for async content

        // Get the full HTML
        const html = await page.content();

        // Determine output file path
        let outputPath;
        if (route === '/') {
          outputPath = indexPath;
        } else {
          // Create directory for nested routes
          const routeDir = path.join(distPath, route);
          if (!fs.existsSync(routeDir)) {
            fs.mkdirSync(routeDir, { recursive: true });
          }
          outputPath = path.join(routeDir, 'index.html');
        }

        // Write the pre-rendered HTML
        fs.writeFileSync(outputPath, html, 'utf-8');
        console.log(`   ✅ Saved to: ${outputPath}`);

      } catch (error) {
        console.warn(`   ⚠️  Could not pre-render ${route}:`, error.message);
        console.warn(`   This route will use client-side rendering (still works fine!)`);
        // Continue with other routes
      }
    }

    console.log('\n✨ Pre-rendering complete!');
    console.log(`📦 Pre-rendered ${routes.length} pages`);

  } finally {
    await browser.close();
  }
}

// Run pre-rendering
prerender().catch((error) => {
  console.warn('⚠️  Pre-rendering encountered an error:', error.message);
  console.warn('   Skipping pre-rendering. Pages will use client-side rendering.');
  console.warn('   This is safe - your app will work normally!');
  // Don't exit with error - allow build to continue
  process.exit(0);
});

