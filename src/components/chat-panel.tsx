"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  isThinking: boolean;
  onSend: (msg: string) => void;
}

export default function ChatPanel({ messages, isThinking, onSend }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isThinking]);

  const handleSend = () => {
    const t = input.trim();
    if (!t) return;
    onSend(t);
    setInput("");
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Chat history */}
      <div
        ref={scrollRef}
        className="relative rounded-2xl p-[18px] max-h-60 overflow-y-auto"
        style={{
          background: "rgba(8,8,10,0.75)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Inner glow */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(255,209,102,0.04) 0%, transparent 65%)",
          }}
        />

        {messages.map((m, i) => (
          <div
            key={i}
            className="msg-appear rounded-xl relative"
            style={{
              marginBottom: i < messages.length - 1 ? 12 : 0,
              padding: "12px 14px",
              background: m.role === "user" ? "rgba(255,209,102,0.07)" : "rgba(255,255,255,0.035)",
              borderLeft: `2.5px solid ${m.role === "user" ? "var(--color-gold)" : "rgba(255,255,255,0.2)"}`,
              marginLeft: m.role === "user" ? 24 : 0,
              marginRight: m.role === "ai" ? 24 : 0,
            }}
          >
            <div
              className="font-mono text-[0.58rem] tracking-[0.15em] uppercase mb-1 opacity-80"
              style={{ color: m.role === "user" ? "var(--color-gold)" : "var(--color-teal)" }}
            >
              {m.role === "user" ? "You" : "Chord Studio AI"}
            </div>
            <div
              className="text-[0.9rem] leading-[1.65] text-text"
              dangerouslySetInnerHTML={{ __html: m.content }}
            />
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex items-center gap-3.5 px-3.5 py-2.5">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-[3px] h-4 rounded-sm bg-gold opacity-60"
                  style={{ animation: `thinking 1.1s ease-in-out ${i * 0.18}s infinite` }}
                />
              ))}
            </div>
            <span className="font-mono text-[0.6rem] text-teal tracking-[0.12em]">
              {"Composing\u2026"}
            </span>
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={"Describe your sound \u2014 genre, mood, key, BPM\u2026"}
          className="flex-1 px-[18px] py-3.5 rounded-xl font-sans text-[0.9rem] text-text outline-none transition-all duration-250 focus:border-gold focus:shadow-[0_0_22px_rgba(255,209,102,0.12),inset_0_0_18px_rgba(255,209,102,0.02)]"
          style={{
            background: "rgba(8,8,10,0.85)",
            border: "1px solid var(--color-border)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={isThinking}
          className="px-[26px] py-3.5 rounded-xl font-sans font-bold text-[0.88rem] flex items-center gap-1.5 whitespace-nowrap transition-all duration-250 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,209,102,0.4)] disabled:cursor-not-allowed"
          style={{
            background: isThinking ? "rgba(255,209,102,0.15)" : "var(--color-gold)",
            color: isThinking ? "var(--color-gold)" : "#000",
            border: isThinking ? "1px solid var(--color-gold)" : "none",
          }}
        >
          {isThinking ? (
            <>
              <span
                className="spin inline-block w-3 h-3 rounded-full"
                style={{
                  border: "2px solid rgba(255,209,102,0.3)",
                  borderTopColor: "var(--color-gold)",
                }}
              />
              {" "}Thinking
            </>
          ) : (
            "Generate \u21B5"
          )}
        </button>
      </div>
    </div>
  );
}
