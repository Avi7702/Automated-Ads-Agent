/**
 * PlanBriefCard — Displays a plan brief preview with approval score gauge,
 * content mix chart, score breakdown, cost estimate, and post list.
 *
 * Actions: Approve & Run, Edit (revise), Cancel.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Edit3, XCircle, Clock, DollarSign, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import type { PlanBrief, PlanPost } from '@shared/types/agentPlan';

interface PlanBriefCardProps {
  plan: PlanBrief;
  onApprove: () => void;
  onRevise: (feedback: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

// -- Approval Score Gauge
function ScoreGauge({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 80
      ? 'text-emerald-500 stroke-emerald-500'
      : score >= 60
        ? 'text-amber-500 stroke-amber-500'
        : 'text-red-500 stroke-red-500';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        {/* Background circle */}
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-muted" />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={color}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-2xl font-bold tabular-nums', color.split(' ')[0])}>{score}</span>
        <span className="text-[10px] text-muted-foreground">score</span>
      </div>
    </div>
  );
}

// -- Content Mix Bar
const MIX_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];

function ContentMixBar({ mix }: { mix: { type: string; count: number }[] }) {
  const total = mix.reduce((s, m) => s + m.count, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex h-3 rounded-full overflow-hidden">
        {mix.map((m, i) => (
          <div
            key={m.type}
            className={cn(MIX_COLORS[i % MIX_COLORS.length], 'transition-all')}
            style={{ width: `${(m.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {mix.map((m, i) => (
          <div key={m.type} className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className={cn('h-2 w-2 rounded-full', MIX_COLORS[i % MIX_COLORS.length])} />
            {m.type} ({m.count})
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Score Breakdown
function ScoreBreakdown({ breakdown }: { breakdown: { criterion: string; score: number; max: number }[] }) {
  return (
    <div className="space-y-1.5">
      {breakdown.map((b) => (
        <div key={b.criterion} className="flex items-center gap-2 text-xs">
          <span className="flex-1 text-muted-foreground truncate">{b.criterion}</span>
          <div className="h-1.5 w-20 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${b.max > 0 ? (b.score / b.max) * 100 : 0}%` }}
            />
          </div>
          <span className="tabular-nums text-muted-foreground w-10 text-right">
            {b.score}/{b.max}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Post List
function PostList({ posts }: { posts: PlanPost[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? posts : posts.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {posts.length} post{posts.length !== 1 ? 's' : ''} planned
        </span>
        {posts.length > 3 && (
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setExpanded(!expanded)}>
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show all ({posts.length})
              </>
            )}
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        {visible.map((post) => (
          <div key={post.index} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary shrink-0">
              {post.index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{post.hookAngle}</p>
              <p className="text-muted-foreground truncate">{post.prompt}</p>
              <div className="flex gap-1.5 mt-1">
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  {post.contentType}
                </Badge>
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  {post.platform}
                </Badge>
                {post.scheduledDate && <span className="text-muted-foreground text-[10px]">{post.scheduledDate}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Main Component
export function PlanBriefCard({ plan, onApprove, onRevise, onCancel, isLoading }: PlanBriefCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState('');

  function handleRevise() {
    if (!feedback.trim()) return;
    onRevise(feedback.trim());
    setFeedback('');
    setIsEditing(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Step 3 of 4 &mdash; Review plan</p>
              <CardTitle className="text-base mt-1">{plan.objective}</CardTitle>
            </div>
            <ScoreGauge score={plan.approvalScore} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {plan.cadence}
            </Badge>
            <Badge variant="secondary">{plan.platform}</Badge>
            <Badge variant="secondary" className="gap-1">
              <DollarSign className="h-3 w-3" />
              {plan.estimatedCost.credits} {plan.estimatedCost.currency}
            </Badge>
          </div>

          {/* Content mix */}
          {plan.contentMix.length > 0 && <ContentMixBar mix={plan.contentMix} />}

          {/* Score breakdown */}
          {plan.scoreBreakdown.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Score breakdown</p>
              <ScoreBreakdown breakdown={plan.scoreBreakdown} />
            </div>
          )}

          {/* Posts */}
          {plan.posts.length > 0 && <PostList posts={plan.posts} />}

          {/* Edit feedback area */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Textarea
                placeholder="What would you like to change?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRevise} disabled={!feedback.trim() || isLoading}>
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Submit revision'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          {!isEditing && (
            <div className="flex gap-2 pt-1">
              <Button onClick={onApprove} disabled={isLoading} className="gap-1.5">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Approve & Run
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(true)} disabled={isLoading} className="gap-1.5">
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="ghost" onClick={onCancel} disabled={isLoading} className="gap-1.5">
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
