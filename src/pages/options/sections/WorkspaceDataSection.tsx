import type { ChangeEvent, RefObject } from 'react';
import { Database } from 'lucide-react';

interface WorkspaceDataSectionProps {
  importText: string;
  fileInputRef: RefObject<HTMLInputElement>;
  onImportTextChange: (value: string) => void;
  onCopyJson: () => Promise<void>;
  onDownloadJson: () => Promise<void>;
  onImportFromText: () => Promise<void>;
  onFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function WorkspaceDataSection({
  importText,
  fileInputRef,
  onImportTextChange,
  onCopyJson,
  onDownloadJson,
  onImportFromText,
  onFileSelected
}: WorkspaceDataSectionProps) {
  return (
    <section id="options-workspace-data" className="bo-card scroll-mt-4 space-y-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Database size={18} strokeWidth={2} className="shrink-0 text-primary/90" aria-hidden />
        Workspace data
      </h2>
      <p className="text-xs text-textMuted">
        Export, import, and restore local workspace snapshots including settings, scheduler, and sync metadata.
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="bo-link" onClick={() => void onCopyJson()}>
          Copy JSON
        </button>
        <button type="button" className="bo-link" onClick={() => void onDownloadJson()}>
          Download JSON file
        </button>
        <button type="button" className="bo-link" onClick={() => fileInputRef.current?.click()}>
          Import JSON file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={onFileSelected}
        />
        <button type="button" className="bo-link" onClick={() => void onImportFromText()}>
          Import JSON text
        </button>
      </div>

      <textarea
        value={importText}
        onChange={(event) => onImportTextChange(event.target.value)}
        rows={8}
        placeholder="Paste exported BrandOps JSON here"
        className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
      />
    </section>
  );
}
