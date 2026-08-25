import React from "react";
import PortalShell from "./PortalShell";
import QuestionRunner from "./QuestionRunner";
import LessonPortal from "./LessonPortal";
import { ListChecks, FileText, Stethoscope, RefreshCw, Swords, ClipboardCheck, ShieldCheck } from "lucide-react";

const META = {
  quiz: { icon: ListChecks, accent: "indigo" },
  practice: { icon: ListChecks, accent: "indigo" },
  diagnostic: { icon: ClipboardCheck, accent: "emerald" },
  exam: { icon: FileText, accent: "rose" },
  review: { icon: RefreshCw, accent: "emerald" },
  challenge: { icon: Swords, accent: "amber" },
  mistake_clinic: { icon: Stethoscope, accent: "rose" },
  mastery_check: { icon: ShieldCheck, accent: "indigo" },
};

export default function PortalRouter({ portal, onComplete, onExit }) {
  const { type, config } = portal;
  if (type === "lesson") return <LessonPortal config={config} onComplete={onComplete} onExit={onExit} />;

  const m = META[type] || META.quiz;
  const tutorEnabled = type !== "exam" && type !== "mastery_check";
  return (
    <PortalShell
      title={config.title || `${type.replace(/_/g, " ")} portal`}
      subtitle={config.concept}
      icon={m.icon}
      accent={m.accent}
      onExit={onExit}
    >
      <QuestionRunner config={{ ...config, tutorEnabled }} onComplete={onComplete} />
    </PortalShell>
  );
}