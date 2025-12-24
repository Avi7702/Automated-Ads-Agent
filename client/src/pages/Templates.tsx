import { useState } from "react";
import { TemplateLibrary } from "@/components/TemplateLibrary";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { AdSceneTemplate } from "@shared/schema";

export default function Templates() {
  const [selectedTemplate, setSelectedTemplate] = useState<AdSceneTemplate | null>(null);

  const handleSelectTemplate = (template: AdSceneTemplate) => {
    setSelectedTemplate(template);
    // You can integrate this with the generation flow
    // For example, navigate to home page with template data
    // or store in localStorage for use in generation
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans overflow-hidden relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/50 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              V3
            </div>
            <span className="font-display font-medium tracking-tight">Product Content Studio</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/" className="hover:text-foreground cursor-pointer transition-colors">
              Generate
            </Link>
            <Link href="/library" className="hover:text-foreground cursor-pointer transition-colors">
              Library
            </Link>
            <Link href="/prompts" className="hover:text-foreground cursor-pointer transition-colors">
              Prompts
            </Link>
            <span className="text-foreground">Templates</span>
            <Link href="/gallery" className="hover:text-foreground cursor-pointer transition-colors">
              Gallery
            </Link>
          </nav>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-6 pt-24 pb-20 relative z-10">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Generate
            </Button>
          </Link>
        </div>

        {/* Selected Template Preview (Optional) */}
        {selectedTemplate && (
          <div className="mb-6 p-6 rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Selected Template</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTemplate(null)}
              >
                Clear Selection
              </Button>
            </div>
            <div className="flex gap-4 items-start">
              <img
                src={selectedTemplate.previewImageUrl}
                alt={selectedTemplate.title}
                className="w-32 h-40 object-cover rounded-lg border border-white/10"
              />
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-2">{selectedTemplate.title}</h4>
                {selectedTemplate.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedTemplate.description}
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs px-2 py-1 rounded-md bg-primary/20 text-primary border border-primary/30">
                    {selectedTemplate.category}
                  </span>
                  {selectedTemplate.lightingStyle && (
                    <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-muted-foreground border border-white/10">
                      {selectedTemplate.lightingStyle} lighting
                    </span>
                  )}
                  {selectedTemplate.environment && (
                    <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-muted-foreground border border-white/10">
                      {selectedTemplate.environment}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Template Library Component */}
        <TemplateLibrary
          onSelectTemplate={handleSelectTemplate}
          selectedTemplateId={selectedTemplate?.id}
        />
      </main>
    </div>
  );
}
