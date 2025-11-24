import { motion, AnimatePresence } from "framer-motion";
import { Tag, MapPin, Palette, Layers, Monitor, Zap } from "lucide-react";

interface IntentVisualizerProps {
  prompt: string;
}

// Simple heuristic "AI" logic
const getIntent = (text: string) => {
  const t = text.toLowerCase();
  const intents = [];

  if (t.match(/premium|lifestyle|aspirational|amazing/)) intents.push({ label: "Lifestyle Transformation", icon: SparklesIcon, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" });
  if (t.match(/forest|nature|outdoor|garden|park/)) intents.push({ label: "Outdoor Setting", icon: MapPin, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" });
  if (t.match(/city|urban|street|night|neon/)) intents.push({ label: "Urban Environment", icon: MapPin, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" });
  if (t.match(/minimal|clean|studio|white/)) intents.push({ label: "Studio Shot", icon: Layers, color: "bg-slate-500/10 text-slate-400 border-slate-500/20" });
  if (t.match(/instagram|social|post/)) intents.push({ label: "Social Optimized", icon: Monitor, color: "bg-pink-500/10 text-pink-400 border-pink-500/20" });
  
  return intents;
};

function SparklesIcon(props: any) {
  return <Zap {...props} />;
}

export function IntentVisualizer({ prompt }: IntentVisualizerProps) {
  const intents = getIntent(prompt);

  return (
    <div className="flex flex-wrap gap-2 mt-4 min-h-[40px]">
      <AnimatePresence>
        {intents.map((intent) => (
          <motion.div
            key={intent.label}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${intent.color}`}
          >
            <intent.icon className="w-3.5 h-3.5" />
            {intent.label}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {prompt.length > 5 && intents.length === 0 && (
         <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground py-2 italic"
         >
           Detecting scene and style...
         </motion.div>
      )}
    </div>
  );
}
