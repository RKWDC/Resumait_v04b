import { Header } from "@/components/header";
import ResumeOptimizerPage from "@/components/resume-optimizer-page";
import { optimize, getResumeScore, getInitialAnalysis, runNewKeywordExtraction, counselorChat, runSpellCheck, runGenerateCoverLetter, runSmartCompression, runOnePageDistillation, runPolishCoverLetter } from "@/app/actions";

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <ResumeOptimizerPage 
          actions={{
            optimize,
            getResumeScore,
            getInitialAnalysis,
            runNewKeywordExtraction,
            counselorChat,
            runSpellCheck,
            runGenerateCoverLetter,
            runSmartCompression,
            runOnePageDistillation,
            runPolishCoverLetter
          }}
        />
      </main>
    </div>
  );
}
