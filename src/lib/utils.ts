import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Robust normalization for keyword matching.
 * Converts to lowercase and removes all non-alphanumeric characters,
 * but preserves single spaces between words for reliable phrase matching.
 */
export function normalizeForMatch(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips visual tracking markers (@@ADDED_SUPPORTED:...@@, @@ADDED_UNSUPPORTED:...@@, etc.) 
 * from resume text to return a clean version for AI context or final output.
 */
export function stripTrackingMarkers(text: string): string {
  if (!text) return '';
  return text
    .replace(/@@ADDED_SUPPORTED:[^:@]+:([^@]+)@@/g, '$1')
    .replace(/@@ADDED_UNSUPPORTED:[^:@]+:([^@]+)@@/g, '$1')
    .replace(/@@ADDED_SUPPORTED:([^@]+)@@/g, '$1')
    .replace(/@@ADDED_UNSUPPORTED:([^@]+)@@/g, '$1')
    .replace(/@@ADDED_MISSING:([^@]+)@@/g, '$1')
    .replace(/@@REMOVED_EXTRA:([^@]+)@@/g, '');
}

/**
 * Generates an ATS-optimized filename following industry best practices.
 * Format: Firstname-Lastname-Job-Title-Resume.ext
 */
export function generateAtsFilename(
  candidateName: string,
  jobTitle: string,
  extension: 'pdf' | 'docx' | 'txt'
): string {
  const cleanName = candidateName
    .trim()
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('-');

  const cleanTitle = jobTitle
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('-');

  const base = `${cleanName}-${cleanTitle}-Resume`;
  
  // Truncate if over 60 chars before extension
  const truncated = base.length > 60 
    ? base.substring(0, 60) 
    : base;

  return `${truncated}.${extension}`;
}
