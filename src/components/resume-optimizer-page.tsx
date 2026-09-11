"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Check, Loader2, Upload, Sparkles, Edit3, Download, RotateCcw, 
  Activity, Database, Target, Zap, ShieldCheck, FileText, 
  CheckCircle2, Type, Scissors, MousePointer2,
  Undo2, Redo2, Diff as DiffIcon, AlertTriangle, Info, Plus,
  Monitor, Printer
} from "lucide-react";
import * as diff from "diff";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { processFile } from "@/lib/file-processor";
import { cn, stripTrackingMarkers } from "@/lib/utils";
import { KeywordAlignmentAudit } from "./keyword-checklist";
import { useUser } from "@/firebase";
import { ScoringProgress, ScoringStep } from "./ScoringProgress";
import { downloadResumeAsPdf } from "@/lib/generateResumePdf";
import { downloadResumeAsDocx } from "@/lib/generateResumeDocx";
import { downloadCoverLetterAsDocx } from "@/lib/generateCoverLetterDocx";
import { CounselorChat } from "./counselor-chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { injectKeywords } from "@/lib/injectKeywords";
import { calculateAtsMatch } from "@/lib/ats-logic";
import { AtsAnalysisResult } from "@/types/ats";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  PAGE_HEIGHT, 
  PAGE_WIDTH, 
  MARGIN_PTS, 
  FONT_FAMILY, 
  BODY_FONT_SIZE, 
  PDF_LINE_STEP_BODY_MM, 
  estimatePageCount 
} from "@/lib/page-geometry";

const formSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required."),
  jobDescription: z.string().min(50, "Job description must be at least 50 characters."),
  resume: z.string().min(50, "Resume must be at least 50 characters."),
});

const SAMPLE_DATA_1 = {
  resume: `MARGARET CHEN-WHITFIELD
Senior Vice President, Digital Transformation & Program Execution
margaret.chenwhitfield@email.com | 703-555-0164 | 4110 Fairfax Drive, Arlington, VA 22203 | linkedin.com/in/margaret-chenwhitfield | Active TS/SCI Clearance with Full-Scope Polygraph

EXECUTIVE SUMMARY
Senior Vice President of Digital Transformation and Program Execution with over 30 years leading enterprise IT modernization programs across federal civilian, defense, and intelligence community clients. Directs delivery organizations exceeding 500 personnel and multi-hundred-million-dollar portfolios spanning Agile transformation, DevSecOps, and cloud migration for agencies including the Department of Veterans Affairs, the Department of Homeland Security, and the General Services Administration. Recognized for rebuilding underperforming federal contracts into award-fee-earning programs, having recovered three troubled engagements collectively valued above $400M. Testifies periodically before congressional oversight committees on federal IT modernization strategy and advises agency CIOs on cloud and cybersecurity posture.

CORE COMPETENCIES
Enterprise IT Modernization | Program and Portfolio Management (PMP, PgMP) | Federal Acquisition Regulations (FAR/DFARS) | Agile at Scale (SAFe) | DevSecOps | Cloud Migration (AWS GovCloud, Azure Government) | P&L and Contract Management | Cybersecurity Risk Management (NIST RMF, FedRAMP) | Earned Value Management (EVM) | Congressional and Stakeholder Relations | Talent Development and Organizational Design | Cost Accounting Standards (CAS)

PROFESSIONAL EXPERIENCE
SENIOR VICE PRESIDENT, DIGITAL TRANSFORMATION & PROGRAM EXECUTION | HALCYON FEDERAL SYSTEMS
Arlington, VA | 2019 to Present
•	Lead a portfolio of 14 federal programs valued at $680M in aggregate annual revenue, directing a delivery organization of 540 employees and subcontractor personnel across seven client agencies.
•	Recovered a $210M Department of Veterans Affairs claims-modernization program from a "yellow" performance rating to consecutive "exceptional" CPARS ratings within 18 months by restructuring governance, replacing underperforming subcontractors, and instituting a formal earned-value management discipline.
•	Directed the migration of three legacy mainframe systems to AWS GovCloud for the Department of Homeland Security, reducing annual operating costs by $14M while achieving FedRAMP High authorization on an accelerated 11-month timeline.
•	Testified before a House Oversight and Reform subcommittee on federal legacy-system modernization risk, and briefed agency CIOs on cloud-adoption strategy on four separate occasions.
•	Built and chair the company's AI Governance and Responsible Technology Council, establishing model-risk and bias-review standards ahead of forthcoming federal AI procurement requirements.
•	Grew the digital transformation business unit from $220M to $680M in annual revenue over six years through organic growth and two competitively won recompetes.

VICE PRESIDENT, ENTERPRISE PROGRAM MANAGEMENT | SENTINEL RIDGE CONSULTING
McLean, VA | 2014 to 2019
•	Managed a $340M portfolio of Agile transformation engagements across the General Services Administration and the Department of Agriculture, overseeing 11 program managers and approximately 260 technical staff.
•	Led the enterprise rollout of a SAFe Agile operating model across 22 development teams, reducing average release cycle time from 14 weeks to 3 weeks.
•	Negotiated and executed a $95M task-order recompete win against three incumbent competitors by restructuring the technical and staffing approach around a DevSecOps delivery model.
•	Established the company's first formal Earned Value Management System, achieving ANSI/EIA-748 certification and passing an Integrated Baseline Review with zero significant findings.
•	Directed crisis response for a data-integrity incident affecting a benefits-processing system, coordinating with agency leadership and inspector general staff to remediate root cause within 30 days without service disruption.

PROGRAM DIRECTOR, IT MODERNIZATION | CARDINAL POINT TECHNOLOGIES
Washington, DC | 2010 to 2014
•	Directed a $140M IT modernization program for a federal civilian agency, managing a team of 180 developers, testers, and infrastructure engineers across four delivery sites.
•	Led the agency's transition from a waterfall to an Agile-Scrum delivery model, improving on-time release performance from 61% to 94% over two years.
•	Managed all FAR-compliant subcontractor administration for eight subcontractors, maintaining a 98% invoice-accuracy rate across the life of the contract.
•	Authored the technical volume for a follow-on recompete proposal that resulted in contract retention against two competing offerors.

SENIOR PROGRAM MANAGER | BLACKWOOD FEDERAL GROUP
Reston, VA | 2006 to 2010
•	Managed a portfolio of three concurrent federal IT support contracts totaling $65M in annual value, supervising 95 technical and administrative staff.
•	Led the design and implementation of a centralized service-desk consolidation initiative across five regional offices, reducing average ticket resolution time by 40%.
•	Served as primary client-facing point of contact for two agency program executive offices, maintaining a 100% award-fee score across six consecutive evaluation periods.
•	Introduced a formal risk-management framework adopted as the company standard across its federal civilian business unit.

PROGRAM MANAGER, SYSTEMS INTEGRATION | ASHFORD SYSTEMS INTEGRATION
Fairfax, VA | 2002 to 2006
•	Managed the systems-integration workstream for a $40M enterprise resource planning implementation supporting a defense logistics agency.
•	Supervised a team of 35 developers and business analysts across requirements gathering, configuration, testing, and deployment phases.
•	Reduced defect-escape rate to production by 55% through the introduction of a formal test-automation framework.

PROJECT MANAGER | CONTINENTAL DEFENSE TECHNOLOGIES
Arlington, VA | 1999 to 2002
•	Managed a 20-person development team delivering a case-management system for a defense intelligence client under a firm-fixed-price contract.
•	Coordinated security accreditation activities culminating in the system's first Authority to Operate under DIACAP predecessor standards.

Early Career
Systems Analyst / Team Lead | Fairmont Technology Partners | Washington, DC | 1996 to 1999
Led a five-person analyst team supporting requirements definition and testing for a federal financial-management system modernization effort.
Associate Systems Analyst | Keystone Federal Services | Washington, DC | 1994 to 1996
Supported systems analysis, documentation, and user acceptance testing for a federal benefits-processing application.

EDUCATION
Master of Business Administration, Georgetown University, McDonough School of Business | 2005
Master of MS, Information Systems, George Washington University | 1999
Bachelor of Science, Computer Science, Virginia Tech | 1994

CERTIFICATIONS
Project Management Professional (PMP) | Program Management Professional (PgMP) | Certified Information Systems Security Professional (CISSP) | Certified ScrumMaster (CSM) | ITIL v4 Foundation | DAWIA Program Management Level III

PROFESSIONAL AFFILIATIONS
Project Management Institute (PMI) | AFCEA International | American Council for Technology and Industry Advisory Council (ACT-IAC), Emerging Technology Committee

AWARDS & RECOGNITION
Federal 100 Award recipient, 2022, for contributions to federal cloud modernization strategy
Halcyon Federal Systems President's Award for Program Excellence, 2021 and 2023

SPEAKING & TESTIMONY
Panelist, ACT-IAC Imagine Nation ELC, "Scaling DevSecOps Across Legacy Federal Environments," 2023
Testimony, House Committee on Oversight and Reform, Subcommittee on Government Operations, on federal legacy-system modernization risk, 2022`,
  jobTitle: 'Chief Technology Officer, DNS',
  jobDescription: `Chief Technology Officer, DNS
Hybrid Remote • Columbia, MD • Information Technology

About Us
eSimplicity is a modern digital services company that partners with government agencies to improve the lives and protect the well-being of all Americans. Our engineers, designers, and strategists cut through complexity to create intuitive products and services that equip federal agencies with solutions to courageously transform today for a better tomorrow.

Position Summary 
eSimplicity is seeking a transformational executive to lead strategic customer engagement, technology innovation, business growth, and delivery excellence across its federal portfolio, with an initial emphasis on the Defense & National Security market. This executive will partner closely with the President, COO, Growth, and Delivery leaders to shape customer strategy, expand market presence, improve operational performance, and build long-term customer relationships.

Key Responsibilities 
- Develop and execute the strategic vision for our Defense & National Security business. 
- Build trusted executive relationships with government customers, industry partners, and key stakeholders. 
- Provide technical oversight to program delivery strategies, roadmap, and architecture for enterprise programs (Big Data/AI), and mission engineering programs (C4ISR, Electronic Warfare) 
- Lead a team of Chief Solutions Architects and Strategists on technology strategy including cloud modernization, AI, DevSecOps, cybersecurity, data, and digital transformation initiatives. 

Requirements
- Bachelor's degree in Business, Engineering, Computer Science, Information Technology, or related discipline. 
- 15+ years of progressive leadership experience supporting Federal Government customers. 
- Demonstrated experience leading large technology modernization, systems integration, or digital transformation initiatives. 
- Strong understanding of cloud technologies, DevSecOps, Agile delivery, cybersecurity, AI, and emerging technologies. 
- Experience with C4ISR including Vision AI, Spectrum, Electronic Warfare solutions and services.`
};

