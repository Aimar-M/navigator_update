import React from "react";

interface LinkifyTextProps {
  text: string;
  className?: string;
}

export default function LinkifyText({ text, className = "" }: LinkifyTextProps) {
  // Simple and reliable URL regex
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Split the text by URLs
  const parts = text.split(urlRegex);
  
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
