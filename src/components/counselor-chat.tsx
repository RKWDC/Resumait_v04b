"use client";

import { useState, createRef, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    Send, User, Bot, Loader2, RotateCcw, MessageCircle, X, Mic, MicOff, 
    Radio, Paperclip, HelpCircle, Sparkles, Target, 
    ShieldCheck, BarChart3, Edit3, MoveRight, Info, CheckCircle2,
    ChevronRight, ChevronLeft, ArrowRight
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { processFile } from "@/lib/file-processor";

type Message = {
    role: 'user' | 'model';
    content: any; 
};

interface CounselorChatProps {
    resumeText: string;
    jobDescription: string;
    analysisResults?: any;
    onResumeUpdate: (newResume: string) => void;
    chatAction: (input: any) => Promise<any>;
}

export function CounselorChat({ resumeText, jobDescription, analysisResults, onResumeUpdate, chatAction }: CounselorChatProps) {
    const { user, isUserLoading } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    
    const [stagedFile, setStagedFile] = useState<File | null>(null);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    const scrollAreaRef = createRef<HTMLDivElement>();
    const { toast } = useToast();
    
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    const suggestions = [
        "How can I improve my ATS score?",
        "Move Core Skills to Experience.",
        "Rewrite with more metrics."
    ];

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messages, scrollAreaRef]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'en-US';

                recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    if (isVoiceMode) {
                        handleVoiceSubmit(transcript);
                    } else {
                        setInput(transcript);
                    }
                };

                recognition.onend = () => setIsListening(false);
                recognition.onerror = () => setIsListening(false);
                recognitionRef.current = recognition;
            }
            synthRef.current = window.speechSynthesis;
        }
    }, [isVoiceMode]);

    useEffect(() => {
        return () => {
            if (synthRef.current) synthRef.current.cancel();
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, []);

    if (isUserLoading) return null;

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setIsListening(true);
            try {
                recognitionRef.current?.start();
            } catch (e) {
                setIsListening(false);
            }
        }
    };

    const speak = (text: string) => {
        if (!synthRef.current) return;
        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            if (isVoiceMode) setTimeout(() => toggleListening(), 500);
        };
        synthRef.current.speak(utterance);
    };

    const handleVoiceSubmit = async (transcript: string) => {
        if (!transcript.trim()) return;
        await processMessage(transcript);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !stagedFile) || isLoading || isProcessingFile) return;
        await processMessage(input);
        setInput('');
    };

    const processMessage = async (text: string) => {
        let aiInput = text;
        const displayPrompt = text || (stagedFile ? `Attached: ${stagedFile.name}` : "Document Analysis Request");

        if (stagedFile) {
            setIsProcessingFile(true);
            try {
                const extractionResult = await processFile(stagedFile);
                if (extractionResult.extractionStatus === 'success') {
                    aiInput = `[EXECUTIVE BRIEF: ATTACHED DOCUMENT ANALYSIS]\nFILE NAME: ${stagedFile.name}\nEXTRACTED CONTENT:\n${extractionResult.extractedText}\n\nUSER PROMPT: ${text || "Please analyze this document relative to my career goals."}`;
                } else {
                    toast({ variant: 'destructive', title: "Document Error", description: "Could not read document." });
                    setIsProcessingFile(false);
                    return;
                }
            } catch (err) {
                toast({ variant: 'destructive', title: "System Error", description: "File processing failed." });
                setIsProcessingFile(false);
                return;
            } finally {
                setIsProcessingFile(false);
            }
        }

        const newUserMessage: Message = { role: 'user', content: displayPrompt };
        setMessages(prev => [...prev, newUserMessage]);
        setIsLoading(true);
        setHasError(false);

        try {
            const response = await chatAction({
                resume: resumeText,
                jobDescription,
                analysisResults,
                history: [...messages, newUserMessage],
                userInput: aiInput,
            });

            if (!response.success || response.error) {
                setHasError(true);
                toast({ variant: 'destructive', title: "IDEAMAIT Offline", description: response.error || 'Connection interrupted.' });
            } else if (response.data) {
                const modelMessage: Message = { role: 'model', content: response.data.responseText };
                setMessages(prev => [...prev, modelMessage]);

                if (response.data.updatedResumeText) onResumeUpdate(response.data.updatedResumeText);
                if (isVoiceMode) speak(response.data.responseText);
                setStagedFile(null);
            }
        } catch (error: any) {
            setHasError(true);
            toast({ variant: 'destructive', title: "System Fault", description: error?.message });
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessageContent = (content: any) => {
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            const textPart = content.find(p => p.text);
            return textPart?.text || "Processing...";
        }
        return "Unsupported payload";
    };

    return (
        <div className="fixed bottom-0 right-0 z-[9999] pointer-events-none">
            <div className="relative pointer-events-auto p-6">
                <Button 
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "h-14 w-14 rounded-lg shadow-[0_0_25px_rgba(255,0,51,0.4)] transition-all duration-500 transform hover:scale-110 active:scale-95 border-2 border-[#FF0033]/30",
                        isOpen ? "bg-zinc-900 text-[#FF0033] rotate-90" : "bg-[#FF0033] text-white"
                    )}
                >
                    {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
                </Button>

                <div className={cn(
                    "absolute bottom-24 right-6 w-[90vw] sm:w-[420px] h-[650px] max-h-[80vh] transition-all duration-500 transform origin-bottom-right",
                    isOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-95 pointer-events-none"
                )}>
                    <Card className="h-full flex flex-col border-white/5 shadow-2xl bg-zinc-950/95 backdrop-blur-2xl overflow-hidden rounded-[2.5rem]">
                        <CardHeader className="bg-zinc-900/80 border-b border-white/5 py-5 px-8 flex flex-row items-center justify-between shrink-0">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-[#FF0033]">
                                <div className={cn(
                                    "h-2.5 w-2.5 rounded-full shadow-[0_0_10px_rgba(255,0,51,0.8)]",
                                    (isSpeaking || isLoading || isProcessingFile) ? "bg-green-400 animate-pulse" : "bg-[#FF0033]"
                                )} />
                                IDEAMAIT ANALYST
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                        setIsVoiceMode(!isVoiceMode);
                                        if (!isVoiceMode) setTimeout(() => toggleListening(), 300);
                                        else {
                                            synthRef.current?.cancel();
                                            recognitionRef.current?.stop();
                                            setIsListening(false);
                                            setIsSpeaking(false);
                                        }
                                    }}
                                    className={cn(
                                        "h-8 px-3 text-[9px] font-black uppercase tracking-widest border border-white/5 rounded-xl transition-all",
                                        isVoiceMode ? "bg-[#FF0033]/20 text-[#FF0033] border-[#FF0033]/30" : "text-zinc-500 hover:text-[#FF0033]"
                                    )}
                                >
                                    <Radio className={cn("h-3 w-3 mr-2", isVoiceMode && "animate-pulse")} />
                                    {isVoiceMode ? "VOICE ACTIVE" : "VOICE MODE"}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
                            <ScrollArea className="flex-1 w-full bg-transparent">
                                <div className="p-8 space-y-8">
                                    {messages.length === 0 && (
                                        <div className="flex flex-col items-center justify-center min-h-full py-10 space-y-12">
                                            <div className="text-center space-y-2">
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">IDEAMAIT ANALYST</p>
                                                <p className="text-[11px] font-black text-[#FF0033] uppercase tracking-[0.4em]">SECURE EXECUTIVE UPLINK ACTIVE</p>
                                            </div>

                                            <Button 
                                                className="h-14 px-8 bg-white text-zinc-400 hover:text-zinc-600 rounded-full font-black uppercase tracking-[0.15em] text-[10px] shadow-xl transition-all active:scale-95 group"
                                            >
                                                <Sparkles className="h-4 w-4 mr-3 text-zinc-300 group-hover:text-zinc-500" />
                                                Discover My Capabilities
                                            </Button>

                                            <div className="w-full max-w-[280px] space-y-3">
                                                {suggestions.map((suggestion, idx) => (
                                                    <button 
                                                        key={idx}
                                                        onClick={() => processMessage(suggestion)}
                                                        className={cn(
                                                            "w-full p-4 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-900 hover:border-[#FF0033]/30 transition-all text-left group flex items-center justify-between",
                                                            idx === 1 && "bg-[#FF0033]/5 border-[#FF0033]/10"
                                                        )}
                                                    >
                                                        <span className={cn(
                                                            "text-[11px] font-bold text-zinc-400 group-hover:text-zinc-100",
                                                            idx === 1 && "text-zinc-100"
                                                        )}>"{suggestion}"</span>
                                                        <ArrowRight className={cn(
                                                            "h-3 w-3 text-zinc-600 group-hover:text-[#FF0033] transition-colors",
                                                            idx === 1 && "text-[#FF0033]"
                                                        )} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {messages.map((message, index) => (
                                        <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                            {message.role === 'model' && (
                                                <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-[#FF0033]/10 text-[#FF0033] flex items-center justify-center border border-[#FF0033]/20">
                                                    <Bot className="h-5 w-5"/>
                                                </div>
                                            )}
                                            <div className={cn(
                                                "p-5 rounded-2xl max-w-[85%] text-[12px] font-bold leading-relaxed shadow-lg overflow-hidden break-words",
                                                message.role === 'user' 
                                                    ? "bg-[#FF0033] text-white rounded-tr-none" 
                                                    : "bg-zinc-900 text-zinc-100 border border-white/5 rounded-tl-none"
                                            )}>
                                                <p className="whitespace-pre-wrap">{renderMessageContent(message.content)}</p>
                                            </div>
                                            {message.role === 'user' && (
                                                <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center border border-white/5">
                                                    <User className="h-5 w-5"/>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {(isLoading || isProcessingFile) && (
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-[#FF0033]/10 text-[#FF0033] flex items-center justify-center border border-[#FF0033]/20">
                                                <Bot className="h-5 w-5"/>
                                            </div>
                                            <div className="p-5 rounded-2xl bg-zinc-900 border border-white/5 flex items-center shadow-lg rounded-tl-none">
                                                <Loader2 className="h-4 w-4 animate-spin text-[#FF0033]"/>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={scrollAreaRef} />
                                </div>
                            </ScrollArea>
                            
                            <div className="p-6 bg-zinc-900/50 border-t border-white/5 shrink-0">
                                {stagedFile && (
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="bg-[#FF0033]/10 border border-[#FF0033]/20 rounded-xl px-3 py-1.5 flex items-center gap-2 max-w-full">
                                            <Paperclip className="h-3 w-3 text-[#FF0033]" />
                                            <span className="text-[10px] font-black text-[#FF0033] uppercase tracking-widest truncate max-w-[200px]">{stagedFile.name}</span>
                                            <Button variant="ghost" size="icon" className="h-4 w-4 text-zinc-500 hover:text-white rounded-full p-0" onClick={() => setStagedFile(null)}>
                                                <X className="h-2.5 w-2.5" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <Button type="button" size="icon" onClick={() => fileInputRef.current?.click()} className="absolute left-1 top-1 h-10 w-10 rounded-xl bg-transparent text-zinc-500 hover:text-[#FF0033] z-10" disabled={isLoading || isProcessingFile}>
                                            <Paperclip className="h-5 w-5" />
                                        </Button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.doc,.txt" onChange={(e) => { const file = e.target.files?.[0]; if (file) setStagedFile(file); }} />
                                        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Consult IDEAMAIT..." className="h-12 pl-12 pr-12 rounded-2xl bg-zinc-950 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-[#FF0033]/50 focus-visible:border-[#FF0033]/50 transition-all text-[11px] font-bold" disabled={isLoading || isProcessingFile} />
                                        <Button type="button" size="icon" onClick={toggleListening} className={cn("absolute right-1 top-1 h-10 w-10 rounded-xl transition-all", isListening ? "bg-[#FF0033] text-white" : "bg-transparent text-zinc-500 hover:text-[#FF0033]")}>
                                            {isListening ? <Mic className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
                                        </Button>
                                    </div>
                                    <Button type="submit" size="icon" className="h-12 w-12 rounded-2xl bg-[#FF0033] hover:bg-[#FF0033]/80 text-white shadow-[0_0_15px_rgba(255,0,51,0.3)] transition-transform active:scale-95 shrink-0" disabled={isLoading || isProcessingFile || (!input.trim() && !stagedFile)}>
                                        {(isLoading || isProcessingFile) ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}