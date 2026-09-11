import { jsPDF } from 'jspdf';
import { stripTrackingMarkers, generateAtsFilename } from './utils';
import { 
  PDF_MARGIN_MM, 
  PDF_LINE_STEP_BODY_MM, 
  PDF_LINE_STEP_HEADING_MM, 
  PDF_EMPTY_LINE_EXTRA_MM,
  HEADING_FONT_SIZE,
  BODY_FONT_SIZE,
  isHeading
} from './page-geometry';

/**
 * Generates and downloads a professionally formatted PDF version of the resume.
 * ATS compatibility is maintained by using standard fonts and a single-column layout.
 */
export function downloadResumeAsPdf(
  resumeText: string,
  candidateName: string,
  jobTitle: string
): void {
  const cleanText = stripTrackingMarkers(resumeText);
  const filename = generateAtsFilename(candidateName, jobTitle, 'pdf');
  renderDocToPdf(cleanText, filename);
}

/**
 * Generates and downloads a professionally formatted PDF version of the cover letter.
 */
export function downloadCoverLetterAsPdf(
  coverLetterText: string,
  candidateName: string,
  jobTitle: string
): void {
  const filename = generateAtsFilename(candidateName, jobTitle, 'pdf').replace('Resume', 'Cover-Letter');
  renderDocToPdf(coverLetterText, filename);
}

/**
 * Internal rendering engine for high-fidelity PDF output.
 */
function renderDocToPdf(text: string, filename: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN_MM;
  const maxLineWidth = pageWidth - margin * 2;
  let y = margin;

  const lines = text.split('\n');
  const candidateNameUpper = lines[0]?.trim().toUpperCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Typography Standard: Helvetica (Professional Sans-Serif)
    doc.setTextColor(0, 0, 0);

    const isSectionHeading = isHeading(line, candidateNameUpper || "");

    if (isSectionHeading) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(HEADING_FONT_SIZE);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(BODY_FONT_SIZE);
    }

    // Handle wrapping
    const wrappedLines = doc.splitTextToSize(trimmed || ' ', maxLineWidth);

    for (const wrappedLine of wrappedLines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.text(wrappedLine, margin, y);
      y += isSectionHeading ? PDF_LINE_STEP_HEADING_MM : PDF_LINE_STEP_BODY_MM;
    }

    if (trimmed === '') {
      y += PDF_EMPTY_LINE_EXTRA_MM;
    }
  }

  doc.save(filename);
}
