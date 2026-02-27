/**
 * CanvasEditor — AI-native image editor
 *
 * 2026 approach: SAM2 click-to-segment + Gemini AI editing.
 * No pixel-pushing canvas libraries — AI does the heavy lifting.
 *
 * Tools:
 * - Select (SAM2): Click an object → generates mask → describe edit
 * - Brush: Manual mask painting for fine control
 * - Crop: Simple drag-to-crop
 * - Eraser: Click object + "remove this" shortcut
 *
 * Flow: Select region → type instruction → Gemini edits → accept/reject
 */

import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  MousePointer2,
  Paintbrush,
  Crop,
  Eraser,
  Wand2,
  Undo2,
  X,
  Loader2,
  Check,
  RotateCcw,
  Minus,
  Plus,
} from 'lucide-react';
import { initSAM2, encodeImage, predictMask, getSAM2Status, type ClickPoint, type SAM2Result } from '@/lib/sam2';

type Tool = 'select' | 'brush' | 'crop' | 'eraser';

interface CanvasEditorProps {
  /** URL of the image to edit */
  imageUrl: string;
  /** Generation ID for conversation history continuation */
  generationId?: string | undefined;
  /** Callback when edit is complete */
  onEditComplete: (newImageUrl: string) => void;
  /** Callback to close the editor */
  onClose: () => void;
}

