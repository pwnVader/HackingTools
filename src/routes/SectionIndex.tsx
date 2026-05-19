import { ReactNode } from 'react';
import Prompt from '../components/Prompt';
import ToolCard from '../components/ToolCard';

interface SectionTool {
  to: string;
  command: string;
  title: string;
  description: string;
  status?: 'ready' | 'soon';
  icon?: ReactNode;
}

interface SectionIndexProps {
  cwd: string;
  command: string;
  title: string;
  intro: string;
  tools: SectionTool[];
}

export default function SectionIndex({ cwd, command, title, intro, tools }: SectionIndexProps) {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Prompt cwd={cwd} command={command} />
        <div>
          <h1 className="text-3xl font-bold text-fg">{title}</h1>
          <p className="mt-3 max-w-2xl text-base text-fg-muted leading-relaxed">{intro}</p>
        </div>
      </header>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <ToolCard key={t.to} {...t} />
        ))}
      </div>
    </div>
  );
}
