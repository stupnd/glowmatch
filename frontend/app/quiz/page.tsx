"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { QuestionStep } from "@/components/quiz/QuestionStep";
import { RoutineResults } from "@/components/quiz/RoutineResults";
import {
  ApiError,
  fetchQuizQuestions,
  submitQuiz,
  type QuizAnswers,
  type QuizQuestion,
  type QuizResponse,
} from "@/lib/api";

type Phase = "loading" | "questions" | "submitting" | "results" | "error";

const BUDGETS = [
  { value: "all", label: "Any price" },
  { value: "drugstore", label: "Under $20" },
  { value: "mid", label: "$20–60" },
  { value: "high", label: "Premium" },
];

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [budget, setBudget] = useState("all");
  const [result, setResult] = useState<QuizResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Focus target for each new question. Without this, advancing a step leaves
  // screen-reader focus stranded on the button that just disappeared.
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchQuizQuestions()
      .then(({ questions }) => {
        if (cancelled) return;
        setQuestions(questions);
        setPhase("questions");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrors(
          error instanceof ApiError
            ? error.reasons
            : ["Couldn't load the quiz. Please refresh."],
        );
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase === "questions") headingRef.current?.focus();
  }, [index, phase]);

  const question = questions[index];
  const selected = question
    ? ((): string[] => {
        const value = answers[question.id];
        if (Array.isArray(value)) return value;
        return typeof value === "string" ? [value] : [];
      })()
    : [];

  const submit = useCallback(
    async (finalAnswers: QuizAnswers) => {
      setPhase("submitting");
      try {
        setResult(await submitQuiz(finalAnswers, budget));
        setPhase("results");
      } catch (error: unknown) {
        setErrors(
          error instanceof ApiError
            ? error.reasons
            : ["Something went wrong. Please try again."],
        );
        setPhase("error");
      }
    },
    [budget],
  );

  const advance = useCallback(
    (next: QuizAnswers) => {
      if (index < questions.length - 1) setIndex(index + 1);
      else void submit(next);
    },
    [index, questions.length, submit],
  );

  const handleSelect = (value: string) => {
    if (!question) return;

    if (question.multi) {
      // Toggle within the current selection; never auto-advance, since there's
      // no way to know the user has finished picking.
      const current = Array.isArray(answers[question.id])
        ? (answers[question.id] as string[])
        : [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setAnswers({ ...answers, [question.id]: next });
      return;
    }

    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    advance(next);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <div className="h-2 w-40 animate-pulse rounded-pill bg-raised" />
        <div className="mt-6 h-8 w-3/4 animate-pulse rounded-pill bg-raised" />
        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <h1 className="font-display text-title text-text">
          That didn&apos;t work
        </h1>
        <ul className="mt-4 space-y-2" role="alert">
          {errors.map((message) => (
            <li key={message} className="text-text-soft">
              {message}
            </li>
          ))}
        </ul>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="animate-pulse-dot h-2 w-2 rounded-full bg-accent"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
        <p className="mt-6 font-display text-heading text-text" role="status">
          Building your routine
        </p>
        <p className="mt-2 text-small text-text-muted">
          Matching {Object.keys(answers).length} answers against product tags.
        </p>
      </div>
    );
  }

  if (phase === "results" && result) {
    return (
      <RoutineResults
        data={result}
        onRestart={() => {
          setAnswers({});
          setIndex(0);
          setResult(null);
          setPhase("questions");
        }}
      />
    );
  }

  if (!question) return null;

  const isLast = index === questions.length - 1;
  const canContinue = !question.multi || selected.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      <ProgressBar current={index + 1} total={questions.length} className="mb-8" />

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
        >
          {/* tabIndex -1 makes this programmatically focusable so each new
              question is announced. */}
          <div ref={headingRef} tabIndex={-1} className="outline-none">
            <QuestionStep
              question={question}
              selected={selected}
              onSelect={handleSelect}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
        >
          Back
        </Button>

        {/* Single-select advances on tap, so a continue button would be dead
            weight — it only appears where it does something. */}
        {question.multi && (
          <Button onClick={() => advance(answers)} disabled={!canContinue}>
            {isLast ? "See my routine" : "Continue"}
          </Button>
        )}

        {!question.multi && (
          <p className="text-small text-text-muted">Pick one to continue</p>
        )}
      </div>

      {isLast && (
        <fieldset className="mt-10 border-t border-line pt-6">
          <legend className="text-label uppercase text-text-muted">
            Budget
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {BUDGETS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={budget === option.value}
                onClick={() => setBudget(option.value)}
                className={
                  "min-h-11 rounded-pill border px-4 text-small transition-colors " +
                  (budget === option.value
                    ? "border-accent bg-accent-dim text-accent-bright"
                    : "border-line text-text-soft hover:border-line-strong hover:text-text")
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
