# RESUMAIT: MASTER ATS TEMPLATE SPECIFICATION

This document defines the canonical "Master ATS Template" and the non-negotiable rules used by Resumait to generate, score, and render professional resumes.

## I. STRUCTURAL HIERARCHY
The document MUST follow this vertical order with no deviations:
1.  **FULL NAME**: Rendered in ALL CAPS (14-16pt equivalent).
2.  **PROFESSIONAL HEADLINE**: Positioned immediately below the name. (5-12 words).
3.  **CONTACT BLOCK**: Positioned below the headline.
4.  **PROFESSIONAL SUMMARY**: (Titled as Objective, Professional Summary, or Executive Summary).
5.  **CORE SKILLS**: Divided into "Technical" and "Professional" categories.
6.  **PROFESSIONAL EXPERIENCE**: Most recent first.
7.  **EDUCATION**: University, Degree, and Year.
8.  **CERTIFICATIONS**: Professional credentials and licenses.

---

## II. SECTION-SPECIFIC GENERATION RULES

### 1. The Header & Headline
*   **Headline Phrasing**: 
    *   **Path A (Match)**: [Target Job Title] | [Years Experience] | [Major Achievement/Value Prop]
    *   **Path B (Bridge)**: Aspiring [Target Role] | [Background] Transitioning to [Field] | [Top Skills]
*   **Contact Separators**: MUST use exclusively pipes (`|`) for separators. 
    *   Format: `Phone | Email | City, State | LinkedIn URL`

### 2. Professional Summary
*   **Constraint**: 3–5 sentences of flowing prose. NO bullet points.
*   **Targeting**: The first sentence MUST contain the exact target job title.
*   **Tone**: Implied third-person, executive, results-oriented.
*   **Headings**: 
    *   *Executive Summary*: For Director, VP, and C-Level roles.
    *   *Objective*: For Career Changers (Path B) or <2 years experience.
    *   *Professional Summary*: For standard professional applications.

### 3. Core Skills
*   **Quantity**: 12–18 keywords total.
*   **Categories**: Technical (hard tools/platforms) and Professional (domain/soft skills).
*   **Logic**: Every skill included must be supported by evidence in the Experience section or identified as "Supported" by the Diagnostic Auditor.

### 4. Professional Experience
*   **Role Header**: `[Job Title] | [Company Name] | [Location] | [Date Range]`
*   **Verbatim Titles**: Historical job titles MUST remain verbatim from the user's history. Inflation is prohibited.
*   **Bullet Constraints**: 
    *   Exactly **4–6 bullets** per role.
    *   Every bullet must start with an **Action Verb in sentence case** (e.g., Spearheaded, Orchestrated). The first word in each bullet point should begin with only the first letter capitalized. The entire word MUST NOT be capitalized.
    *   Every bullet must include at least one **Quantified Metric** ($, %, #, or volume indicator).
    *   **Length**: Max 28 words per bullet point.

---

## III. TYPOGRAPHY & GRAMMAR CONSTRAINTS (NON-NEGOTIABLE)
1.  **NO CONTRACTIONS**: Expand all contractions (e.g., use "cannot" instead of "can't").
2.  **NO ITALICS**: Italics and slanted text are prohibited to prevent OCR (Optical Character Recognition) parsing errors in older ATS systems.
3.  **NO TABLES/SIDEBARS**: The layout must remain strictly single-column.
4.  **ACRONYMS**: Use ALL CAPS for technical acronyms (SaaS, SQL, AWS, ROI).
5.  **ZERO TYPOS**: Technical proofreading is applied at 0.0 temperature for absolute precision.

---

## IV. OPTIMIZATION LOGIC (THE AI BLUEPRINT)
*   **Classification Pathing**: 
    *   **Path A**: Candidate history overlaps target role. The resume reinforces existing authority.
    *   **Path B**: Career change. The resume functions as a "bridge" document, emphasizing transferable skills and "Aspiring" headline framing.
*   **Formatting over Preservation**: In the AI orchestration layer, template formatting rules (e.g., forcing metrics and bullet counts) explicitly supersede the preservation of the original source text structure.