const SAMPLE_DATA_2 = {
  resume: `JONATHAN R. STERLING\nVice President, Enterprise Sales & Global Alliances\njonathan.sterling@email.com | 212-555-0198 | New York, NY | linkedin.com/in/margaret-chenwhitfield\n\nPROFESSIONAL SUMMARY\nStrategic Sales Executive with over 20 years of experience scaling high-growth Enterprise SaaS organizations. Expert in building high-performance global sales organizations and executing multi-million dollar complex deal structures. Proven track record of increasing Annual Recurring Revenue (ARR) from $10M to over $150M within three fiscal years.\n\nCORE COMPETENCIES\nEnterprise SaaS Sales | Strategic Account Management | Global Team Leadership | GTM Strategy | Pipeline Optimization | Contract Negotiation | CRM Strategy (Salesforce) | Revenue Forecasting | Value-Based Selling\n\nPROFESSIONAL EXPERIENCE\nVICE PRESIDENT, GLOBAL ENTERPRIES SALES | NEXUS CLOUD SOLUTIONS\nNew York, NY | 2018 to Present\n• Lead a global organization of 120 sales professionals, managing a total revenue quota of $240M.\n• Accelerated Year-over-Year (YoY) revenue growth by 42% in 2023, exceeding board-level growth targets.\n• Secured a $12M multi-year master service agreement with a Fortune 50 financial services firm.\n\nSENIOR DIRECTOR, NORTH AMERICAN SALES | DATASTREAM ANALYTICS\nSan Francisco, CA | 2012 to 2018\n• Managed a team of 45 Account Executives and Sales Engineers, driving $85M in annual sales.\n• Improved sales cycle efficiency by 25% through standardization of value-selling methodology.\n\nEDUCATION\nMaster of Business Administration (MBA), NYU Stern School of Business | 2006\n\nCERTIFICATIONS\nMEDDICC Certified Sales Professional | Challenger Sales Master`,
  jobTitle: 'VP of Enterprise Sales',
  jobDescription: `Vice President of Sales\nFull-time • Remote/Hybrid • SaaS • Enterprise Growth\n\nAbout the Role\nWe are looking for a high-impact VP of Sales to lead our Enterprise growth phase. You will be responsible for scaling our North American sales efforts and establishing the strategic GTM framework for our next stage of growth ($50M to $200M ARR).\n\nKey Responsibilities\n- Drive the Global GTM strategy for the enterprise segment.\n- Build, mentor, and scale a world-class sales organization.\n- Manage complex contract negotiations and maintain high-level C-suite relationships.\n- Champion value-based selling methodologies (MEDDICC, Challenger).\n\nRequirements\n- 15+ years of progressive leadership experience in Enterprise SaaS Sales.\n- Demonstrated success in scaling SaaS ARR from $50M to $100M+.\n- Expert knowledge of MEDDICC or similar sales methodologies.`
};

type AnalysisState = AtsAnalysisResult & {
    matchPercentage: number;
    fullScore?: {
        compositeScore: number;
        qualitativeRating: string;
        scoreBreakdown: any;
        penalties: any[];
        topRecommendations: string[];
    };
};

