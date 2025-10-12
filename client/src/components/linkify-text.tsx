import React from "react";

interface LinkifyTextProps {
  text: string;
  className?: string;
  variant?: 'current-user' | 'other-user';
}

export default function LinkifyText({ text, className = "", variant = 'other-user' }: LinkifyTextProps) {
  // Choose link styling based on variant
  const linkClasses = variant === 'current-user' 
    ? "text-white hover:text-gray-200 underline break-all"
    : "text-blue-500 hover:text-blue-700 underline break-all";
  
  // Simple and reliable URL detection
  const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:[a-zA-Z]{2,})(?:\/[^\s]*)?)/g;
  
  // Split the text by URLs while preserving the URLs
  const parts = text.split(urlRegex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if this part is a URL
        const isUrl = urlRegex.test(part);
        
        if (isUrl) {
          // Reset regex lastIndex for next test
          urlRegex.lastIndex = 0;
          
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
