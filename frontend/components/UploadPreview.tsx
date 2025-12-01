"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface UploadPreviewProps {
  src: string;
  onClick?: () => void;
}

export default function UploadPreview({ src, onClick }: UploadPreviewProps) {
  const [imgError, setImgError] = useState(false);

  // On récupère le nom du fichier (sans extension)
  const parts = src.split("/");
  const filename = parts[parts.length - 1].split(".")[0];

  // Construction de l'URL PNG pour la preview
  const pngUrl = `http://localhost:8000/uploads/previews/${filename}.png`;

  return (
    <div className="relative cursor-pointer" onClick={onClick}>
      {!imgError ? (
        <img
          src={pngUrl}
          alt={`aperçu-${filename}`}
          className={cn("w-full h-auto rounded-lg shadow-md object-cover")}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        /* Fallback si la preview échoue */
        <div className="p-4 text-center text-sm text-gray-600 border border-gray-300 rounded-lg">
          <p>Prévisualisation non disponible</p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Ouvrir le fichier
          </a>
        </div>
      )}
    </div>
  );
}
