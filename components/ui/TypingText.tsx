'use client';

import { useState, useEffect } from 'react';

interface TypingTextProps {
  text: string;
  speed?: number; // milliseconds per character
  className?: string;
}

export function TypingText({ text, speed = 40, className = '' }: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // If we've already displayed all text, do nothing
    if (currentIndex >= text.length) {
      setIsComplete(true);
      return;
    }

    // Add next character after delay
    const timeout = setTimeout(() => {
      setDisplayedText(text.slice(0, currentIndex + 1));
      setCurrentIndex(currentIndex + 1);
    }, speed);

    return () => clearTimeout(timeout);
  }, [currentIndex, text, speed]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
}
