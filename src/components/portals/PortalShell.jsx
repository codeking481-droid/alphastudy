import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const accents = {
  indigo: "from-indigo-500 to-violet-600",
  emerald: "from-emerald-500 to-teal-600",
  rose: "from-rose-500 to-pink-600",
  amber: "from-amber-500 to-orange-600",
};

export default function PortalShell({ title, subtitle, icon: Icon, accent = "indigo", onExit, children, footer }) {
  return (
    <div className="h-full flex flex-col bg-background">
      <div className={`bg-gradient-to-r ${accents[accent]} text-white px-4 py-3 flex items-center gap-3 shadow-md`}>
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight truncate">{title}</div>
          {subtitle && <div className="text-xs text-white/80 truncate">{subtitle}</div>}
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onExit} title="Return to Alpha">
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
      {footer && <div className="border-t p-3 bg-background">{footer}</div>}
    </div>
  );
}