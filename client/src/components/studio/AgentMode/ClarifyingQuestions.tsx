/**
 * ClarifyingQuestions — Renders 1-3 clarifying questions after a suggestion is selected.
 *
 * Question types:
 *  - 'select'      -> radio buttons
 *  - 'text'        -> textarea
 *  - 'multiselect' -> checkboxes
 *
 * Back button -> return to suggestions.
 * Continue button -> disabled until all required questions are answered.
 */

import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ClarifyingQuestion } from '@shared/types/agentPlan';

interface ClarifyingQuestionsProps {
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, answer: string) => void;
  onBack: () => void;
  onContinue: () => void;
  isLoading: boolean;
  suggestionTitle?: string | undefined;
}

function SelectQuestion({
  question,
  value,
  onChange,
}: {
  question: ClarifyingQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <RadioGroup value={value} onValueChange={onChange}>
      {(question.options ?? []).map((opt) => (
        <div key={opt} className="flex items-center gap-2">
          <RadioGroupItem value={opt} id={`${question.id}-${opt}`} />
          <Label htmlFor={`${question.id}-${opt}`} className="text-sm cursor-pointer">
            {opt}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

function MultiselectQuestion({
  question,
  value,
  onChange,
}: {
  question: ClarifyingQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  // Store multiselect as comma-separated string
  const selected = value ? value.split(',').filter(Boolean) : [];

  function toggle(opt: string) {
    const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
    onChange(next.join(','));
  }

  return (
    <div className="space-y-2">
      {(question.options ?? []).map((opt) => (
        <div key={opt} className="flex items-center gap-2">
          <Checkbox id={`${question.id}-${opt}`} checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
          <Label htmlFor={`${question.id}-${opt}`} className="text-sm cursor-pointer">
            {opt}
          </Label>
        </div>
      ))}
    </div>
  );
}

function TextQuestion({
  value,
  onChange,
}: {
  question: ClarifyingQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Textarea placeholder="Type your answer..." value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
  );
}

export function ClarifyingQuestions({
  questions,
  answers,
  onAnswer,
  onBack,
  onContinue,
  isLoading,
  suggestionTitle,
}: ClarifyingQuestionsProps) {
  const allRequiredAnswered = questions
    .filter((q) => q.required)
    .every((q) => {
      const val = answers[q.id];
      return val !== undefined && val.trim() !== '';
    });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={isLoading}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Step 2 of 4 &mdash; A few quick questions</p>
          {suggestionTitle && <p className="text-sm font-medium truncate">{suggestionTitle}</p>}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <Card key={q.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {q.question}
                    {q.required && <span className="text-red-500 ml-0.5">*</span>}
                  </p>
                </div>
              </div>

              <div className="pl-7">
                {q.type === 'select' && (
                  <SelectQuestion question={q} value={answers[q.id] ?? ''} onChange={(v) => onAnswer(q.id, v)} />
                )}
                {q.type === 'multiselect' && (
                  <MultiselectQuestion question={q} value={answers[q.id] ?? ''} onChange={(v) => onAnswer(q.id, v)} />
                )}
                {q.type === 'text' && (
                  <TextQuestion question={q} value={answers[q.id] ?? ''} onChange={(v) => onAnswer(q.id, v)} />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onContinue} disabled={!allRequiredAnswered || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Generating plan...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </motion.div>
  );
}
