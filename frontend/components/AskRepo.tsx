"use client";

import { useRef, useState, type FormEvent } from "react";
import { MessageCircleQuestion, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { askRepo } from "@/lib/api";

interface Turn {
  id: number;
  role: "user" | "memory";
  text: string;
  /** no_answer/error replies render muted, never as confident answers. */
  grounded: boolean;
}

const SUGGESTIONS = [
  "What do we know about forgot password emails not sending?",
  "What is the current fix, and what did we do before it?",
  "Which open issues mention timeouts?",
];

/**
 * Repo Q&A (QA-01): conversational recall over incident memory + synced
 * GitHub issues. One Cognee session id is threaded through the whole
 * conversation, so follow-up questions see earlier turns — session memory,
 * the lifecycle's conversational face.
 */
export function AskRepo() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const idRef = useRef(0);

  function pushTurn(role: Turn["role"], text: string, grounded = true) {
    idRef.current += 1;
    setTurns((prev) => [...prev, { id: idRef.current, role, text, grounded }]);
  }

  async function submit(text: string) {
    const q = text.trim();
    if (!q || isAsking) return;
    setQuestion("");
    pushTurn("user", q);
    setIsAsking(true);
    const res = await askRepo({ question: q, sessionId: sessionRef.current });
    setIsAsking(false);
    if (res.status === "ok") {
      sessionRef.current = res.session_id;
      pushTurn("memory", res.answer);
    } else {
      pushTurn("memory", res.message, false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(question);
  }

  return (
    <Card className="glow-soft animate-rise-in gap-4 border-border/60 p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-xl font-semibold text-gradient">Ask your repo</h2>
        <p className="font-sans text-sm text-muted-foreground">
          Conversational recall over your incident memory and synced GitHub
          issues. Follow-ups remember the conversation — one Cognee session,
          many turns.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
        {turns.length === 0 ? (
          <>
            <EmptyState
              icon={MessageCircleQuestion}
              title="Ask anything your memory might know"
              hint="Try one of these to get started."
            />
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void submit(s)}
                  className="glass rounded-full border border-border/60 px-3 py-1.5 font-sans text-xs text-muted-foreground transition-colors hover:border-accent-violet/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        ) : (
          <ul className="flex max-h-[24rem] flex-col gap-3 overflow-y-auto pr-1">
            {turns.map((turn) => (
              <li
                key={turn.id}
                className={cn(
                  "glass max-w-[85%] rounded-xl border px-3.5 py-2.5 font-sans text-sm",
                  turn.role === "user"
                    ? "self-end border-accent-indigo/40 text-foreground"
                    : "self-start border-border/60",
                  turn.role === "memory" && !turn.grounded && "text-muted-foreground",
                )}
              >
                {turn.text}
              </li>
            ))}
            {isAsking ? (
              <li className="glass self-start rounded-xl border border-border/60 px-3.5 py-2.5 font-sans text-sm text-muted-foreground">
                Recalling…
              </li>
            ) : null}
          </ul>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about an issue, an incident, a fix…"
            aria-label="Ask your repo a question"
            className="h-10 flex-1"
          />
          <Button
            type="submit"
            disabled={isAsking || !question.trim()}
            className="font-sans text-sm font-semibold"
          >
            <Send className="size-4" aria-hidden="true" />
            Ask
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
