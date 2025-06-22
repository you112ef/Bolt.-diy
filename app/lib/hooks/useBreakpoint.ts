import { useState, useEffect } from 'react';

const getBreakpoint = (width: number): string => {
  if (width < 640) return 'xs'; // Extra small / mobile
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  if (width < 1536) return 'xl';
  return '2xl';
};

export const useBreakpoint = (breakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'sm'): boolean => {
  const [isBeyond, setIsBeyond] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkBreakpoint = () => {
      let threshold = 640; // Default for 'sm'
      if (breakpoint === 'md') threshold = 768;
      else if (breakpoint === 'lg') threshold = 1024;
      else if (breakpoint === 'xl') threshold = 1280;
      else if (breakpoint === '2xl') threshold = 1536;

      setIsBeyond(window.innerWidth >= threshold);
    };

    checkBreakpoint(); // Initial check
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, [breakpoint]);

  return isBeyond;
};

// Hook to get the current Tailwind-like breakpoint name
export const useCurrentBreakpoint = (): string => {
  const [currentBp, setCurrentBp] = useState('xs');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateBreakpoint = () => {
      setCurrentBp(getBreakpoint(window.innerWidth));
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return currentBp;
}
