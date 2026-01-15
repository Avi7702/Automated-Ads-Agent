import { useState } from "react";
import { Globe, MoreHorizontal, ThumbsUp, MessageSquare, Repeat2, Send, ImageIcon, Type, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkedInPostPreviewProps {
  authorName: string;
  authorHeadline?: string;
  authorAvatar?: string;
  postText: string | null;        // null = show placeholder
  imageUrl?: string | null;       // null = show placeholder
  hashtags?: string[];
  onTextChange?: (text: string) => void;  // editable text callback
  isEditable?: boolean;           // allow inline editing
  onGenerateCopy?: () => void;    // callback to generate copy
  onGenerateImage?: () => void;   // callback to generate image
  isGeneratingCopy?: boolean;
  isGeneratingImage?: boolean;
}

/**
 * LinkedIn Post Preview Component
 * Renders a realistic simulation of how a post will appear on LinkedIn
 * Supports empty/placeholder states for progressive fill
 */
export function LinkedInPostPreview({
  authorName,
  authorHeadline = "Professional",
  authorAvatar,
  postText,
  imageUrl,
  hashtags = [],
  onTextChange,
  isEditable = false,
  onGenerateCopy,
  onGenerateImage,
  isGeneratingCopy = false,
  isGeneratingImage = false,
}: LinkedInPostPreviewProps) {
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState(postText || "");

  // Generate initials for avatar fallback
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Handle text display and truncation
  const hasText = postText && postText.trim().length > 0;
  const maxLength = 250;
  const shouldTruncate = hasText && postText.length > maxLength;
  const displayText = hasText
    ? shouldTruncate
      ? postText.slice(0, maxLength).trim() + "..."
      : postText
    : null;

  // Extract hashtags from text if not provided separately
  const displayHashtags = hashtags.length > 0
    ? hashtags
    : (hasText ? postText.match(/#\w+/g) || [] : []);

  const hasImage = imageUrl && imageUrl.trim().length > 0;
  const isComplete = hasText && hasImage;

  // Handle text editing
  const handleTextClick = () => {
    if (isEditable && hasText) {
      setIsEditingText(true);
      setEditedText(postText || "");
    }
  };

  const handleTextBlur = () => {
    setIsEditingText(false);
    if (onTextChange && editedText !== postText) {
      onTextChange(editedText);
    }
  };

  return (
    <div className="w-full max-w-[552px] mx-auto">
      {/* LinkedIn Post Card */}
      <div
        className={cn(
          "bg-white rounded-lg shadow-sm border overflow-hidden transition-all",
          isComplete ? "border-[#E0E0E0]" : "border-dashed border-[#0A66C2]/30"
        )}
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
      >
        {/* Post Header */}
        <div className="p-3 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex gap-2">
              {/* Avatar */}
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-semibold text-sm">
                  {initials}
                </div>
              )}

              {/* Author Info */}
              <div className="flex flex-col">
                <span className="text-[#000000E6] font-semibold text-sm hover:text-[#0A66C2] hover:underline cursor-pointer">
                  {authorName}
                </span>
                <span className="text-[#00000099] text-xs leading-tight">
                  {authorHeadline}
                </span>
                <div className="flex items-center gap-1 text-[#00000099] text-xs mt-0.5">
                  <span>1h</span>
                  <span>·</span>
                  <Globe className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* More Options */}
            <button className="p-2 hover:bg-[#00000014] rounded-full transition-colors">
              <MoreHorizontal className="w-5 h-5 text-[#00000099]" />
            </button>
          </div>
        </div>

        {/* Post Content - Text */}
        <div className="px-3 pb-3">
          {hasText ? (
            // Has text - show content (editable or not)
            isEditingText ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                onBlur={handleTextBlur}
                autoFocus
                className="w-full text-[#000000E6] text-sm leading-relaxed bg-[#F3F6F8] rounded p-2 border border-[#0A66C2] focus:outline-none resize-none"
                rows={4}
              />
            ) : (
              <p
                onClick={handleTextClick}
                className={cn(
                  "text-[#000000E6] text-sm whitespace-pre-wrap leading-relaxed",
                  isEditable && "cursor-text hover:bg-[#F3F6F8] rounded p-1 -m-1 transition-colors"
                )}
              >
                {displayText}
                {shouldTruncate && (
                  <button className="text-[#00000099] hover:text-[#0A66C2] hover:underline ml-1">
                    see more
                  </button>
                )}
              </p>
            )
          ) : (
            // No text - show placeholder
            <div
              className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-[#E0E0E0] rounded-lg bg-[#F9FAFB] cursor-pointer hover:border-[#0A66C2]/50 hover:bg-[#F3F6F8] transition-colors"
              onClick={onGenerateCopy}
            >
              <Type className="w-8 h-8 text-[#00000040] mb-2" />
              <span className="text-[#00000060] text-sm font-medium">Your ad copy will appear here</span>
              {onGenerateCopy && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateCopy();
                  }}
                  disabled={isGeneratingCopy}
                  data-testid="generate-copy-button-linkedin"
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0A66C2] hover:bg-[#0A66C2]/10 rounded transition-colors disabled:opacity-50"
                >
                  {isGeneratingCopy ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate Copy
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Hashtags */}
          {displayHashtags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {displayHashtags.slice(0, 5).map((tag, index) => (
                <span
                  key={index}
                  className="text-[#0A66C2] text-sm hover:underline cursor-pointer"
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Post Image */}
        {hasImage ? (
          <div className="w-full">
            <img
              src={imageUrl}
              alt="Post content"
              className="w-full object-cover"
              style={{ maxHeight: "500px" }}
            />
          </div>
        ) : (
          // No image - show placeholder
          <div
            className="mx-3 mb-3 flex flex-col items-center justify-center py-12 border-2 border-dashed border-[#E0E0E0] rounded-lg bg-[#F9FAFB] cursor-pointer hover:border-[#0A66C2]/50 hover:bg-[#F3F6F8] transition-colors"
            onClick={onGenerateImage}
          >
            <ImageIcon className="w-12 h-12 text-[#00000040] mb-2" />
            <span className="text-[#00000060] text-sm font-medium">Your image will appear here</span>
            {onGenerateImage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateImage();
                }}
                disabled={isGeneratingImage}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0A66C2] hover:bg-[#0A66C2]/10 rounded transition-colors disabled:opacity-50"
              >
                {isGeneratingImage ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Image
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Engagement Stats (simulated) */}
        <div className={cn(
          "px-3 py-2 flex items-center justify-between text-[#00000099] text-xs border-b border-[#E0E0E0]",
          !isComplete && "opacity-50"
        )}>
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 rounded-full bg-[#0A66C2] flex items-center justify-center">
                <ThumbsUp className="w-2.5 h-2.5 text-white" />
              </div>
              <div className="w-4 h-4 rounded-full bg-[#DF704D] flex items-center justify-center text-white text-[8px]">
                ❤️
              </div>
            </div>
            <span className="ml-1 hover:text-[#0A66C2] hover:underline cursor-pointer">
              {isComplete ? "42" : "—"}
            </span>
          </div>
          <div className="flex gap-3">
            <span className="hover:text-[#0A66C2] hover:underline cursor-pointer">
              {isComplete ? "5 comments" : "—"}
            </span>
            <span className="hover:text-[#0A66C2] hover:underline cursor-pointer">
              {isComplete ? "2 reposts" : "—"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={cn(
          "px-2 py-1 flex items-center justify-around",
          !isComplete && "opacity-50"
        )}>
          <ActionButton icon={<ThumbsUp className="w-5 h-5" />} label="Like" />
          <ActionButton icon={<MessageSquare className="w-5 h-5" />} label="Comment" />
          <ActionButton icon={<Repeat2 className="w-5 h-5" />} label="Repost" />
          <ActionButton icon={<Send className="w-5 h-5" />} label="Send" />
        </div>
      </div>

      {/* Status Notice */}
      <p className="text-center text-xs text-muted-foreground mt-3 opacity-60">
        {isComplete
          ? "Preview ready — copy to clipboard or download"
          : hasText && !hasImage
          ? "Generate an image to complete your post"
          : !hasText && hasImage
          ? "Generate copy to complete your post"
          : "Generate image and copy to preview your LinkedIn post"}
      </p>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-1.5 px-3 py-3 text-[#00000099] hover:bg-[#00000014] rounded transition-colors">
      {icon}
      <span className="text-xs font-medium hidden sm:inline">{label}</span>
    </button>
  );
}
