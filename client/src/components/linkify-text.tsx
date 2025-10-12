import React from "react";

interface LinkifyTextProps {
  text: string;
  className?: string;
  variant?: 'current-user' | 'other-user';
}

export default function LinkifyText({ text, className = "", variant = 'other-user' }: LinkifyTextProps) {
  // Enhanced URL regex that matches:
  // 1. URLs with protocol (http://, https://)
  // 2. Domain names (example.com, subdomain.example.com)
  // 3. URLs with paths (example.com/path, subdomain.example.com/path)
  const urlRegex = /(https?:\/\/[^\s]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
  
  // Split the text by URLs
  const parts = text.split(urlRegex);
  
  // Choose link styling based on variant
  const linkClasses = variant === 'current-user' 
    ? "text-white hover:text-gray-200 underline break-all"
    : "text-blue-500 hover:text-blue-700 underline break-all";
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if this part is a URL (with or without protocol)
        const isUrl = part.startsWith('http://') || part.startsWith('https://') || 
                     /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?$/.test(part);
        
        if (isUrl) {
          // Add protocol if missing
          const href = part.startsWith('http') ? part : `https://${part}`;
          
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClasses}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
}
