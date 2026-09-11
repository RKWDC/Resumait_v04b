"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  Database,
  CheckCircle2,
  Zap,
  Target,
  HelpCircle,
  ArrowUpRight,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KeywordAlignmentAuditProps {
  foundKeywords: string[];
  supportedKeywords: string[];
  unsupportedKeywords: string[];
  topRecommendations?: string[];
  penalties?: any[];
  onIntegrateSupported: () => void;
  isIntegratingSupported: boolean;
  onAutoFillMissing: () => void;
  isAutoFillingMissing: boolean;
  isActionsDisabled?: boolean;
}

const InfoTooltip = ({ text, className }: { text: string; className?: string }) => (
  <div className={cn("absolute top-6 right-8 group z-[100]", className)}>
    <HelpCircle className="h-4 w-4 text-zinc-500 hover:text-zinc-200 transition-colors cursor-help shrink-0" />
    <div className="hidden group-hover:block absolute right-0 top-6 w-80 p-4 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl text-[11px] font-medium text-zinc-100 leading-relaxed animate-in fade-in zoom-in duration-200 z-[110] whitespace-normal break-words">
      {text}
    </div>
  </div>
);

/**
 * Diagnostic logic to map raw recommendations to professional headlines and explanations.
 */
const getComplianceItem = (rec: string) => {
  const norm = rec.toLowerCase();
  
  if (norm.includes("technical alignment is optimal")) 
    return { headline: "Excellent technical alignment.", explanation: "Your resume contains a high density of the core technical requirements specified in the job description." };
  
  if (norm.includes("title alignment is optimal")) 
    return { headline: "Strong title alignment.", explanation: "Your professional headline exactly matches or strongly aligns with the target job title, increasing immediate relevance." };
  
  if (norm.includes("executive presence is high-impact")) 
    return { headline: "High executive impact.", explanation: "Your professional experience section uses high-impact executive verbs and metrics-driven achievements." };
  
  if (norm.includes("incorporate critical keyword gaps")) 
    return { headline: "Technical keyword gaps.", explanation: "Several required skills from the job description were not detected. Use the 'Strategic Alignment' tool to resolve this." };
  
  if (norm.includes("adjust professional headline")) 
    return { headline: "Title mismatch detected.", explanation: "Your current headline doesn't explicitly mention the target role, which may cause recruiters to overlook your profile." };
  
  if (norm.includes("increase density of quantified results")) 
    return { headline: "Metric density needs audit.", explanation: "Your bullet points lack the numerical achievements ($, %, #) that ATS algorithms use to measure seniority and scale." };
  
  if (norm.includes("rewrite bullets starting with strong action verbs")) 
    return { headline: "Passive phrasing detected.", explanation: "Using passive language like 'Responsible for' instead of action verbs like 'SPEARHEADED' reduces perceived authority." };
  
  if (norm.includes("excessive bullet length")) 
    return { headline: "Formatting penalty: Bullet length.", explanation: "Bulleted items exceeding 40 words can be truncated or ignored by some ATS parsing engines." };
  
  if (norm.includes("layout complexity")) 
    return { headline: "Formatting penalty: Multi-column layout.", explanation: "Complex layouts can scramble text extraction, making it impossible for the ATS to read your experience correctly." };
  
  if (norm.includes("contact accessibility")) 
    return { headline: "Missing contact header.", explanation: "Critical contact information was not detected in the header, making it difficult for recruiters to reach you." };
  
  return { headline: rec, explanation: "Diagnostic flag based on ATS scoring parameters. Address this to improve your composite match score." };
};

