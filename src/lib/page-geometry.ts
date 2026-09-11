/**
 * @fileOverview Shared geometry constants and page-count estimation for the RESUMAIT engine.
 * All base units are in Points (1/72 inch).
 */

export const POINTS_PER_INCH = 72;
export const POINTS_PER_MM = 72 / 25.4;
export const TWIPS_PER_POINT = 20;

// Page Dimensions (Letter: 8.5" x 11")
export const PAGE_WIDTH = 8.5 * POINTS_PER_INCH; // 612 pts
export const PAGE_HEIGHT = 11 * POINTS_PER_INCH; // 792 pts

// Margins (20mm ≈ 1134 twips ≈ 56.7 pts)
export const MARGIN_PTS = 56.7; 
export const PRINTABLE_WIDTH = PAGE_WIDTH - (2 * MARGIN_PTS);
export const PRINTABLE_HEIGHT = PAGE_HEIGHT - (2 * MARGIN_PTS);

// Font Configuration
export const FONT_FAMILY = "Arial"; // Helvetica in PDF is metrically identical
export const BODY_FONT_SIZE = 11;
export const HEADING_FONT_SIZE = 12;

// DOCX Specific (Twips/Half-points)
// CONVERGENCE NOTE: These spacing values are calculated to ensure DOCX paragraphs
// consume exactly the same vertical space as the PDF line-step model.
// Changing these without updating PDF_LINE_STEP_MM will break page estimation.
export const DOCX_MARGIN_TWIPS = 1134;
export const DOCX_BODY_FONT_HALFPTS = 22;
export const DOCX_HEADING_FONT_HALFPTS = 24;
export const DOCX_SPACING_AFTER_BODY = 76; // Converged to PDF 6mm step
export const DOCX_SPACING_AFTER_HEADING = 109; // Converged to PDF 7mm step

// PDF Specific (mm)
export const PDF_MARGIN_MM = 20;
export const PDF_LINE_STEP_BODY_MM = 6;
export const PDF_LINE_STEP_HEADING_MM = 7;
export const PDF_EMPTY_LINE_EXTRA_MM = 2;

/**
 * Character Width Map for Arial (relative to 1000 units).
 * Used for high-fidelity line-wrap estimation.
 */
const CHAR_WIDTH_MAP: Record<string, number> = {
  'A': 667, 'B': 667, 'C': 722, 'D': 722, 'E': 667, 'F': 611, 'G': 778, 'H': 722, 'I': 278, 'J': 500,
  'K': 667, 'L': 556, 'M': 833, 'N': 722, 'O': 778, 'P': 667, 'Q': 778, 'R': 722, 'S': 667, 'T': 611,
  'U': 722, 'V': 667, 'W': 944, 'X': 667, 'Y': 667, 'Z': 611,
  'a': 556, 'b': 556, 'c': 500, 'd': 556, 'e': 556, 'f': 278, 'g': 556, 'h': 556, 'i': 222, 'j': 222,
  'k': 500, 'l': 222, 'm': 833, 'n': 556, 'o': 556, 'p': 556, 'q': 556, 'r': 333, 's': 500, 't': 278,
  'u': 556, 'v': 500, 'w': 722, 'x': 500, 'y': 500, 'z': 500,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556, '8': 556, '9': 556,
  ' ': 278, '.': 278, ',': 278, ':': 278, ';': 278, '!': 278, '?': 556, '(': 333, ')': 333, '[': 333, ']': 333,
  '-': 333, '_': 556, '+': 556, '=': 556, '*': 500, '/': 278, '@': 1015, '&': 667, '#': 556, '%': 889, '|': 222,
  '•': 350,
};

function estimateWrappedLineCount(text: string, fontSize: number, maxWidth: number): number {
  if (!text) return 1;
  let lines = 1;
  let currentLineWidth = 0;
  
  for (const char of text) {
    const width = (CHAR_WIDTH_MAP[char] || 500) * (fontSize / 1000);
    if (currentLineWidth + width > maxWidth) {
      lines++;
      currentLineWidth = width;
    } else {
      currentLineWidth += width;
    }
  }
  return lines;
}

/**
 * Checks if a line represents a section heading.
 */
export function isHeading(line: string, candidateNameUpper: string): boolean {
  const trimmed = line.trim();
  return /^(PROFESSIONAL SUMMARY|CORE SKILLS|PROFESSIONAL EXPERIENCE|EDUCATION|CERTIFICATIONS|PUBLICATIONS|AWARDS|LANGUAGES)/i.test(trimmed) ||
         (trimmed === candidateNameUpper && trimmed.length > 2);
}

/**
 * Estimates the fractional page count based on the PDF rendering model.
 * Accounts for line wrapping and page breaks.
 */
export function estimatePageCount(text: string): number {
  const lines = text.split('\n');
  const candidateNameUpper = lines[0]?.trim().toUpperCase() || "";
  
  let currentY = MARGIN_PTS;
  let totalHeightAccumulated = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const isSectionHeading = isHeading(line, candidateNameUpper);
    const fontSize = isSectionHeading ? HEADING_FONT_SIZE : BODY_FONT_SIZE;
    const lineStep = (isSectionHeading ? PDF_LINE_STEP_HEADING_MM : PDF_LINE_STEP_BODY_MM) * POINTS_PER_MM;
    
    const wrappedLines = estimateWrappedLineCount(trimmed || ' ', fontSize, PRINTABLE_WIDTH);
    
    for (let j = 0; j < wrappedLines; j++) {
      if (currentY + lineStep > PAGE_HEIGHT - MARGIN_PTS) {
        totalHeightAccumulated += PRINTABLE_HEIGHT;
        currentY = MARGIN_PTS;
      }
      currentY += lineStep;
    }

    if (trimmed === '') {
      const extra = PDF_EMPTY_LINE_EXTRA_MM * POINTS_PER_MM;
      if (currentY + extra > PAGE_HEIGHT - MARGIN_PTS) {
        totalHeightAccumulated += PRINTABLE_HEIGHT;
        currentY = MARGIN_PTS;
      }
      currentY += extra;
    }
  }

  // Calculate fractional count based on total height used vs printable area per page
  const usedOnCurrentPage = currentY - MARGIN_PTS;
  return (totalHeightAccumulated + usedOnCurrentPage) / PRINTABLE_HEIGHT;
}
