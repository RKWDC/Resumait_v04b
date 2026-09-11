import { type Resume } from "@/ai/schemas/resume-schema";
import { format, parseISO, isValid } from 'date-fns';

/**
 * Sanitizes a string by replacing non-ASCII quotes with standard ASCII quotes
 * and resolving any escaped newline characters returned by the AI.
 */
function sanitizeString(str: string | undefined): string {
    if (!str) return '';
    return str
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\\n/g, '\n');
}

/**
 * Parses a flexible date string and formats it to "MMMM yyyy".
 * If parsing fails or the date is already well-formatted, returns the original.
 */
function formatDate(dateStr: string): string {
    if (!dateStr || dateStr.toLowerCase() === 'present') return 'Present';

    let date: Date;
    const monthYearMatch = dateStr.match(/([a-zA-Z]+)\s+(\d{4})/);
    if (monthYearMatch) {
        date = new Date(`${monthYearMatch[1]} 1, ${monthYearMatch[2]}`);
    } else if (dateStr.match(/^\d{4}-\d{2}$/)) { // YYYY-MM
        date = parseISO(`${dateStr}-01`);
    } else if (dateStr.match(/^\d{4}$/)) { // YYYY
        date = parseISO(`${dateStr}-01-01`);
    } else {
        date = new Date(dateStr);
    }
    
    return isValid(date) ? format(date, 'MMMM yyyy') : dateStr;
}

/**
 * Simple pass-through that trims input. 
 * Capitalization is now controlled entirely by the AI Flow to preserve mixed-case technical terms (DevSecOps, PyTorch).
 */
const cleanSkillTerm = (str: string) => {
    if (!str) return '';
    return sanitizeString(str).trim();
};

/**
 * Renders a structured resume JSON object into a plain text, ATS-friendly string.
 * Strictly conforms to the MASTER ATS TEMPLATE.
 */
export function renderResumeFromJSON(resume: Resume): string {
    const blocks: string[] = [];

    // --- HEADER BLOCK ---
    const headerLines: string[] = [];
    const header = resume.header;
    if (header) {
        if (header.name) headerLines.push(header.name.toUpperCase());
        
        // Amendment 1 & 9: Render headline as ordinary body text directly beneath name
        if (header.headline) headerLines.push(sanitizeString(header.headline));

        const contactParts = [
            header.phone,
            header.email,
            header.location,
            header.linkedin,
        ].filter(Boolean).map(sanitizeString);

        if (contactParts.length > 0) {
            headerLines.push(contactParts.join(' | '));
        }
    }
    if (headerLines.length > 0) {
        blocks.push(headerLines.join('\n'));
    }

    // --- PROFESSIONAL SUMMARY / OBJECTIVE ---
    const heading = (resume.summaryHeading || 'PROFESSIONAL SUMMARY').toUpperCase();
    if (resume.summary) {
        const cleanSummary = sanitizeString(resume.summary)
            .replace(new RegExp(`^${heading}`, 'i'), '')
            .trim();
        blocks.push(`${heading}\n${cleanSummary}`);
    }
    
    // --- CORE SKILLS ---
    if (resume.coreSkills && resume.coreSkills.length > 0) {
        const half = Math.ceil(resume.coreSkills.length / 2);
        // We rely on the AI's conventional capitalization for technical terms.
        const technical = resume.coreSkills.slice(0, half).map(s => cleanSkillTerm(s)).join(', ');
        const professional = resume.coreSkills.slice(half).map(s => cleanSkillTerm(s)).join(', ');
        
        blocks.push(`CORE SKILLS\nTechnical: ${technical}\nProfessional: ${professional}`);
    }

    // --- PROFESSIONAL EXPERIENCE ---
    if (resume.professionalExperience && resume.professionalExperience.length > 0) {
        const expBlocks: string[] = [];
        resume.professionalExperience.forEach(role => {
            const roleHeader = [
                sanitizeString(role.title),
                sanitizeString(role.company),
                sanitizeString(role.location),
                `${formatDate(role.startDate)} – ${formatDate(role.endDate)}`
            ].filter(Boolean).join(' | ');
            
            const roleLines = [roleHeader];
            if (role.bullets && role.bullets.length > 0) {
                // Ensure first word is sentence case (e.g., Spearheaded)
                roleLines.push(...role.bullets.map(b => {
                    const cleanB = sanitizeString(b);
                    // Handle bullet points starting with markers
                    if (cleanB.startsWith('@@')) {
                       return `• ${cleanB}`;
                    }
                    const words = cleanB.split(' ');
                    if (words.length > 0) {
                        words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
                    }
                    return `• ${words.join(' ')}`;
                }));
            }
            expBlocks.push(roleLines.join('\n'));
        });
        
        blocks.push(`PROFESSIONAL EXPERIENCE\n${expBlocks.join('\n\n')}`);
    }

    // --- EDUCATION ---
    if (resume.education && resume.education.length > 0) {
        const eduLines = resume.education.map(edu => {
            const gradDate = formatDate(edu.endDate);
            const gradYear = gradDate.split(' ').pop();
            return `• ${sanitizeString(edu.institution)} | ${sanitizeString(edu.degree)} | ${gradYear}`;
        });
        blocks.push(`EDUCATION\n${eduLines.join('\n')}`);
    }

    // --- ADDITIONAL SECTIONS (CERTIFICATIONS, ETC.) ---
    if (resume.certificates && resume.certificates.length > 0) {
        const certLines = resume.certificates.map(c => `• ${sanitizeString(c)}`);
        blocks.push(`CERTIFICATIONS\n${certLines.join('\n')}`);
    }

    if (resume.languages && resume.languages.length > 0) {
        const langLine = resume.languages.map(l => sanitizeString(l)).join(' | ');
        blocks.push(`LANGUAGES\n${langLine}`);
    }

    return blocks.join('\n\n').trim();
}