export function KeywordAlignmentAudit({ 
  foundKeywords = [], 
  supportedKeywords = [], 
  unsupportedKeywords = [], 
  topRecommendations = [],
  penalties = [],
}: KeywordAlignmentAuditProps) {
  
  return (
    <Card className="enterprise-card rounded-2xl overflow-hidden border-none shadow-elevated relative">
      <InfoTooltip text="Keyword Alignment is the #1 factor in surviving high-volume ATS filters. Every 'Missing' requirement is a potential barrier to human review." />
      
      {/* ATS COMPLIANCE AUDIT SECTION (Now Header) */}
      <div className="px-8 py-6 border-b bg-zinc-50/50 space-y-6">
        <div className="flex items-center gap-2 mb-2">
           <CheckCircle2 className="h-4 w-4 text-black" />
           <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-black">STEP 03: ATS Compliance Audit</h4>
        </div>
        
        <div className="space-y-3">
          <Accordion type="single" collapsible className="w-full space-y-3">
            {topRecommendations.map((rec, i) => {
              const item = getComplianceItem(rec);
              return (
                <AccordionItem key={i} value={`item-${i}`} className="border-none">
                  <AccordionTrigger className="hover:no-underline py-0 group">
                    <div className="flex items-center gap-4 w-full p-4 bg-white/80 hover:bg-zinc-100/80 rounded-xl border border-zinc-100 transition-all text-left shadow-sm">
                      <div className="h-8 w-8 rounded-lg bg-zinc-200/50 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="h-4 w-4 text-zinc-500" />
                      </div>
                      <span className="text-[12px] font-bold text-zinc-800">{item.headline}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-16 pt-2 pb-4">
                    <p className="text-[11px] font-medium text-zinc-500 leading-relaxed border-l-2 border-zinc-200 pl-4">
                      {item.explanation}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>

      <CardContent className="pt-8 px-8 pb-8 space-y-12">
        
        {/* STEP 03 HEADING SECTION (Moved into Content) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="text-[10px] font-black uppercase text-black tracking-widest flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#FF0033]" />
              Extracted Keywords & Job Requirements
            </h3>
          </div>
        </div>

        {/* KEYWORD ANALYTICS GRID */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 text-center">
              <div className="text-2xl font-black text-black tracking-tighter">{foundKeywords.length + supportedKeywords.length + unsupportedKeywords.length}</div>
              <p className="text-[8px] uppercase font-black tracking-widest text-black mt-1">TOTAL EXTRACTED</p>
            </div>

            <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-center">
              <div className="text-2xl font-black text-black tracking-tighter">{foundKeywords.length}</div>
              <p className="text-[8px] uppercase font-black tracking-widest text-black mt-1">MATCHED KEYWORDS</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
              <div className="text-2xl font-black text-black tracking-tighter">{supportedKeywords.length}</div>
              <p className="text-[8px] uppercase font-black tracking-widest text-black mt-1">IMPLIED BY YOUR EXPERIENCE</p>
            </div>

            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-center">
              <div className="text-2xl font-black text-black tracking-tighter">{unsupportedKeywords.length}</div>
              <p className="text-[8px] uppercase font-black tracking-widest text-black mt-1">MISSING</p>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full border-t pt-4" defaultValue="audit">
            <AccordionItem value="audit" className="border-none relative">
              <AccordionTrigger className="hover:no-underline py-4 group whitespace-normal text-left">
                <span className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2 group-hover:text-[#FF0033] transition-colors">
                  <Database className="h-4 w-4 text-[#FF0033]"/> KEYWORD GAPS
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="max-h-[600px] overflow-y-auto pr-4 space-y-8 pt-4 custom-scrollbar">
                  <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 mb-4">
                    <p className="text-[10px] font-bold text-zinc-600 leading-relaxed">
                      <span className="text-black font-black uppercase">Strategy:</span> Audit these missing keywords. If your Core Skills section gets crowded, ask <span className="text-[#FF0033] font-black">IDEAMAIT</span> to work these terms into your Professional Experience bullets instead.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-green-700 uppercase tracking-widest px-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3"/> MATCHED KEYWORDS ({foundKeywords.length})
                    </p>
                    <div className="flex flex-wrap gap-2 px-2">
                      {foundKeywords.length > 0 ? foundKeywords.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="bg-green-50 text-green-700 border-green-100 font-black uppercase text-[9px] rounded-lg">
                          {kw}
                        </Badge>
                      )) : <p className="text-[10px] text-zinc-400 px-2 font-bold">No explicit matches found.</p>}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-dashed">
                    <div className="flex items-center justify-between px-2">
                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                        <Zap className="h-3 w-3"/> IMPLIED BY YOUR EXPERIENCE ({supportedKeywords.length})
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 px-2">
                      {supportedKeywords.length > 0 ? supportedKeywords.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-black uppercase text-[9px] rounded-lg">
                          {kw}
                        </Badge>
                      )) : <p className="text-[10px] text-zinc-400 px-2 font-bold">0 inferred keywords found.</p>}
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t border-dashed">
                    <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest px-2 flex items-center gap-1.5">
                      <Target className="h-3 w-3"/> MISSING ({unsupportedKeywords.length})
                    </p>
                    <div className="flex flex-wrap gap-2 px-2">
                      {unsupportedKeywords.length > 0 ? unsupportedKeywords.map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] font-black uppercase border-orange-200 text-orange-700 bg-white rounded-lg">
                          {kw}
                        </Badge>
                      )) : <p className="text-[10px] text-zinc-400 px-2 font-bold">No missing requirements.</p>}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}