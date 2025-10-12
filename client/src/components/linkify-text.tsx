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
  
  // Function to check if a string looks like a URL
  const isUrl = (str: string) => {
    // Check for protocol URLs first
    if (str.startsWith('http://') || str.startsWith('https://')) {
      return true;
    }
    
    // Check for domain-like patterns (contains a dot and looks like a domain)
    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/.*)?$/;
    return domainPattern.test(str);
  };
  
  // Split text by whitespace to process each word
  const words = text.split(/(\s+)/);
  
  return (
    <span className={className}>
      {words.map((word, index) => {
        if (isUrl(word)) {
          // Add protocol if missing
          const href = word.startsWith('http') ? word : `https://${word}`;
          
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClasses}
              onClick={(e) => e.stopPropagation()}
            >
              {word}
            </a>
          );
        }
        return word;
      })}
    </span>
  );
}
