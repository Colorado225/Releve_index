import { useEffect, useState } from "react";
import { getPhoto } from "../lib/photos";

// Charge une photo depuis IndexedDB et renvoie une URL d'objet révocable.
export function usePhotoUrl(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    getPhoto(id)
      .then((p) => {
        if (!active || !p) return;
        objectUrl = URL.createObjectURL(p.blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        /* photo indisponible */
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  return url;
}