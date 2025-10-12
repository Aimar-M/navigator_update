import React from "react";

interface LinkifyTextProps {
  text: string;
  className?: string;
  variant?: 'current-user' | 'other-user';
}

export default function LinkifyText({ text, className = "", variant = 'other-user' }: LinkifyTextProps) {
  // Simple and reliable URL regex
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Split the text by URLs
  const parts = text.split(urlRegex);
  
  // Choose link styling based on variant
  const linkClasses = variant === 'current-user' 
    ? "text-white hover:text-gray-200 underline break-all"
    : "text-blue-500 hover:text-blue-700 underline break-all";
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Simple check: does this part start with http:// or https://?
        const isUrl = part.startsWith('http://') || part.startsWith('https://');
        
        if (isUrl) {
          return (
            <a
              key={index}
              href={part}
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
