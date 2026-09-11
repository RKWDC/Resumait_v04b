
'use client';

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure the worker script for pdf.js
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;


export const ACCEPTED_FILE_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
    'text/html',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
    'text/csv',
];

type ExtractionResult = {
    extractedText: string;
    extractionStatus: "success" | "partial" | "failed";
    message: string;
};

const readTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            resolve(event.target?.result as string);
        };
        reader.onerror = (error) => {
            reject('Failed to read file.');
        };
        reader.readAsText(file);
    });
};

const extractTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    // Using convertToHtml to better preserve structure like paragraphs and lists.
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    const tempDiv = document.createElement('div');
    
    // Process HTML for better text extraction
    let processedHtml = html
      .replace(/<li>/gi, '\n• ') // Use a bullet for list items
      .replace(/<\/li>/gi, '')
      .replace(/<p>/gi, '\n') // Use newline for paragraphs
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n');

    tempDiv.innerHTML = processedHtml;

    let text = tempDiv.textContent || tempDiv.innerText || '';

    // Clean up excessive newlines to keep it clean.
    return text.replace(/(\n\s*){3,}/g, '\n\n').trim();
};

const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
        fullText += pageText + '\n';
    }
    return fullText;
};


export const processFile = async (file: File): Promise<ExtractionResult> => {
    try {
        let text = '';
        let status: "success" | "partial" | "failed" = "success";
        let message = '';

        switch (file.type) {
            case 'text/plain':
            case 'text/markdown':
            case 'text/html':
            case 'text/csv':
                text = await readTextFile(file);
                if (file.type === 'text/html') {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = text;
                    text = tempDiv.textContent || tempDiv.innerText || '';
                }
                break;
            
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': // .docx
                text = await extractTextFromDocx(file);
                break;
            
            case 'application/pdf':
                text = await extractTextFromPdf(file);
                // Basic check for scanned PDF. If text is very short relative to file size.
                if (text.trim().length < 100 && file.size > 50000) { // < 100 chars and > 50KB
                    status = 'failed';
                    message = 'This PDF appears to be scanned or image-based. Please paste text or upload a text-based PDF/DOCX.';
                    text = '';
                }
                break;
            
            case 'application/msword': // .doc
            case 'application/rtf': // .rtf
            case 'application/vnd.oasis.opendocument.text': // .odt
                status = 'failed';
                message = `.${file.name.split('.').pop()} files are not fully supported. Please save as DOCX or PDF, or paste the text directly.`;
                text = '';
                break;

            default:
                status = 'failed';
                message = `Unsupported file type: ${file.type}. Please upload one of the supported formats.`;
                text = '';
                break;
        }

        if (status === 'success') {
            return {
                extractedText: text,
                extractionStatus: 'success',
                message: 'Text extracted successfully.'
            };
        } else {
             return {
                extractedText: '',
                extractionStatus: status,
                message: message
            };
        }

    } catch (error) {
        console.error("Error processing file:", error);
        let userMessage = 'An unexpected error occurred while processing the file.';
        if (error instanceof Error) {
            userMessage = error.message;
        }
        return {
            extractedText: '',
            extractionStatus: 'failed',
            message: userMessage,
        };
    }
};
