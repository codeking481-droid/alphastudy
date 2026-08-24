import React from "react";
import ReactMarkdown from "react-markdown";

const components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
  h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-1">{children}</h3>,
  blockquote: ({ children }) => <blockquote className="border-l-2 pl-3 italic text-muted-foreground">{children}</blockquote>,
};

export default function Markdown({ content }) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown components={components}>{content || ""}</ReactMarkdown>
    </div>
  );
}