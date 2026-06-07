"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Editor as TiptapEditor } from "@tiptap/react";
import { Search, Maximize2, Minimize2, Sun, AlignJustify, FileText } from "lucide-react";
import type { DocNode, DocType, Project, Snapshot } from "@/lib/types";
import { Editor, EditorSettings } from "@/components/editor/Editor";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { Binder } from "./Binder";
import { Inspector } from "./Inspector";
import { SprintTimer } from "./SprintTimer";
import { FindReplace } from "./FindReplace";
import { WriteSettings } from "./WriteSettings";
import { localDay } from "@/lib/utils";
import {
  createDocument,
  renameDocument,
  deleteDocument,
  reorderSiblings,
  updateDocumentMeta,
  saveDocumentContent,
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
} from "@/app/project/[id]/actions";

const DEFAULT_SETTINGS: EditorSettings = {
  fontFamily: "serif",
  fontSize: 19,
  lineWidth: 680,
  focusMode: false,
  typewriter: false,
};

export function WriteWorkspace({
  project,
  documents,
  activeDoc,
  snapshots,
  todayWords: initialToday,
}: {
  project: Project;
  documents: DocNode[];
  activeDoc: DocNode | null;
  snapshots: Snapshot[];
  todayWords: number;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState(documents);
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [todayWords, setTodayWords] = useState(initialToday);
  const [showFind, setShowFind] = useState(false);
  const [zen, setZen] = useState(false);
  const [plainText, setPlainText] = useState(activeDoc?.content_text ?? "");

  const editorRef = useRef<TiptapEditor | null>(null);
  const contentRef = useRef<unknown>(activeDoc?.content ?? null);
  const wordsRef = useRef<number>(activeDoc?.word_count ?? 0);
  const prevWordsRef = useRef<number>(activeDoc?.word_count ?? 0);
  const todayRef = useRef<number>(initialToday);
  const dirtyRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setDocs(documents), [documents]);
  useEffect(() => {
    todayRef.current = todayWords;
  }, [todayWords]);

  // Load persisted typography settings.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ink-write-settings");
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {}
  }, []);
  const patchSettings = (patch: Partial<EditorSettings>) =>
    setSettings((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem("ink-write-settings", JSON.stringify(next));
      } catch {}
      return next;
    });

  // Reset per-document refs when the active doc changes.
  useEffect(() => {
    contentRef.current = activeDoc?.content ?? null;
    wordsRef.current = activeDoc?.word_count ?? 0;
    prevWordsRef.current = activeDoc?.word_count ?? 0;
    dirtyRef.current = false;
    setPlainText(activeDoc?.content_text ?? "");
    setStatus("idle");
  }, [activeDoc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNow = useCallback(async () => {
    if (!activeDoc || !dirtyRef.current) return;
    if (timer.current) clearTimeout(timer.current);
    dirtyRef.current = false;
    setStatus("saving");
    const json = contentRef.current;
    const words = wordsRef.current;
    const delta = Math.max(0, words - prevWordsRef.current);
    prevWordsRef.current = words;
    if (delta > 0) {
      setTodayWords((t) => t + delta);
      todayRef.current += delta;
    }
    setDocs((prev) => prev.map((d) => (d.id === activeDoc.id ? { ...d, word_count: words } : d)));
    try {
      await saveDocumentContent(project.id, activeDoc.id, json, localDay());
      setStatus("saved");
    } catch {
      setStatus("idle");
      dirtyRef.current = true;
    }
  }, [activeDoc, project.id]);

  const flush = useCallback(async () => {
    if (dirtyRef.current) await saveNow();
  }, [saveNow]);

  const onEditorUpdate = (json: unknown, words: number, _chars: number) => {
    contentRef.current = json;
    wordsRef.current = words;
    dirtyRef.current = true;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(saveNow, 900);
  };

  // Flush on tab hide / unload.
  useEffect(() => {
    const onHide = () => {
      if (dirtyRef.current) saveNow();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [saveNow]);

  // ── navigation / tree ops (flush first so refreshes never clobber text) ──
  const select = async (id: string) => {
    if (id === activeDoc?.id) return;
    await flush();
    router.push(`/project/${project.id}/write?doc=${id}`);
  };
  const add = async (type: DocType, parentId: string | null) => {
    await flush();
    const id = await createDocument(project.id, type, parentId);
    if (type === "scene") router.push(`/project/${project.id}/write?doc=${id}`);
    else router.refresh();
  };
  const rename = async (id: string, title: string) => {
    await renameDocument(project.id, id, title);
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, title } : d)));
  };
  const remove = async (id: string) => {
    await flush();
    await deleteDocument(project.id, id);
    if (id === activeDoc?.id) router.push(`/project/${project.id}/write`);
    else router.refresh();
  };
  const reorder = async (parentId: string | null, orderedIds: string[]) => {
    await reorderSiblings(project.id, orderedIds);
    router.refresh();
  };

  const onMeta = async (patch: Partial<DocNode>) => {
    if (!activeDoc) return;
    await flush();
    setDocs((prev) => prev.map((d) => (d.id === activeDoc.id ? { ...d, ...patch } : d)));
    await updateDocumentMeta(project.id, activeDoc.id, patch);
    router.refresh();
  };

  const snapshot = async (label: string) => {
    if (!activeDoc) return;
    await flush();
    await createSnapshot(project.id, activeDoc.id, label);
    router.refresh();
  };
  const restore = async (id: string) => {
    await flush();
    await restoreSnapshot(project.id, id);
    router.refresh();
  };
  const removeSnapshot = async (id: string) => {
    await deleteSnapshot(project.id, id);
    router.refresh();
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFind((v) => !v);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
      } else if (e.key === "Escape") {
        setShowFind(false);
        setZen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNow]);

  const liveSprintWords = () =>
    todayRef.current + Math.max(0, wordsRef.current - prevWordsRef.current);

  const totalWords = docs.reduce((s, d) => s + (d.type === "scene" ? d.word_count : 0), 0);
  const goalPct = Math.min(100, Math.round((todayWords / Math.max(1, project.daily_word_goal)) * 100));

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="no-print flex items-center gap-2 border-b border-ink-border bg-ink-surface px-3 py-2">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-base font-semibold leading-none">{project.title}</h1>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            {totalWords.toLocaleString()} / {project.target_word_count.toLocaleString()} words
          </p>
        </div>

        <div className="ml-2 flex items-center gap-2" title="Today's progress">
          <GoalRing pct={goalPct} />
          <div className="hidden text-xs leading-tight text-ink-muted sm:block">
            <div className="font-semibold text-ink-text">{todayWords.toLocaleString()}</div>
            <div>/ {project.daily_word_goal.toLocaleString()} today</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 hidden text-xs text-ink-muted md:inline">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
          </span>
          <SprintTimer getWords={liveSprintWords} onComplete={() => {}} />
          <button onClick={() => setShowFind((v) => !v)} className="btn-ghost h-9 w-9 p-0" title="Find & replace (Ctrl+F)">
            <Search size={17} />
          </button>
          <button
            onClick={() => patchSettings({ focusMode: !settings.focusMode })}
            className={`btn-ghost h-9 w-9 p-0 ${settings.focusMode ? "text-ink-accent" : ""}`}
            title="Focus mode"
          >
            <Sun size={17} />
          </button>
          <button
            onClick={() => patchSettings({ typewriter: !settings.typewriter })}
            className={`btn-ghost h-9 w-9 p-0 ${settings.typewriter ? "text-ink-accent" : ""}`}
            title="Typewriter scrolling"
          >
            <AlignJustify size={17} />
          </button>
          <WriteSettings settings={settings} onChange={patchSettings} />
          <button onClick={() => setZen((z) => !z)} className="btn-ghost h-9 w-9 p-0" title="Distraction-free">
            {zen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Binder */}
        {!zen && (
          <aside className="w-60 shrink-0 border-r border-ink-border bg-ink-surface">
            <Binder
              documents={docs}
              activeId={activeDoc?.id ?? null}
              onSelect={select}
              onAdd={add}
              onRename={rename}
              onDelete={remove}
              onReorder={reorder}
            />
          </aside>
        )}

        {/* Editor */}
        <main data-scroll className="relative flex-1 overflow-y-auto bg-ink-bg">
          {activeDoc ? (
            <div className="mx-auto max-w-4xl px-6 py-6">
              {!zen && (
                <div className="sticky top-0 z-10 -mx-6 mb-4 bg-ink-bg/80 px-6 pb-2 pt-1 backdrop-blur">
                  {showFind ? (
                    <FindReplace
                      text={plainText}
                      getDoc={() => editorRef.current?.getJSON() ?? contentRef.current}
                      onReplaced={(doc) => {
                        editorRef.current?.commands.setContent(doc as object, true);
                        contentRef.current = editorRef.current?.getJSON();
                        wordsRef.current = editorRef.current?.storage.characterCount.words() ?? wordsRef.current;
                        dirtyRef.current = true;
                        setStatus("saving");
                        saveNow();
                      }}
                      onClose={() => setShowFind(false)}
                    />
                  ) : (
                    <EditorToolbar editor={editorRef.current} />
                  )}
                </div>
              )}

              <Editor
                content={activeDoc.content}
                settings={settings}
                onReady={(e) => (editorRef.current = e)}
                onUpdate={(json, words, chars) => {
                  onEditorUpdate(json, words, chars);
                  setPlainText(editorRef.current?.getText() ?? "");
                }}
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-ink-muted">
              <FileText size={36} />
              <p>Select a scene from the binder, or create one to start writing.</p>
              <button onClick={() => add("scene", null)} className="btn-primary">
                New scene
              </button>
            </div>
          )}
        </main>

        {/* Inspector */}
        {!zen && activeDoc && activeDoc.type === "scene" && (
          <aside className="w-72 shrink-0 border-l border-ink-border bg-ink-surface">
            <Inspector
              doc={docs.find((d) => d.id === activeDoc.id) ?? activeDoc}
              snapshots={snapshots}
              onMeta={onMeta}
              onSnapshot={snapshot}
              onRestore={restore}
              onDeleteSnapshot={removeSnapshot}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function GoalRing({ pct }: { pct: number }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" className="-rotate-90">
      <circle cx="17" cy="17" r={r} fill="none" strokeWidth="3.5" className="stroke-ink-border" />
      <circle
        cx="17"
        cy="17"
        r={r}
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="stroke-ink-accent transition-all"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}
