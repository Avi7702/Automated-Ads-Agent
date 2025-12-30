import { Globe, MoreHorizontal, ThumbsUp, MessageSquare, Repeat2, Send } from "lucide-react";

interface LinkedInPostPreviewProps {
  authorName: string;
  authorHeadline?: string;
  authorAvatar?: string;
  postText: string;
  imageUrl?: string;
  hashtags?: string[];
}

/**
 * LinkedIn Post Preview Component
 * Renders a realistic simulation of how a post will appear on LinkedIn
 */
export function LinkedInPostPreview({
  authorName,
  authorHeadline = "Professional",
  authorAvatar,
  postText,
  imageUrl,
  hashtags = [],
}: LinkedInPostPreviewProps) {
  // Generate initials for avatar fallback
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Truncate text for preview (LinkedIn shows ~3 lines before "...see more")
  const maxLength = 250;
  const shouldTruncate = postText.length > maxLength;
  const displayText = shouldTruncate
    ? postText.slice(0, maxLength).trim() + "..."
    : postText;

  // Extract hashtags from text if not provided separately
  const displayHashtags = hashtags.length > 0
    ? hashtags
    : postText.match(/#\w+/g) || [];

  return (
    <div className="w-full max-w-[552px] mx-auto">
      {/* LinkedIn Post Card */}
      <div
        className="bg-white rounded-lg shadow-sm border border-[#E0E0E0] overflow-hidden"
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

        {/* Post Content */}
        <div className="px-3 pb-3">
          <p className="text-[#000000E6] text-sm whitespace-pre-wrap leading-relaxed">
            {displayText}
            {shouldTruncate && (
              <button className="text-[#00000099] hover:text-[#0A66C2] hover:underline ml-1">
                see more
              </button>
            )}
          </p>

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
        {imageUrl && (
          <div className="w-full">
            <img
              src={imageUrl}
              alt="Post content"
              className="w-full object-cover"
              style={{ maxHeight: "500px" }}
            />
          </div>
        )}

        {/* Engagement Stats (simulated) */}
        <div className="px-3 py-2 flex items-center justify-between text-[#00000099] text-xs border-b border-[#E0E0E0]">
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
              42
            </span>
          </div>
          <div className="flex gap-3">
            <span className="hover:text-[#0A66C2] hover:underline cursor-pointer">
              5 comments
            </span>
            <span className="hover:text-[#0A66C2] hover:underline cursor-pointer">
              2 reposts
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-2 py-1 flex items-center justify-around">
          <ActionButton icon={<ThumbsUp className="w-5 h-5" />} label="Like" />
          <ActionButton icon={<MessageSquare className="w-5 h-5" />} label="Comment" />
          <ActionButton icon={<Repeat2 className="w-5 h-5" />} label="Repost" />
          <ActionButton icon={<Send className="w-5 h-5" />} label="Send" />
        </div>
      </div>

      {/* Simulation Notice */}
      <p className="text-center text-xs text-muted-foreground mt-3 opacity-60">
        This is a preview simulation
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