export const CanvasEditor = memo(function CanvasEditor({
  imageUrl,
  onEditComplete,
  onClose,
}: CanvasEditorProps) {
  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [editInstruction, setEditInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // SAM2 state
  const [sam2Status, setSam2Status] = useState<string>('idle');
  const [clickPoints, setClickPoints] = useState<ClickPoint[]>([]);
  const [currentMask, setCurrentMask] = useState<SAM2Result | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);

  // Brush state
  const [brushSize, setBrushSize] = useState(20);
  const isBrushing = useRef(false);

  // Canvas refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const brushCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Image dimensions
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  // Edit history
  const [history, setHistory] = useState<string[]>([]);

  // ── Load image ────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });

      // Draw on image canvas
      const canvas = imageCanvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
      }

      // Size mask + brush canvases
      [maskCanvasRef, brushCanvasRef].forEach((ref) => {
        if (ref.current) {
          ref.current.width = img.naturalWidth;
          ref.current.height = img.naturalHeight;
        }
      });

      setHistory([imageUrl]);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // ── Initialize SAM2 ──────────────────────────────
  useEffect(() => {
    setSam2Status('loading');
    initSAM2((stage) => {
      setSam2Status(stage);
    })
      .then(() => setSam2Status('ready'))
      .catch((err: unknown) => setSam2Status(`error: ${err instanceof Error ? err.message : String(err)}`));
  }, []);

  // ── Encode image when SAM2 is ready ──────────────
  useEffect(() => {
    if (sam2Status === 'ready' && imageRef.current && !isEncoding) {
      setIsEncoding(true);
      encodeImage(imageRef.current)
        .then(() => {
          setIsEncoding(false);
          setSam2Status('encoded');
        })
        .catch(() => setIsEncoding(false));
    }
  }, [sam2Status, isEncoding]);

  // ── Canvas click handler ─────────────────────────
  const handleCanvasClick = useCallback(
    async (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = maskCanvasRef.current;
      if (!canvas || imgSize.w === 0) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = imgSize.w / rect.width;
      const scaleY = imgSize.h / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (activeTool === 'select' || activeTool === 'eraser') {
        if (!getSAM2Status().hasEmbeddings) return;

        const label = e.shiftKey ? 0 : 1; // Shift+click = negative point
        const newPoints: ClickPoint[] = [...clickPoints, { x, y, label }];
        setClickPoints(newPoints);

        try {
          const result = await predictMask(newPoints, imgSize.w, imgSize.h);
          setCurrentMask(result);

          // Draw mask overlay
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, imgSize.w, imgSize.h);
            ctx.putImageData(result.maskImageData, 0, 0);

            // Draw click points
            for (const pt of newPoints) {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
              ctx.fillStyle = pt.label === 1 ? '#22c55e' : '#ef4444';
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }

          // Auto-fill eraser instruction
          if (activeTool === 'eraser') {
            setEditInstruction('Remove this object and fill the area naturally');
          }
        } catch (err) {
          console.error('SAM2 prediction failed:', err);
        }
      }
    },
    [activeTool, clickPoints, imgSize],
  );

  // ── Brush handlers ───────────────────────────────
  const handleBrushMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isBrushing.current || activeTool !== 'brush') return;
      const canvas = brushCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = imgSize.w / rect.width;
      const scaleY = imgSize.h / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.beginPath();
        ctx.arc(x, y, brushSize * scaleX, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [activeTool, brushSize, imgSize],
  );

  const handleBrushStart = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (activeTool !== 'brush') return;
      isBrushing.current = true;
      handleBrushMove(e);
    },
    [activeTool, handleBrushMove],
  );

  const handleBrushEnd = useCallback(() => {
    isBrushing.current = false;
  }, []);

  // ── Clear mask ───────────────────────────────────
  const clearMask = useCallback(() => {
    setClickPoints([]);
    setCurrentMask(null);
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    maskCtx?.clearRect(0, 0, imgSize.w, imgSize.h);
    const brushCtx = brushCanvasRef.current?.getContext('2d');
    brushCtx?.clearRect(0, 0, imgSize.w, imgSize.h);
    setEditInstruction('');
  }, [imgSize]);

  // ── Apply edit via Gemini ────────────────────────
  const applyEdit = useCallback(async () => {
    if (!editInstruction.trim()) return;
    setIsEditing(true);

    try {
      // Get CSRF token
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();

      // Build the edit request
      // We send the mask as a visual overlay on the image so Gemini can see the region
      const formData = new FormData();

      // Get current canvas state as image
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = imgSize.w;
      compositeCanvas.height = imgSize.h;
      const compositeCtx = compositeCanvas.getContext('2d');
      if (!compositeCtx) return;

      // Draw original image
      if (imageRef.current) {
        compositeCtx.drawImage(imageRef.current, 0, 0);
      }

      // If there's a mask, overlay it with a visible highlight
      if (currentMask || brushCanvasRef.current) {
        compositeCtx.globalAlpha = 0.5;
        if (maskCanvasRef.current) {
          compositeCtx.drawImage(maskCanvasRef.current, 0, 0);
        }
        if (brushCanvasRef.current) {
          compositeCtx.drawImage(brushCanvasRef.current, 0, 0);
        }
        compositeCtx.globalAlpha = 1.0;
      }

      // Convert composite to blob and append
      const blob = await new Promise<Blob>((resolve) => {
        compositeCanvas.toBlob((b) => resolve(b!), 'image/png');
      });
      formData.append('images', new File([blob], 'edit-source.png', { type: 'image/png' }));

      // Build prompt with mask context
      let prompt = editInstruction;
      if (currentMask || brushCanvasRef.current) {
        prompt = `The blue highlighted region in this image marks the area to edit. ${editInstruction}. Keep all non-highlighted areas exactly the same.`;
      }
      formData.append('prompt', prompt);
      formData.append('resolution', '2K');

      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Edit failed');
      }

      const data = await response.json();
      const newImageUrl = data.imageUrl;

      // Load the new image into the editor
      const newImg = new Image();
      newImg.crossOrigin = 'anonymous';
      newImg.onload = () => {
        imageRef.current = newImg;
        const canvas = imageCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(newImg, 0, 0);
        }
        clearMask();
        setHistory((prev) => [...prev, newImageUrl]);

        // Re-encode for SAM2
        encodeImage(newImg).catch(() => {});
      };
      newImg.src = newImageUrl;
    } catch (err: unknown) {
      console.error('Edit failed:', err);
    } finally {
      setIsEditing(false);
    }
  }, [editInstruction, currentMask, imgSize, clearMask]);

  // ── Undo ─────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (history.length <= 1) return;
    const prev = history[history.length - 2];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      const canvas = imageCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
      }
      clearMask();
      encodeImage(img).catch(() => {});
    };
    img.src = prev;
  }, [history, clearMask]);

  // ── Accept & close ───────────────────────────────
  const handleAccept = useCallback(() => {
    const latest = history.at(-1);
    if (latest) onEditComplete(latest);
  }, [history, onEditComplete]);

  // ── Tool definitions ─────────────────────────────
  const tools = [
    { id: 'select' as Tool, icon: MousePointer2, label: 'Select (SAM2)', shortcut: 'V' },
    { id: 'brush' as Tool, icon: Paintbrush, label: 'Brush mask', shortcut: 'B' },
    { id: 'eraser' as Tool, icon: Eraser, label: 'Erase object', shortcut: 'E' },
    { id: 'crop' as Tool, icon: Crop, label: 'Crop', shortcut: 'C' },
  ];

  const sam2Ready = sam2Status === 'encoded';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          <span className="font-semibold">AI Canvas Editor</span>
          {!sam2Ready && (
            <Badge variant="outline" className="text-xs">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {sam2Status}
            </Badge>
          )}
          {sam2Ready && (
            <Badge variant="outline" className="text-xs text-green-600">
              SAM2 Ready
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={history.length <= 1}>
            <Undo2 className="w-4 h-4 mr-1" />
            Undo
          </Button>
          <Button size="sm" onClick={handleAccept} disabled={history.length <= 1}>
            <Check className="w-4 h-4 mr-1" />
            Accept
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left tool panel */}
        <div className="w-14 border-r bg-muted/20 flex flex-col items-center py-3 gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                if (tool.id !== 'select' && tool.id !== 'eraser') clearMask();
              }}
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                activeTool === tool.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground',
              )}
              title={`${tool.label} (${tool.shortcut})`}
              aria-label={tool.label}
            >
              <tool.icon className="w-5 h-5" />
            </button>
          ))}

          {/* Brush size control */}
          {activeTool === 'brush' && (
            <div className="mt-2 flex flex-col items-center gap-1">
              <button
                onClick={() => setBrushSize((s) => Math.min(100, s + 5))}
                className="w-8 h-8 rounded flex items-center justify-center hover:bg-muted"
              >
                <Plus className="w-3 h-3" />
              </button>
              <span className="text-[10px] text-muted-foreground">{brushSize}</span>
              <button
                onClick={() => setBrushSize((s) => Math.max(5, s - 5))}
                className="w-8 h-8 rounded flex items-center justify-center hover:bg-muted"
              >
                <Minus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-auto bg-neutral-900 flex items-center justify-center"
        >
          <div className="relative" style={{ maxWidth: '90%', maxHeight: '90%' }}>
            {/* Image layer */}
            <canvas
              ref={imageCanvasRef}
              className="max-w-full max-h-[70vh] object-contain"
              style={{ display: 'block' }}
            />

            {/* SAM2 mask overlay layer */}
            <canvas
              ref={maskCanvasRef}
              className="absolute inset-0 max-w-full max-h-[70vh]"
              style={{ pointerEvents: activeTool === 'select' || activeTool === 'eraser' ? 'auto' : 'none' }}
              onClick={handleCanvasClick}
            />

            {/* Brush overlay layer */}
            <canvas
              ref={brushCanvasRef}
              className="absolute inset-0 max-w-full max-h-[70vh]"
              style={{
                pointerEvents: activeTool === 'brush' ? 'auto' : 'none',
                cursor: activeTool === 'brush' ? 'crosshair' : 'default',
              }}
              onMouseDown={handleBrushStart}
              onMouseMove={handleBrushMove}
              onMouseUp={handleBrushEnd}
              onMouseLeave={handleBrushEnd}
            />
          </div>
        </div>

        {/* Right panel — edit instructions */}
        <div className="w-72 border-l bg-muted/10 flex flex-col">
          <div className="p-3 border-b">
            <h3 className="text-sm font-medium mb-1">Edit Instruction</h3>
            <p className="text-xs text-muted-foreground mb-2">
              {activeTool === 'select' && 'Click an object to select it, then describe what to change.'}
              {activeTool === 'brush' && 'Paint over the area to edit, then describe the change.'}
              {activeTool === 'eraser' && 'Click the object to remove. It will be filled naturally.'}
              {activeTool === 'crop' && 'Drag to select crop region.'}
            </p>
            {activeTool === 'select' && (
              <p className="text-xs text-muted-foreground italic">Shift+click to exclude regions</p>
            )}
          </div>

          <div className="p-3 flex-1 flex flex-col gap-3">
            <Textarea
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              placeholder={
                activeTool === 'eraser'
                  ? 'Remove this object and fill naturally'
                  : "Describe the edit... e.g., 'Change the background to sunset'"
              }
              className="flex-1 min-h-[120px] text-sm resize-none"
              disabled={isEditing}
            />

            <Button onClick={applyEdit} disabled={!editInstruction.trim() || isEditing} className="w-full">
              {isEditing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Applying edit...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-1.5" />
                  Apply Edit
                </>
              )}
            </Button>

            {(currentMask || clickPoints.length > 0) && (
              <Button variant="outline" size="sm" onClick={clearMask}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Clear selection
              </Button>
            )}
          </div>

          {/* Edit history thumbnails */}
          {history.length > 1 && (
            <div className="p-3 border-t">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Edit History ({history.length - 1} edits)
              </h4>
              <div className="flex gap-1 overflow-x-auto">
                {history.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Edit ${i}`}
                    className={cn(
                      'w-12 h-12 rounded border object-cover flex-shrink-0',
                      i === history.length - 1 && 'ring-2 ring-primary',
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
