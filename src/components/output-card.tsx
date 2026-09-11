"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download } from "lucide-react";

interface OutputCardProps {
  title: string;
  content: string;
  fileName: string;
}

export function OutputCard({ title, content, fileName }: OutputCardProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
      .then(() => {
        toast({ title: "Copied to clipboard!" });
      })
      .catch(err => {
        toast({ variant: "destructive", title: "Failed to copy", description: "Could not copy text to clipboard." });
        console.error('Failed to copy text: ', err);
      });
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
        toast({ variant: "destructive", title: "Download failed", description: "Could not download the file." });
        console.error('Failed to download file: ', error);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy content">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDownload} aria-label="Download content as text file">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        <ScrollArea className="h-96 w-full rounded-md border flex-1">
          <div className="p-4">
            <pre className="whitespace-pre-wrap text-sm font-code">{content}</pre>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
