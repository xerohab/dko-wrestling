import { useEffect } from "react";

// Disables right-click, copy/cut, and common save/print/inspect shortcuts on
// public pages. Form inputs and contenteditable areas keep normal behaviour.
// Note: browsers cannot prevent OS-level screenshots; this is a deterrent only.
export function useContentProtection() {
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    const blockKeys = (e) => {
      const t = e.target;
      const tag = (t?.tagName || "").toLowerCase();
      const editable = tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable;
      if (editable) return;
      const k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "s", "p", "u", "a"].includes(k)) {
        e.preventDefault();
      }
      if (k === "f12") e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k)) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("copy", prevent);
    document.addEventListener("cut", prevent);
    document.addEventListener("keydown", blockKeys);
    document.body.classList.add("content-protected");
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("copy", prevent);
      document.removeEventListener("cut", prevent);
      document.removeEventListener("keydown", blockKeys);
      document.body.classList.remove("content-protected");
    };
  }, []);
}