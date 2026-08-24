import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, ListChecks, FileText, Stethoscope, RefreshCw, Swords, ClipboardCheck, ShieldCheck } from "lucide-react";

const icons = { lesson: BookOpen, quiz: ListChecks, practice: ListChecks, diagnostic: ClipboardCheck, exam: FileText, mistake_clinic: Stethoscope, review: RefreshCw, challenge: Swords, mastery_check: ShieldCheck };
const labels = { lesson: "Lesson", quiz: "Quiz", practice: "Practice", diagnostic: "Diagnostic", exam: "Exam", mistake_clinic: "Mistake Clinic", review: "Review", challenge: "Challenge", mastery_check: "Mastery Check" };

export default function ActionCard({ action, onAction }) {
  if (!action || action.type !== "portal") return null;
  const Icon = icons[action.portal] || ArrowRight;
  const label = labels[action.portal] || "Start";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <div className="font-medium text-sm">{action.title || `${label} Portal`}</div>
      </div>
      <div className="text-xs text-muted-foreground mb-3 flex gap-3">
        {action.question_count ? <span>{action.question_count} questions</span> : null}
        {action.duration_minutes ? <span>{action.duration_minutes} min</span> : null}
        {action.difficulty ? <span className="capitalize">{action.difficulty}</span> : null}
        {action.pattern ? <span className="text-rose-500">{action.pattern.replace(/_/g, " ")}</span> : null}
      </div>
      <button
        onClick={onAction}
        className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
      >
        {action.cta || `Start ${label}`} <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}