interface ResumeOptimizerPageProps {
  actions: {
    optimize: (input: any) => Promise<any>;
    getResumeScore: (input: any) => Promise<any>;
    getInitialAnalysis: (input: any) => Promise<{ success: boolean; data?: AtsAnalysisResult; error?: string }>;
    runNewKeywordExtraction: (jobDescription: string, ownerUid?: string) => Promise<any>;
    counselorChat: (input: any) => Promise<any>;
    runSpellCheck: (input: { resumeText: string; keywords: string[]; classificationPath?: any }) => Promise<any>;
    runSmartCompression: (input: { resumeText: string; keywords: string[]; targetJobTitle?: string; classificationPath?: any }) => Promise<any>;
    runOnePageDistillation: (input: { resumeText: string; keywords: string[]; targetJobTitle?: string; classificationPath?: any }) => Promise<any>;
    runGenerateCoverLetter: (input: { resume: string; jobDescription: string }) => Promise<any>;
    runPolishCoverLetter: (input: { coverLetterText: string; resumeText: string }) => Promise<any>;
  };
}

export default function ResumeOptimizerPage({ actions }: ResumeOptimizerPageProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingCL, setIsGeneratingCL] = useState(false);
  const [isSpellChecking, setIsSpellChecking] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDistilling, setIsDistilling] = useState(false);
  const [isAutoHealing, setIsAutoHealing] = useState(false);
  const [isFinalPolishing, setIsFinalPolishing] = useState(false);
  const [isPolishingCL, setIsPolishingCL] = useState(false);
  
  const [optimizedResumeText, setOptimizedResumeText] = useState("");
  const [coverLetterText, setCoverLetterText] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [keywordData, setKeywordData] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditModeCL, setIsEditModeCL] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [resumeInputType, setResumeInputType] = useState<'paste' | 'upload'>('paste');
  const [activeTab, setActiveTab] = useState("step-1");
  const [viewMode, setViewMode] = useState<'web' | 'print'>('web');
  const [containerWidth, setContainerWidth] = useState(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // History State for Resume
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // History State for Cover Letter
  const [coverLetterHistory, setCoverLetterHistory] = useState<string[]>([]);
  const [coverLetterHistoryIndex, setCoverLetterHistoryIndex] = useState(-1);

  const estimatedPages = useMemo(() => estimatePageCount(optimizedResumeText), [optimizedResumeText]);
  
  const scale = useMemo(() => {
    if (viewMode === 'web' || !containerWidth) return 1;
    const pageWidthPx = PAGE_WIDTH * 1.333333;
    return Math.min(1, containerWidth / pageWidthPx);
  }, [viewMode, containerWidth]);

  const pageMarkers = useMemo(() => {
    const total = Math.floor(estimatedPages);
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [estimatedPages]);
  
  const [scoringSteps] = useState<ScoringStep[]>([
    { number: 1, label: 'IDENTIFYING CORE REQUIREMENTS', status: 'idle' },
    { number: 2, label: 'MAPPING TECHNICAL TAXONOMY', status: 'idle' },
    { number: 3, label: 'EXTRACTING SENIORITY SIGNALS', status: 'idle' },
    { number: 4, label: 'FINALIZING REQUIREMENT SCHEMA', status: 'idle' },
  ]);

  const { toast } = useToast();
  const { user } = useUser();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { resume: "", jobDescription: "", jobTitle: "" },
  });

  const updateOptimizedText = useCallback((newText: string) => {
    if (typeof newText !== 'string') return;
    
    setOptimizedResumeText(newText);
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(newText);
      if (next.length > 50) next.shift();
      return next;
    });
    setHistoryIndex(prev => {
      const nextIndex = historyIndex + 1;
      return nextIndex >= 50 ? 49 : nextIndex;
    });

    if (keywordData && mounted) {
        try {
            const cleanText = stripTrackingMarkers(newText);
            const res = calculateAtsMatch(keywordData, cleanText, form.getValues('jobTitle'));
            
            setAnalysis({
                ...res,
                matchPercentage: res.score,
                fullScore: {
                    compositeScore: res.score,
                    qualitativeRating: res.verdict,
                    scoreBreakdown: res.breakdown,
                    penalties: res.penalties || [],
                    topRecommendations: Array.isArray(res.fixes) ? res.fixes.map(f => f.label) : []
                }
            });
        } catch (err) {
            console.error("Real-time re-check failed:", err);
        }
    }
  }, [historyIndex, keywordData, mounted, form]);

  const updateCoverLetterText = useCallback((newText: string) => {
    if (typeof newText !== 'string') return;
    
    setCoverLetterText(newText);
    setCoverLetterHistory(prev => {
      const next = prev.slice(0, coverLetterHistoryIndex + 1);
      next.push(newText);
      if (next.length > 50) next.shift();
      return next;
    });
    setCoverLetterHistoryIndex(prev => {
      const nextIndex = coverLetterHistoryIndex + 1;
      return nextIndex >= 50 ? 49 : nextIndex;
    });
  }, [coverLetterHistoryIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setOptimizedResumeText(history[prevIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setOptimizedResumeText(history[nextIndex]);
    }
  };

  const handleUndoCL = () => {
    if (coverLetterHistoryIndex > 0) {
      const prevIndex = coverLetterHistoryIndex - 1;
      setCoverLetterHistoryIndex(prevIndex);
      setCoverLetterText(coverLetterHistory[prevIndex]);
    }
  };

  const handleRedoCL = () => {
    if (coverLetterHistoryIndex < coverLetterHistory.length - 1) {
      const nextIndex = coverLetterHistoryIndex + 1;
      setCoverLetterHistoryIndex(nextIndex);
      setCoverLetterText(coverLetterHistory[nextIndex]);
    }
  };

  const handleReset = useCallback(() => {
    form.reset({ resume: "", jobDescription: "", jobTitle: "" });
    setAnalysis(null);
    setKeywordData(null);
    setOptimizedResumeText("");
    setCoverLetterText("");
    setHistory([]);
    setHistoryIndex(-1);
    setCoverLetterHistory([]);
    setCoverLetterHistoryIndex(-1);
    setActiveTab("step-1");
    toast({ title: "System Reset", description: "All data cleared." });
  }, [form, toast]);

  useEffect(() => {
    setMounted(true);
    const handlePlatformReset = () => handleReset();
    window.addEventListener('platform-reset', handlePlatformReset);
    return () => window.removeEventListener('platform-reset', handlePlatformReset);
  }, [handleReset]);

  useEffect(() => {
    if (!previewContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleAutoFill1 = useCallback(() => {
    form.setValue('resume', SAMPLE_DATA_1.resume);
    form.setValue('jobTitle', SAMPLE_DATA_1.jobTitle);
    form.setValue('jobDescription', SAMPLE_DATA_1.jobDescription);
    setResumeInputType('paste');
    toast({ title: "Tech Executive Loaded" });
    setActiveTab("step-2");
  }, [form, toast]);

  const handleAutoFill2 = useCallback(() => {
    form.setValue('resume', SAMPLE_DATA_2.resume);
    form.setValue('jobTitle', SAMPLE_DATA_2.jobTitle);
    form.setValue('jobDescription', SAMPLE_DATA_2.jobDescription);
    setResumeInputType('paste');
    toast({ title: "Sales Executive Loaded" });
    setActiveTab("step-2");
  }, [form, toast]);

  useEffect(() => {
    const h1 = () => handleAutoFill1();
    const h2 = () => handleAutoFill2();
    window.addEventListener('dev-auto-fill-1', h1);
    window.addEventListener('dev-auto-fill-2', h2);
    return () => {
      window.removeEventListener('dev-auto-fill-1', h1);
      window.removeEventListener('dev-auto-fill-2', h2);
    };
  }, [handleAutoFill1, handleAutoFill2]);

  const resumeValue = form.watch('resume');
  const jobTitleValue = form.watch('jobTitle');
  const jobDescValue = form.watch('jobDescription');

  const isStep1Complete = resumeValue.length >= 50;
  const isStep2Complete = jobTitleValue.length > 1 && jobDescValue.length >= 50;
  const isStep3Complete = !!keywordData && !!analysis;
  const isStep4Complete = !!optimizedResumeText;

  const handleExtractAndMatch = async () => {
    if (!isStep1Complete || !isStep2Complete) return;
    setIsExtracting(true);
    try {
      const kwResponse = await actions.runNewKeywordExtraction(jobDescValue, user?.uid);
      if (kwResponse.success) {
        setKeywordData(kwResponse.data);
        setIsAnalyzing(true);
        const matchResponse = await actions.getInitialAnalysis({ 
          resume: resumeValue, 
          jobDescription: jobDescValue, 
          extractedKeywordsJson: JSON.stringify(kwResponse.data), 
          userId: user?.uid, 
          jobTitle: jobTitleValue 
        });
        if (matchResponse.success && matchResponse.data) {
          const res = matchResponse.data;
          setAnalysis({
            ...res,
            matchPercentage: res.score,
            fullScore: {
                compositeScore: res.score,
                qualitativeRating: res.verdict,
                scoreBreakdown: res.breakdown,
                penalties: res.penalties || [],
                topRecommendations: Array.isArray(res.fixes) ? res.fixes.map(f => f.label) : []
            }
          });
          setActiveTab("diagnostics");
          toast({ title: "Analysis Complete", description: "Match score and gaps identified." });
        } else {
          toast({ variant: "destructive", title: "Diagnostic Error", description: matchResponse.error });
        }
      } else {
        toast({ variant: "destructive", title: "Extraction Failed", description: kwResponse.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "System Error" });
    } finally {
      setIsExtracting(false);
      setIsAnalyzing(false);
    }
  };

  const onOptimize = async (customText?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/optimize-resume', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          resume: customText || resumeValue, 
          jobDescription: jobDescValue, 
          jobTitle: jobTitleValue, 
          extractedKeywordsJson: JSON.stringify(keywordData) 
        }) 
      });
      const data = await response.json();
      if (data.success) { 
        updateOptimizedText(data.data.optimizedResumeText);
        setActiveTab("optimized");
        toast({ title: "Optimization Success" });
      } else {
        toast({ variant: "destructive", title: "Rewrite Failed", description: data.error });
      }
    } catch (err: any) {
        toast({ variant: "destructive", title: "Optimization Failed", description: err.message });
    } finally { setIsLoading(false); }
  };

  const onSpellCheck = async () => {
    setIsSpellChecking(true);
    try {
      const response = await actions.runSpellCheck({ 
        resumeText: optimizedResumeText, 
        keywords: [],
        classificationPath: analysis?.classification?.path
      });
      if (response.success) {
        updateOptimizedText(response.data.correctedResume);
        toast({ title: "Spell Check Complete" });
        response.data.warnings?.forEach((w: string) => toast({ variant: "destructive", title: "Spell Check Warning", description: w }));
      } else {
        toast({ variant: "destructive", title: "Spell Check Failed", description: response.error });
      }
    } catch (err: any) {
        toast({ variant: "destructive", title: "Spell Check Failed", description: err.message });
    } finally { setIsSpellChecking(false); }
  };

  const onFinalPolish = async () => {
    setIsFinalPolishing(true);
    try {
      const keywords = keywordData?.keywords?.map((k: any) => k.term) || [];
      const response = await fetch('/api/polish-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: optimizedResumeText,
          keywords: keywords,
          classificationPath: analysis?.classification?.path || 'path_b'
        })
      });
      const data = await response.json();
      if (data.success) {
        updateOptimizedText(data.data.polishedResume);
        toast({ title: "Final Polish Applied", description: "Executive standards enforced." });
      } else {
        toast({ variant: "destructive", title: "Polish Failed", description: data.error });
      }
    } catch (err: any) {
        toast({ variant: "destructive", title: "System Error", description: err.message });
    } finally { setIsFinalPolishing(false); }
  };

  const onCompress = async () => {
    setIsCompressing(true);
    try {
      const response = await actions.runSmartCompression({ 
        resumeText: optimizedResumeText, 
        keywords: [], 
        targetJobTitle: jobTitleValue,
        classificationPath: analysis?.classification?.path
      });
      if (response.success) {
        updateOptimizedText(response.data.compressedResume);
        toast({ title: "Compressed to 2-Pages" });
        response.data.warnings?.forEach((w: string) => toast({ variant: "destructive", title: "Compression Warning", description: w }));
      } else {
        toast({ variant: "destructive", title: "Compression Failed", description: response.error });
      }
    } catch (err: any) {
        toast({ variant: "destructive", title: "Compression Failed", description: err.message });
    } finally { setIsCompressing(false); }
  };

  const onDistill = async () => {
    setIsDistilling(true);
    try {
      const response = await actions.runOnePageDistillation({ 
        resumeText: optimizedResumeText, 
        keywords: [], 
        targetJobTitle: jobTitleValue,
        classificationPath: analysis?.classification?.path
      });
      if (response.success) {
        updateOptimizedText(response.data.distilledResume);
        toast({ title: "Distilled to 1-Page" });
        response.data.warnings?.forEach((w: string) => toast({ variant: "destructive", title: "Distillation Warning", description: w }));
      } else {
        toast({ variant: "destructive", title: "Distillation Failed", description: response.error });
      }
    } catch (err: any) {
        toast({ variant: "destructive", title: "Distillation Failed", description: err.message });
    } finally { setIsDistilling(false); }
  };

  const onAutoHeal = useCallback(async (isInitial: boolean = false) => {
    if (!analysis || !keywordData) return;
    
    if (isInitial && !optimizedResumeText) {
        setIsLoading(true);
        try {
            const supportedKws = analysis.supportedKeywords.map(k => ({ keyword: k, category: 'hard_skill' }));
            const unsupportedKws = analysis.unsupportedKeywords.map(k => ({ keyword: k, category: 'hard_skill' }));
            const result = injectKeywords(resumeValue, [...supportedKws, ...unsupportedKws], 'ADDED_SUPPORTED', analysis?.classification?.path);
            await onOptimize(result.updatedText);
            return;
        } finally {
            setIsLoading(false);
        }
    }

    setIsAutoHealing(true);
    try {
      const supportedKws = analysis.supportedKeywords.map(k => ({ keyword: k, category: 'hard_skill' }));
      const unsupportedKws = analysis.unsupportedKeywords.map(k => ({ keyword: k, category: 'hard_skill' }));
      
      let currentText = optimizedResumeText || resumeValue;
      const sResult = injectKeywords(currentText, supportedKws, 'ADDED_SUPPORTED', analysis?.classification?.path);
      currentText = sResult.updatedText;
      const uResult = injectKeywords(currentText, unsupportedKws, 'ADDED_UNSUPPORTED', analysis?.classification?.path);
      currentText = uResult.updatedText;
      
      updateOptimizedText(currentText);
      toast({ title: "Alignment Synchronized", description: `${sResult.injectedCount + uResult.injectedCount} gaps resolved.` });
    } finally { setIsAutoHealing(false); }
  }, [analysis, keywordData, optimizedResumeText, resumeValue, onOptimize, toast, updateOptimizedText]);

  const onGenerateCoverLetter = async () => {
    setIsGeneratingCL(true);
    try {
      const response = await actions.runGenerateCoverLetter({
        resume: optimizedResumeText || resumeValue,
        jobDescription: jobDescValue
      });
      if (response.success) {
        const text = response.data.coverLetter;
        setCoverLetterText(text);
        setCoverLetterHistory([text]);
        setCoverLetterHistoryIndex(0);
        setActiveTab("cover-letter");
        toast({ title: "Cover Letter Ready" });
      } else {
        toast({ variant: "destructive", title: "Generation Failed", description: response.error });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: e.message });
    } finally {
      setIsGeneratingCL(false);
    }
  };

  const onFinalPolishCL = async () => {
    setIsPolishingCL(true);
    try {
      const response = await actions.runPolishCoverLetter({
        coverLetterText: coverLetterText,
        resumeText: optimizedResumeText || resumeValue
      });
      if (response.success) {
        updateCoverLetterText(response.data.polishedCoverLetter);
        toast({ title: "Cover Letter Polished" });
      } else {
        toast({ variant: "destructive", title: "Polish Failed", description: response.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "System Error", description: err.message });
    } finally {
      setIsPolishingCL(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await processFile(file);
      if (result.extractionStatus === 'success') {
        form.setValue('resume', result.extractedText);
        toast({ title: "File Captured" });
        setActiveTab("step-2");
      }
    }
  };

  const redlineDiff = useMemo(() => {
    if (!isCompareMode || !resumeValue || !optimizedResumeText) return null;
    
    const original = resumeValue;
    const current = stripTrackingMarkers(optimizedResumeText);
    const diffs = diff.diffWords(original, current);

    return (
      <div className="space-y-4">
        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b pb-2 mb-4">
          <DiffIcon className="h-3 w-3 inline mr-1" /> Redline Comparison (Original vs. Optimized)
        </p>
        <div className={cn("leading-relaxed whitespace-pre-wrap", viewMode === 'web' ? "text-[10pt]" : "text-[inherit]")}>
          {diffs.map((part, idx) => {
            const color = part.added ? "text-green-600 bg-green-50 underline decoration-green-300" : 
                          part.removed ? "text-red-600 bg-red-50 line-through decoration-red-300" : 
                          "text-zinc-600";
            return (
              <span key={idx} className={cn("transition-all duration-300", color)}>
                {part.value}
              </span>
            );
          })}
        </div>
      </div>
    );
  }, [isCompareMode, resumeValue, optimizedResumeText, viewMode]);

  const renderTrackedResume = (text: string) => {
    if (!text || typeof text !== 'string') return null;
    const markerPattern = /(@@ADDED_SUPPORTED:[^@]+@@|@@ADDED_UNSUPPORTED:[^@]+@@)/g;
    const normalizedText = text.replace(/\\n/g, '\n');
    
    try {
        return normalizedText.split('\n').map((line, idx) => {
          if (!line.trim()) return <div key={idx} style={{ height: viewMode === 'web' ? '1.6em' : `${PDF_LINE_STEP_BODY_MM}mm` }} />;
          
          const parts = line.split(markerPattern);
          return (
            <div key={idx} className="leading-[inherit]">
              {parts.map((part, i) => {
                if (!part) return null;
                if (part.startsWith('@@ADDED_SUPPORTED:')) {
                  const splitParts = part.split(':');
                  const kw = splitParts[splitParts.length - 1]?.replace(/@@/g, '') || "keyword";
                  return <mark key={i} className="bg-blue-50 text-blue-700 px-1 rounded font-bold border-b-2 border-blue-200 inline-block my-0.5">{kw}</mark>;
                }
                if (part.startsWith('@@ADDED_UNSUPPORTED:')) {
                  const splitParts = part.split(':');
                  const kw = splitParts[splitParts.length - 1]?.replace(/@@/g, '') || "keyword";
                  return <mark key={i} className="bg-orange-50 text-orange-700 px-1 rounded font-bold border-b-2 border-orange-200 inline-block my-0.5">{kw}</mark>;
                }
                return <span key={i}>{part}</span>;
              })}
            </div>
          );
        });
    } catch (err) {
        console.error("Render tracked resume failed:", err);
        return <div className="whitespace-pre-wrap">{text}</div>;
    }
  };

  const ToolbarButton = ({ onClick, disabled, icon: Icon, label, variant = "outline", className = "" }: any) => (
    <Button 
      variant={variant} 
      onClick={onClick} 
      disabled={disabled} 
      className={cn(
        "h-auto py-3 px-3 flex flex-col items-center gap-1.5 border-zinc-200 rounded-xl hover:border-black transition-all group min-w-[84px] max-w-full",
        className
      )}
    >
      <Icon className={cn("h-4 w-4", variant === "outline" ? "text-zinc-400 group-hover:text-black" : "")} />
      <span className="text-[8px] font-black uppercase tracking-widest text-center whitespace-normal leading-tight">
        {label}
      </span>
    </Button>
  );

  return (
    <div className="relative min-h-screen bg-[#fafafa]">
      <div className="container mx-auto max-w-6xl py-12 px-6">
        
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-2xl font-black tracking-tighter text-black uppercase">
            WELCOME TO RESUM<span className="text-[#FF0033]">AI</span>T
          </h1>
          <p className="text-base font-medium text-zinc-500 max-w-2xl mx-auto leading-relaxed">
            Quickly tailor your resume to any role — and work with, instead of against, the AI-powered Applicant Tracking Systems that stand between you and your next job opportunity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="p-8 enterprise-card rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-black">SURVIVE THE FILTERS</h3>
            <p className="text-[11px] font-medium text-zinc-500 leading-relaxed">
              75% of executive resumes are discarded by ATS algorithms before a human eye ever touches them. Resumait is built to ensure your professional story makes it to the shortlist.
            </p>
          </div>
          <div className="p-8 enterprise-card rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-black">SURGICAL PRECISION</h3>
            <p className="text-[11px] font-medium text-zinc-500 leading-relaxed">
              A generic resume is a failed resume. You must optimize for every specific job description, reflecting the exact seniority signals and technical keywords recruiters prioritize.
            </p>
          </div>
          <div className="p-8 enterprise-card rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-black">SPEED TO MARKET</h3>
            <p className="text-[11px] font-medium text-zinc-500 leading-relaxed">
              The first 24 hours of a job posting are critical. Resumait allows you to surgically adapt your executive profile in minutes, not hours, maintaining your competitive advantage.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          <div className="lg:col-span-4 space-y-12 lg:sticky lg:top-24">
            <div className="space-y-8">
              
              <div className="pipeline-step">
                <div className={cn("absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border-2 z-10 transition-all", isStep1Complete ? "bg-black border-black text-white" : "bg-white border-zinc-200 text-zinc-400")}>
                  {isStep1Complete ? <Check className="h-4 w-4" /> : 1}
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-wider">Resume Source</h3>
                    <p className="text-[10px] font-bold text-zinc-400 mt-1">Paste or upload the longest, most comprehensive version of your resume.</p>
                  </div>
                  <Card className="enterprise-card rounded-2xl overflow-hidden border-none">
                    <CardContent className="p-4">
                       <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setResumeInputType('paste')} className={cn("flex-1 text-[10px] font-black uppercase h-8", resumeInputType === 'paste' && "border-black bg-zinc-50")}>Text</Button>
                        <Button variant="outline" size="sm" onClick={() => setResumeInputType('upload')} className={cn("flex-1 text-[10px] font-black uppercase h-8", resumeInputType === 'upload' && "border-black bg-zinc-50")}>File</Button>
                       </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className={cn("pipeline-step", !isStep1Complete && "opacity-30")}>
                <div className={cn("absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border-2 z-10", isStep2Complete ? "bg-black border-black text-white" : "bg-white border-zinc-200 text-zinc-400")}>
                  {isStep2Complete ? <Check className="h-4 w-4" /> : 2}
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-wider">Job Targeting</h3>
                    <p className="text-[10px] font-bold text-zinc-400 mt-1">Enter the title and complete job description for the job that you are seeking.</p>
                  </div>
                </div>
              </div>

              <div className={cn("pipeline-step", !isStep2Complete && "opacity-30")}>
                <div className={cn("absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border-2 z-10", isStep3Complete ? "bg-black border-black text-white" : "bg-white border-zinc-200 text-zinc-400")}>
                  {isStep3Complete ? <Check className="h-4 w-4" /> : 3}
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-wider">ATS Score</h3>
                    <p className="text-[10px] font-bold text-zinc-400 mt-1">Let Resumait run an audit to predict how the leading ATS will likely score your resume for this particular role.</p>
                  </div>
                  <Button 
                    className="primary-cta w-full"
                    disabled={!isStep1Complete || !isStep2Complete || isExtracting}
                    onClick={handleExtractAndMatch}
                  >
                    {isExtracting ? <Loader2 className="animate-spin h-5 w-5" /> : "Run Diagnostic"}
                  </Button>
                  
                  {isAnalyzing && <ScoringProgress steps={scoringSteps} currentStep={1} isVisible={true} />}
                  
                  {analysis && (
                    <div className="p-6 enterprise-card rounded-2xl text-center animate-in fade-in slide-in-from-top-4">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">ATS MATCH</p>
                      <div className="text-5xl font-black text-black tracking-tighter">{analysis.matchPercentage}%</div>
                    </div>
                  )}
                </div>
              </div>

              <div className={cn("pipeline-step", !isStep3Complete && "opacity-30")}>
                <div className={cn("absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border-2 z-10", isStep4Complete ? "bg-black border-black text-white" : "bg-white border-zinc-200 text-zinc-400")}>
                  {isStep4Complete ? <Check className="h-4 w-4" /> : 4}
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-wider">Initial Optimization</h3>
                    <p className="text-[10px] font-bold text-zinc-400 mt-1">Perform the initial rewrite of your resume to bring it into line with the leading ATS standards.</p>
                  </div>
                  <Button 
                    className="primary-cta w-full bg-[#FF0033] hover:bg-red-700 text-white"
                    disabled={!isStep3Complete || isLoading}
                    onClick={() => onOptimize()}
                  >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Rewrite Resume
                  </Button>
                </div>
              </div>

              <div className={cn("pipeline-step", !isStep4Complete && "opacity-30")}>
                <div className="absolute left-0 top-0 h-8 w-8 rounded-full bg-white border-2 border-zinc-200 flex items-center justify-center font-black text-zinc-400 text-xs z-10">5</div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-wider">Final Export</h3>
                    <p className="text-[10px] font-bold text-zinc-400 mt-1">Download your optimized resume as a DOCX or PDF file. (Please note that some ATS still prefer DOCX.)</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="text-[10px] font-black uppercase h-12" disabled={!isStep4Complete} onClick={() => downloadResumeAsPdf(optimizedResumeText, 'Candidate', jobTitleValue)}>PDF</Button>
                    <Button variant="outline" className="text-[10px] font-black uppercase h-12" disabled={!isStep4Complete} onClick={() => downloadResumeAsDocx(optimizedResumeText, 'Candidate', jobTitleValue)}>DOCX</Button>
                  </div>
                </div>
              </div>

              <div className={cn("pipeline-step", !isStep4Complete && "opacity-30")}>
                <div className={cn("absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border-2 z-10", coverLetterText ? "bg-black border-black text-white" : "bg-white border-zinc-200 text-zinc-400")}>
                  {coverLetterText ? <Check className="h-4 w-4" /> : 6}
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-wider">AI Cover Letter</h3>
                    <p className="text-[10px] font-bold text-zinc-400 mt-1">Let Resumait draft a cover letter for you that matches your newly optimized resume.</p>
                  </div>
                  <Button 
                    variant="outline"
                    className="w-full h-12 text-[10px] font-black uppercase tracking-widest border-2 border-black"
                    disabled={!isStep4Complete || isGeneratingCL}
                    onClick={onGenerateCoverLetter}
                  >
                    {isGeneratingCL ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                    Generate Letter
                  </Button>
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-zinc-400 hover:text-[#FF0033] font-black uppercase tracking-widest text-[9px]">
                  <RotateCcw className="h-3 w-3 mr-2" /> START OVER
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl border-none shadow-elevated">
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset diagnostic session?</AlertDialogTitle>
                  <AlertDialogTitle className="font-bold text-[13px] text-zinc-500 uppercase tracking-widest">Action Cannot Be Undone</AlertDialogTitle>
                  <AlertDialogDescription className="font-bold">This will clear all current inputs and analysis data.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl font-black uppercase text-[10px]">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="bg-[#FF0033] rounded-xl font-black uppercase text-[10px]">Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="lg:col-span-8">
            <Card className="enterprise-card rounded-2xl overflow-hidden border-none shadow-elevated min-h-[600px] flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1">
                <div className="px-8 py-6 border-b bg-zinc-50/50">
                  <TabsList className="bg-zinc-200/50 p-1 rounded-xl h-auto flex-wrap justify-start gap-1">
                    <TabsTrigger value="step-1" className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Database className="h-3 w-3 mr-2 text-[#FF0033]" />
                      01: Resume
                    </TabsTrigger>
                    {isStep1Complete && (
                      <TabsTrigger value="step-2" className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Target className="h-3 w-3 mr-2 text-[#FF0033]" />
                        02: Targeting
                      </TabsTrigger>
                    )}
                    {isStep3Complete && (
                      <TabsTrigger value="diagnostics" className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Activity className="h-3 w-3 mr-2 text-[#FF0033]" />
                        03: Audit
                      </TabsTrigger>
                    )}
                    {isStep4Complete && (
                      <TabsTrigger value="optimized" className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Sparkles className="h-3 w-3 mr-2 text-[#FF0033]" />
                        04: Optimized
                      </TabsTrigger>
                    )}
                    {coverLetterText && (
                      <TabsTrigger value="cover-letter" className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <FileText className="h-3 w-3 mr-2 text-[#FF0033]" />
                        05: Letter
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                  <TabsContent value="step-1" className="m-0 p-8 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-[10px] font-black uppercase text-black tracking-widest flex items-center gap-2">
                        <Database className="h-4 w-4 text-[#FF0033]" />
                        Step 01: Resume Source
                      </h3>
                      {isStep1Complete && (
                        <div className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase tracking-widest animate-in fade-in zoom-in">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          RESUME CAPTURED
                        </div>
                      )}
                    </div>
                    {resumeInputType === 'paste' ? (
                      <Textarea 
                        className="min-h-[450px] border-none focus-visible:ring-0 text-sm font-medium leading-relaxed p-0 bg-transparent resize-none" 
                        placeholder="Paste current resume text..."
                        value={resumeValue}
                        onChange={e => form.setValue('resume', e.target.value)}
                      />
                    ) : (
                      <div className="min-h-[450px] flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-zinc-50/30 relative">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                        <Upload className="h-10 w-10 text-zinc-300 mb-4" />
                        <p className="text-xs font-black text-zinc-400 uppercase">Upload PDF or DOCX</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="step-2" className="m-0 p-8 animate-in fade-in duration-300">
                    <h3 className="text-[10px] font-black uppercase text-black tracking-widest flex items-center gap-2 mb-8">
                      <Target className="h-4 w-4 text-[#FF0033]" />
                      Step 02: Job Targeting
                    </h3>
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Target Job Title</p>
                        <Input 
                          className="h-12 text-sm font-bold border-zinc-100 focus-visible:ring-[#FF0033]/50 focus-visible:border-[#FF0033]/50 rounded-xl" 
                          value={jobTitleValue} 
                          onChange={e => form.setValue('jobTitle', e.target.value)} 
                          placeholder="e.g., Senior Vice President of Operations"
                        />
                      </div>
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Full Requirements Text</p>
                        <Textarea 
                          className="min-h-[350px] border-none focus-visible:ring-0 text-sm font-medium leading-relaxed p-0 bg-transparent resize-none" 
                          placeholder="Paste the full job description here..."
                          value={jobDescValue}
                          onChange={e => form.setValue('jobDescription', e.target.value)}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="diagnostics" className="m-0 p-8 animate-in fade-in duration-300">
                    {analysis && (
                      <KeywordAlignmentAudit 
                        foundKeywords={analysis.foundKeywords}
                        supportedKeywords={analysis.supportedKeywords}
                        unsupportedKeywords={analysis.unsupportedKeywords}
                        topRecommendations={analysis.fullScore?.topRecommendations}
                        penalties={analysis.fullScore?.penalties}
                        onIntegrateSupported={() => onAutoHeal(true)}
                        isIntegratingSupported={isAutoHealing || isLoading}
                        onAutoFillMissing={() => onAutoHeal(true)}
                        isAutoFillingMissing={isAutoHealing || isLoading}
                        isActionsDisabled={!optimizedResumeText && !resumeValue}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="optimized" className="m-0 animate-in fade-in duration-300 flex flex-col">
                    <div className="px-8 py-6 border-b bg-zinc-50/50 sticky top-0 z-10 backdrop-blur-sm">
                      <h3 className="text-[10px] font-black uppercase text-black tracking-widest mb-6">OPTIMIZED RESUME</h3>
                      <div className="flex flex-wrap items-stretch gap-2">
                        <ToolbarButton 
                          onClick={() => onAutoHeal()} 
                          disabled={isAutoHealing} 
                          icon={ShieldCheck} 
                          label="Key: Fix All Audit Issues" 
                          variant="destructive"
                          className="bg-[#FF0033] hover:bg-red-700 border-none shadow-lg"
                        />
                        <ToolbarButton 
                          onClick={onFinalPolish} 
                          disabled={isFinalPolishing || !optimizedResumeText} 
                          icon={Sparkles} 
                          label="Key: Final AI Polish" 
                          className="border-[#FF0033]/40 bg-[#FF0033]/5"
                        />
                        <ToolbarButton 
                          onClick={onSpellCheck} 
                          disabled={isSpellChecking} 
                          icon={Type} 
                          label="Key: Spell Check" 
                        />
                        <ToolbarButton 
                          onClick={() => setIsEditMode(!isEditMode)} 
                          icon={isEditMode ? Check : Edit3} 
                          label="Optional: Manual Edit" 
                          className={isEditMode ? "border-[#FF0033] bg-[#FF0033]/5" : ""}
                        />
                        <ToolbarButton 
                          onClick={() => setViewMode('web')} 
                          icon={Monitor} 
                          label="Web View" 
                          className={viewMode === 'web' ? "border-black bg-zinc-50" : ""}
                        />
                        <ToolbarButton 
                          onClick={() => setViewMode('print')} 
                          icon={Printer} 
                          label="Print View" 
                          className={viewMode === 'print' ? "border-black bg-zinc-50" : ""}
                        />
                        <ToolbarButton 
                          onClick={onCompress} 
                          disabled={isCompressing} 
                          icon={Scissors} 
                          label="Optional: 2-Page (10+ Years)" 
                        />
                        <ToolbarButton 
                          onClick={onDistill} 
                          disabled={isDistilling} 
                          icon={MousePointer2} 
                          label="OPTIONAL: 1-Page (Less Than 10 Years)" 
                        />
                        <ToolbarButton 
                          onClick={handleUndo} 
                          disabled={historyIndex <= 0} 
                          icon={Undo2} 
                          label="Undo" 
                        />
                        <ToolbarButton 
                          onClick={handleRedo} 
                          disabled={historyIndex >= history.length - 1} 
                          icon={Redo2} 
                          label="Redo" 
                        />
                        <ToolbarButton 
                          onClick={() => setIsCompareMode(!isCompareMode)} 
                          icon={DiffIcon} 
                          label="Compare" 
                          className={isCompareMode ? "border-blue-500 bg-blue-50" : ""}
                        />
                      </div>
                    </div>

                    {analysis && (
                      <div className="px-8 py-4 border-b bg-zinc-50/30 flex items-center gap-8 overflow-hidden">
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-center">
                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">MATCH SCORE</p>
                            <div className="text-xl font-black text-black leading-none">{analysis.matchPercentage}%</div>
                          </div>
                          <div className="h-10 w-px bg-zinc-200 mx-2" />
                          <div className="text-center shrink-0">
                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">ESTIMATED</p>
                            <div className="text-xl font-black text-black leading-none uppercase">
                              {Math.ceil(estimatedPages)} {Math.ceil(estimatedPages) === 1 ? 'Page' : 'Pages'}
                            </div>
                          </div>
                          <div className="h-10 w-px bg-zinc-200 mx-2" />
                        </div>

                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-6">
                            {analysis.unsupportedKeywords.length > 0 && (
                              <div className="flex items-center gap-3 overflow-hidden">
                                <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest shrink-0 flex items-center gap-1.5">
                                  <AlertTriangle className="h-3 w-3" /> INSERT MISSING KEYWORDS:
                                </span>
                                <div className="flex gap-1.5 overflow-x-auto py-1 no-scrollbar">
                                  {analysis.unsupportedKeywords.map((kw, i) => (
                                    <Badge 
                                      key={i} 
                                      variant="outline" 
                                      className="h-6 text-[8px] font-black uppercase border-orange-200 text-orange-700 bg-white whitespace-nowrap cursor-pointer hover:bg-orange-50 transition-colors"
                                      onClick={() => {
                                          const result = injectKeywords(optimizedResumeText, [{ keyword: kw }], 'ADDED_UNSUPPORTED', analysis?.classification?.path);
                                          updateOptimizedText(result.updatedText);
                                      }}
                                    >
                                      <Plus className="h-2 w-2 mr-1" /> {kw}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={previewContainerRef} className="p-10 bg-zinc-100/50 flex-1 overflow-auto custom-scrollbar">
                      <div 
                        style={viewMode === 'print' ? { 
                          width: `${PAGE_WIDTH * 1.333333 * scale}px`,
                          height: `${Math.ceil(estimatedPages) * PAGE_HEIGHT * 1.333333 * scale}px`,
                          overflow: 'hidden',
                          margin: '0 auto',
                          position: 'relative'
                        } : {
                          width: '100%',
                          maxWidth: '800px',
                          margin: '0 auto'
                        }}
                      >
                        <div 
                          className="bg-white shadow-2xl relative text-black" 
                          style={viewMode === 'print' ? { 
                            padding: `${MARGIN_PTS}pt`, 
                            width: `${PAGE_WIDTH}pt`, 
                            minHeight: `${PAGE_HEIGHT}pt`,
                            height: `${Math.ceil(estimatedPages) * PAGE_HEIGHT}pt`,
                            fontFamily: `${FONT_FAMILY}, sans-serif`,
                            fontSize: `${BODY_FONT_SIZE}pt`,
                            lineHeight: `${PDF_LINE_STEP_BODY_MM}mm`,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                          } : {
                            padding: '3rem',
                            width: '100%',
                            minHeight: '8in',
                            fontSize: '10pt',
                            lineHeight: '1.6'
                          }}
                        >
                          {viewMode === 'print' && pageMarkers.map(pageNum => (
                            <div 
                              key={pageNum}
                              className="absolute left-0 right-0 border-t border-dashed border-zinc-300 pointer-events-none z-30 flex justify-end"
                              style={{ top: `${pageNum * PAGE_HEIGHT}pt` }}
                            >
                              <span className="bg-zinc-100 text-zinc-400 text-[8px] font-black uppercase px-2 py-0.5 -mt-2.5 mr-4 rounded-full">
                                Page {pageNum + 1}
                              </span>
                            </div>
                          ))}
                          {isCompareMode ? redlineDiff : isEditMode ? (
                            <Textarea 
                              className="w-full min-h-[800px] border-none focus-visible:ring-0 p-0 text-inherit leading-[inherit] font-[inherit] resize-none custom-scrollbar" 
                              value={optimizedResumeText} 
                              onChange={e => updateOptimizedText(e.target.value)} 
                            />
                          ) : renderTrackedResume(optimizedResumeText)}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="cover-letter" className="m-0 animate-in fade-in duration-300 flex flex-col">
                    <div className="px-8 py-6 border-b bg-zinc-50/50 sticky top-0 z-10 backdrop-blur-sm">
                      <h3 className="text-[10px] font-black uppercase text-black tracking-widest mb-6">TAILORED COVER LETTER</h3>
                      <div className="flex flex-wrap items-stretch gap-2">
                        <ToolbarButton 
                          onClick={onFinalPolishCL} 
                          disabled={isPolishingCL || !coverLetterText} 
                          icon={Sparkles} 
                          label="Key: Final AI Polish" 
                          className="border-[#FF0033]/40 bg-[#FF0033]/5"
                        />
                        <ToolbarButton 
                          onClick={() => setIsEditModeCL(!isEditModeCL)} 
                          icon={isEditModeCL ? Check : Edit3} 
                          label={isEditModeCL ? "Done Editing" : "Optional: Manual Edit"} 
                          className={isEditModeCL ? "border-[#FF0033] bg-[#FF0033]/5" : ""}
                        />
                        <ToolbarButton 
                          onClick={handleUndoCL} 
                          disabled={coverLetterHistoryIndex <= 0} 
                          icon={Undo2} 
                          label="Undo" 
                        />
                        <ToolbarButton 
                          onClick={handleRedoCL} 
                          disabled={coverLetterHistoryIndex >= coverLetterHistory.length - 1} 
                          icon={Redo2} 
                          label="Redo" 
                        />
                        <div className="flex-1" />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-12 w-12 rounded-xl" 
                          onClick={() => downloadCoverLetterAsDocx(coverLetterText, 'Candidate', jobTitleValue)}
                          title="Download Word Document"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-10 bg-zinc-100/50 flex-1 overflow-auto custom-scrollbar">
                      <div className="max-w-[800px] mx-auto min-h-[8in] bg-white shadow-2xl p-12 text-[10pt] text-black leading-relaxed font-body">
                        {isEditModeCL ? (
                          <Textarea 
                            className="w-full min-h-[600px] border-none focus-visible:ring-0 p-0 text-[10pt] leading-relaxed resize-none custom-scrollbar" 
                            value={coverLetterText} 
                            onChange={e => updateCoverLetterText(e.target.value)} 
                          />
                        ) : (
                          <div className="whitespace-pre-wrap">{coverLetterText}</div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>
        </div>

        <div className="mt-24 pt-8 border-t border-zinc-100 text-center">
          <p className="text-[10px] font-medium text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            Disclaimer: Resumait is a free application powered by the Gemini model that does not collect, store, or log any of your personal data. Your submissions are processed solely for your active session and are never retained or used to train our artificial intelligence models.
          </p>
        </div>
      </div>
      
      {mounted && (
        <CounselorChat 
          resumeText={optimizedResumeText || resumeValue} 
          jobDescription={jobDescValue} 
          analysisResults={analysis}
          onResumeUpdate={updateOptimizedText}
          chatAction={actions.counselorChat}
        />
      )}
    </div>
  );
}
