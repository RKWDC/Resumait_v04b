# RESUMAIT: THE ARCHITECTURAL BLUEPRINT

## I. EXTRACTION ENGINE (REQUIREMENT SCHEMA)
**Source:** `src/ai/flows/keyword-extraction-flow.ts`
*   **Determinism**: Temperature is locked at 0.
*   **Normalization**: AI output is post-processed via `normalize()` to flatten nested arrays and ensure mandatory defaults.
*   **Schema**:
    *   `keywords`: Term, Category, Priority (Required/Preferred), Aliases, Importance (1-5).
    *   `knockouts`: Years, Degree Field, Certifications, Clearances.

## II. DETERMINISTIC SCORING ENGINE
**Formula:** `S = max(0, round( K*0.45 + T*0.20 + R*0.10 + E*0.15 + H*0.10 − P ))`

### 1. K (Weighted Keyword Vector) [45%]
*   **Logic**: `weight(k) = importance × (priority=='required'?1:0.3) × (category=='soft'?0.4:1)`.
*   **Matching**: Alias-aware. Matches if term or any alias/synonym appears in normalized text.

### 2. T (Title Alignment) [20%]
*   100: Required title appears in resume or target title.
*   50: First word of required title appears in target title.
*   0: No alignment.

### 3. R (Experience Density) [10%]
*   Ratio of matched keywords found strictly within the Professional Experience section.

### 4. E (Education) [15%]
*   Met/Exceeded requirements = 100. Missing field = 0.

### 5. H (Human Appeal / Metrics) [10%]
*   Metric Coverage: Percentage of roles containing at least one quantified result (%, $, #). Dates are excluded.

### 6. Knockout Gating (Hard Filter)
*   **Cap (50 pts)**: Missing security clearance, degree field mismatch, or tenure below minimum years.
*   **Penalty (-8 pts)**: Missing specific certification (capped at -24).

### 7. Formatting Penalties (P)
*   `-10`: Excessive bullet length (>40 words).
*   `-10`: Layout complexity (3+ spaces).
*   `-10`: Contact missing from first 1000 characters.
*   `-15`: Empty section header (<15 chars content).

## III. REPORT CARD
*   **Verdict**: 'Excellent' (90+), 'Strong' (80-89), 'Competitive' (65-79), 'Borderline' (50-64), 'Needs work' (<50), or 'Capped'.
*   **Fixes**: Quantified point-based recommendations.
*   **Projected Score**: Calculated score if all fixes are applied (capped at 96).
