import React from "react";
import { TrendingUp, TrendingDown, Clock, Swords, AlertTriangle } from "lucide-react";

export default function ResultsCard({ report }) {
  if (!report) return null;
  const scoreColor =
    report.score >= 70 ? "text-emerald-600" : report.score >= 50 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3 w-full max-w-md">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Evidence report</div>
        <div className={`text-2xl font-bold ${scoreColor}`}>{report.score}%</div>
      </div>
      <div className="text-xs text-muted-foreground">
        {report.correct}/{report.total} correct · {report.unanswered} unanswered
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {report.improvement !== null && (
          <div className="flex items-center gap-1">
            {report.improvement >= 0 ? (
              <TrendingUp className="w-3 h-3 text-emerald-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-rose-600" />
            )}
            {report.improvement >= 0 ? `+${report.improvement}` : report.improvement} vs last attempt
          </div>
        )}
        {report.timeProblem && (
          <div className="flex items-center gap-1 text-amber-600">
            <Clock className="w-3 h-3" /> Time pressure
          </div>
        )}
        {report.readyForHarder && (
          <div className="flex items-center gap-1 text-indigo-600">
            <Swords className="w-3 h-3" /> Ready for harder
          </div>
        )}
      </div>
      {report.patterns && report.patterns.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-500" /> Recurring patterns
          </div>
          {report.patterns.map((p, i) => (
            <div key={i} className="text-xs capitalize text-rose-600 pl-4">
              • {p.pattern.replace(/_/g, " ")} ({p.count})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}