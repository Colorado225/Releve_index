import { Icon } from "./Icon";
import { Loader } from "./Loader";
import { usePhotoUrl } from "../hooks/usePhoto";

// Visionneuse plein écran d'une photo de compteur (chargée depuis IndexedDB).
export function PhotoModal({
  photoId,
  onClose,
  onDelete,
}: {
  photoId: string;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const url = usePhotoUrl(photoId);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex justify-end">
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      <div
        className="flex flex-1 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {url ? (
          <img
            src={url}
            alt="Photo du compteur"
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        ) : (
          <Loader
            variant="inline"
            mode="indeterminate"
            label="Chargement de la photo…"
            className="max-w-xs"
          />
        )}
      </div>

      {onDelete && (
        <div
          className="flex justify-center pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <Icon name="trash" className="h-4 w-4" />
            Supprimer la photo
          </button>
        </div>
      )}
    </div>
  );
}

// Miniature cliquable d'une photo.
export function PhotoThumb({
  photoId,
  onClick,
}: {
  photoId: string;
  onClick: () => void;
}) {
  const url = usePhotoUrl(photoId);
  return (
    <button
      onClick={onClick}
      aria-label="Voir la photo"
      className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-slate-400">
          <Icon name="camera" className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}