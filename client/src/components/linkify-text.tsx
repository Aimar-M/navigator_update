import React from "react";

interface LinkifyTextProps {
  text: string;
  className?: string;
}

export default function LinkifyText({ text, className = "" }: LinkifyTextProps) {
  // Enhanced URL regex that matches both http/https URLs and www. URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  
  const parts = text.split(urlRegex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if the part is a URL by testing if it matches the pattern
        const isUrl = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/.test(part);
        
        if (isUrl) {
          // Add protocol if missing
          const href = part.startsWith('http') ? part : `https://${part}`;
          
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 underline break-all"
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
