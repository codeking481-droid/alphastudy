import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Markdown from "./Markdown";
import ActionCard from "./ActionCard";
import ResultsCard from "./ResultsCard";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";

export default function ChatMessage({ message, onAction, onSaveNote }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold",
          isUser ? "bg-slate-700" : "bg-gradient-to-br from-indigo-500 to-violet-600"
        )}
      >
        {isUser ? "You" : <Sparkles className="w-4 h-4" />}
      </div>
      <div className={cn("max-w-[85%] space-y-2", isUser && "items-end flex flex-col")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
          )}
        >
          <Markdown content={message.content} />
        </div>
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((url, i) => (
              <div key={i} className="rounded-xl overflow-hidden border max-w-[200px]">
                <Image src={url} className="w-full h-36" fittingType="fill" />
              </div>
            ))}
          </div>
        )}
        {message.report && <ResultsCard report={message.report} />}
        {message.action && <ActionCard action={message.action} onAction={() => onAction(message.action)} />}
        {message.note_offer && (
          <button
            onClick={() => onSaveNote(message.note_offer)}
            className="text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
          >
            📌 Save as note
          </button>
        )}
      </div>
    </motion.div>
  );
}