import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing build process...');

try {
  // Clean previous build
  if (fs.existsSync('dist')) {
    console.log('🧹 Cleaning previous build...');
    fs.rmSync('dist', { recursive: true, force: true });
  }

  // Run build
  console.log('🔨 Running build...');
  execSync('npm run build', { stdio: 'inherit' });

  // Check if dist/index.js exists
  if (fs.existsSync('dist/index.js')) {
    console.log('✅ Build successful! dist/index.js created');
    
    // Try to require the built file
    console.log('🔍 Testing built file...');
    const builtFile = path.resolve('dist/index.js');
    console.log('Built file path:', builtFile);
    
    // Check file contents
    const content = fs.readFileSync(builtFile, 'utf8');
    console.log('File size:', content.length, 'characters');
    console.log('First 200 characters:', content.substring(0, 200));
    
  } else {
    console.log('❌ Build failed: dist/index.js not found');
  }

} catch (error) {
  console.error('❌ Build test failed:', error.message);
  process.exit(1);
} 