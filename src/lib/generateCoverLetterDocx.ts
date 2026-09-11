import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { generateAtsFilename } from "./utils";
import { 
  DOCX_MARGIN_TWIPS, 
  DOCX_BODY_FONT_HALFPTS, 
  DOCX_SPACING_AFTER_BODY, 
  FONT_FAMILY
} from "./page-geometry";

/**
 * Generates and downloads a DOCX version of the cover letter.
 * Strictly adheres to executive correspondence standards using point-based geometry.
 */
export async function downloadCoverLetterAsDocx(
  coverLetterText: string,
  candidateName: string,
  jobTitle: string
): Promise<void> {
  const filename = generateAtsFilename(candidateName, jobTitle, 'docx').replace('-Resume.docx', '-Cover_Letter.docx');
  
  try {
    // Split input on blank lines into paragraphs/blocks
    const blocks = coverLetterText.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    
    const children = blocks.map(block => {
      // Split block into separate lines for line-break processing within a paragraph
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
    // Fallback: download as plain text if DOCX assembly fails
    const blob = new Blob([coverLetterText], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    saveAs(blob, filename);
  }
}
