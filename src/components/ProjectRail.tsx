"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PenLine,
  LayoutGrid,
  BookMarked,
  Lightbulb,
  BarChart3,
  FileDown,
  Home,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const items = [
  { href: "write", icon: PenLine, label: "Write" },
  { href: "outline", icon: LayoutGrid, label: "Outline" },
  { href: "bible", icon: BookMarked, label: "Story Bible" },
  { href: "notes", icon: Lightbulb, label: "Notes" },
  { href: "analytics", icon: BarChart3, label: "Analytics" },
  { href: "compile", icon: FileDown, label: "Compile & Export" },
];

export function ProjectRail({ projectId, color }: { projectId: string; color: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-ink-border bg-ink-surface py-3">
      <Link
        href="/"
        className="btn-ghost mb-2 h-10 w-10 p-0"
        title="All novels"
        style={{ color }}
      >
        <Home size={19} />
      </Link>

      {items.map(({ href, icon: Icon, label }) => {
        const active = pathname.endsWith(`/${href}`);
        return (
          <Link
            key={href}
            href={`/project/${projectId}/${href}`}
            title={label}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              active ? "bg-ink-accent text-white" : "text-ink-muted hover:bg-ink-border/40 hover:text-ink-text"
            }`}
          >
            <Icon size={19} />
          </Link>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-1">
        <ThemeToggle />
        <form action="/api/logout" method="post">
          <button type="submit" title="Lock" className="btn-ghost h-10 w-10 p-0 text-ink-muted">
            <LogOut size={18} />
          </button>
        </form>
      </div>
    </nav>
  );
}
