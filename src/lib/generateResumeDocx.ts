import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { stripTrackingMarkers, generateAtsFilename } from "./utils";
import { 
  DOCX_MARGIN_TWIPS, 
  DOCX_BODY_FONT_HALFPTS, 
  DOCX_HEADING_FONT_HALFPTS, 
  DOCX_SPACING_AFTER_BODY, 
  DOCX_SPACING_AFTER_HEADING,
  FONT_FAMILY,
  isHeading
} from "./page-geometry";

/**
 * Generates and downloads a DOCX version of the resume.
 * Amendment 9: Render headline as standard body text.
 */
export async function downloadResumeAsDocx(
  resumeText: string,
  candidateName: string,
  jobTitle: string
): Promise<void> {
  const clean = stripTrackingMarkers(resumeText);
  const filename = generateAtsFilename(candidateName, jobTitle, 'docx');
  const candidateNameUpper = candidateName.toUpperCase();
  
  try {
    const lines = clean.split('\n');
    const children = lines.map((line, i) => {
      const isSectionHeading = isHeading(line, candidateNameUpper);

      return new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: isSectionHeading,
            size: isSectionHeading ? DOCX_HEADING_FONT_HALFPTS : DOCX_BODY_FONT_HALFPTS,
            font: FONT_FAMILY,
            color: "000000",
          }),
        ],
        spacing: {
          after: isSectionHeading ? DOCX_SPACING_AFTER_HEADING : DOCX_SPACING_AFTER_BODY,
        },
        heading: isSectionHeading ? HeadingLevel.HEADING_1 : undefined,
      });
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: DOCX_MARGIN_TWIPS,
              bottom: DOCX_MARGIN_TWIPS,
              left: DOCX_MARGIN_TWIPS,
              right: DOCX_MARGIN_TWIPS,
            },
          },
        },
        children: children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
  } catch (error) {
    console.error('DOCX generation failed:', error);
    const blob = new Blob([clean], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    saveAs(blob, filename);
  }
}

/**
 * Generates and downloads a DOCX version of the cover letter.
 * Follows executive letter standards: blank lines are block separators, single newlines are soft breaks.
 */
export async function downloadCoverLetterAsDocx(
  coverLetterText: string,
  candidateName: string,
  jobTitle: string
): Promise<void> {
  // Filename convention: replace "-Resume.docx" with "-Cover_Letter.docx"
  const filename = generateAtsFilename(candidateName, jobTitle, 'docx').replace('-Resume.docx', '-Cover_Letter.docx');
  
  try {
    // Split input on blank lines into paragraphs/blocks
    const blocks = coverLetterText.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    
    const children = blocks.map(block => {
      // Split block into separate lines for line-break processing
      const lines = block.split('\n');
      
      return new Paragraph({
        children: lines.map((line, index) => {
          return new TextRun({
            text: line.trim(),
            size: DOCX_BODY_FONT_HALFPTS,
            font: FONT_FAMILY,
            color: "000000",
            break: index > 0 ? 1 : undefined, // Manual line break for lines within a block
          });
        }),
        spacing: {
          after: DOCX_SPACING_AFTER_BODY,
        },
      });
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: DOCX_MARGIN_TWIPS,
              bottom: DOCX_MARGIN_TWIPS,
              left: DOCX_MARGIN_TWIPS,
              right: DOCX_MARGIN_TWIPS,
            },
          },
        },
        children: children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
  } catch (error) {
    console.error('Cover letter DOCX generation failed:', error);
    const blob = new Blob([coverLetterText], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    saveAs(blob, filename);
  }
}
