import { useEffect, useState } from "react";
import { Icon } from "./Icon";

// Sélecteur de photos (appareil photo sur mobile) pour un relevé.
export function PhotoField({
  files,
  onAdd,
  onRemove,
}: {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        Photos <span className="text-slate-400">(optionnel)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <PhotoPreview key={`${i}-${f.name}`} file={f} onRemove={() => onRemove(i)} />
        ))}
        <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-teal-500 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-800">
          <Icon name="camera" className="h-5 w-5" />
          <span className="text-[10px]">Ajouter</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              const list = e.target.files ? Array.from(e.target.files) : [];
              if (list.length) onAdd(list);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

function PhotoPreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      {url && (
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Retirer la photo"
        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
      >
        <Icon name="close" className="h-3 w-3" />
      </button>
    </div>
  );
}