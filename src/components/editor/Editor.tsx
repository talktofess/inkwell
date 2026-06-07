"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import Focus from "@tiptap/extension-focus";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

export interface EditorSettings {
  fontFamily: "serif" | "sans" | "mono";
  fontSize: number;
  lineWidth: number;
  focusMode: boolean;
  typewriter: boolean;
}

export function Editor({
  content,
  settings,
  onUpdate,
  onReady,
}: {
  content: unknown;
  settings: EditorSettings;
  onUpdate: (json: unknown, words: number, chars: number) => void;
  onReady?: (editor: TiptapEditor) => void;
}) {
  // Keep the latest update handler in a ref so the (once-created) editor never
  // calls a stale closure after the active document changes.
  const updateRef = useRef(onUpdate);
  useEffect(() => {
    updateRef.current = onUpdate;
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight,
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Focus.configure({ className: "has-focus", mode: "deepest" }),
      Placeholder.configure({ placeholder: "Begin writing your story…" }),
      CharacterCount,
    ],
    content: (content as object) ?? undefined,
    editorProps: {
      attributes: { class: "focus:outline-none" },
    },
    onUpdate: ({ editor }) => {
      updateRef.current(
        editor.getJSON(),
        editor.storage.characterCount.words(),
        editor.storage.characterCount.characters()
      );
    },
  });

  // Hand the instance up to the workspace (for find/replace, snapshots, etc.)
  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor, onReady]);

  // Swap content when the selected document changes.
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(content);
    if (current !== incoming) {
      editor.commands.setContent((content as object) ?? "", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor]);

  // Typewriter scrolling: keep the caret vertically centered.
  useEffect(() => {
    if (!editor || !settings.typewriter) return;
    const handler = () => {
      const { state, view } = editor;
      const pos = state.selection.head;
      const coords = view.coordsAtPos(pos);
      const scroller = view.dom.closest("[data-scroll]") as HTMLElement | null;
      if (!scroller) return;
      const target = scroller.clientHeight / 2;
      scroller.scrollTop += coords.top - scroller.getBoundingClientRect().top - target;
    };
    editor.on("selectionUpdate", handler);
    editor.on("update", handler);
    return () => {
      editor.off("selectionUpdate", handler);
      editor.off("update", handler);
    };
  }, [editor, settings.typewriter]);

  const fontClass =
    settings.fontFamily === "serif"
      ? "font-serif"
      : settings.fontFamily === "mono"
      ? "font-mono"
      : "font-sans";

  return (
    <div
      className={`mx-auto w-full ${settings.focusMode ? "focusmode" : ""} ${
        settings.typewriter ? "typewriter" : ""
      }`}
      style={{ maxWidth: `${settings.lineWidth}px` }}
    >
      <div
        className={fontClass}
        style={{ fontSize: `${settings.fontSize}px` }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
