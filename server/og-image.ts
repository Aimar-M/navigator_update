import { ImageResponse } from '@vercel/og';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
let __dirname;
try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (e) {
  __dirname = process.cwd();
}

export async function generateOGImage(req: Request, res: Response) {
  try {
    // Get query parameters for dynamic content
    const title = (req.query.title as string) || 'Navigator — Group Travel Planner';
    const description = (req.query.description as string) || 'Plan group trips effortlessly with Navigator. Split expenses, coordinate flights, chat, and vote on plans — all in one place.';
    const tagline = (req.query.tagline as string) || 'One-Stop shop for group trips';

    // Load the logo image - convert to base64 data URL
    const logoPath = path.resolve(__dirname, '../client/public/navigator-logo.jpg');
    
    let logoDataUrl: string | undefined;
    try {
      const logoBuffer = await fs.promises.readFile(logoPath);
      const base64 = logoBuffer.toString('base64');
      logoDataUrl = `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error loading logo:', error);
      // Continue without logo if file not found
    }

    // Generate the OG image using @vercel/og
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            padding: '80px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Logo */}
          {logoDataUrl && (
            <img
              src={logoDataUrl}
              alt="Navigator Logo"
              width="200"
              height="200"
              style={{
                marginBottom: '40px',
                borderRadius: '20px',
                objectFit: 'contain',
              }}
            />
          )}

          {/* Title */}
          <div
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              marginBottom: '20px',
              lineHeight: '1.2',
              maxWidth: '1000px',
            }}
          >
            {title}
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: '36px',
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center',
              marginBottom: '30px',
              fontWeight: '500',
            }}
          >
            {tagline}
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: '28px',
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
              maxWidth: '900px',
              lineHeight: '1.4',
            }}
          >
            {description}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );

    // Convert Vercel ImageResponse to Express response
    const imageBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    // Set headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Send the image
    res.status(200).send(buffer);
  } catch (error: any) {
    console.error('Error generating OG image:', error);
    res.status(500).json({ error: 'Failed to generate OG image', message: error.message });
  }
}

