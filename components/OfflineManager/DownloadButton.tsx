"use client";

import { useState, useEffect } from "react";
import { downloadAndSave, deleteOfflineItem, isDownloaded } from "@/lib/indexeddb";
import type { OfflineMeta } from "@/lib/indexeddb";

type Props = {
  id: string;
  url: string;
  meta: Omit<OfflineMeta, "downloadedAt" | "size">;
};

export default function DownloadButton({ id, url, meta }: Props) {
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    isDownloaded(id).then(setDownloaded);
  }, [id]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloaded) {
      await deleteOfflineItem(id);
      setDownloaded(false);
      return;
    }
    setDownloading(true);
    try {
      await downloadAndSave(id, url, meta, setProgress);
      setDownloaded(true);
    } catch {
      // Download failed silently
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  if (downloading) {
    return (
      <div className="flex items-center gap-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
          <circle cx="12" cy="12" r="10" stroke="#E8522A" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
        </svg>
        <span className="text-xs" style={{ color: "#E8522A" }}>{progress}%</span>
      </div>
    );
  }

  return (
    <button onClick={handleDownload} className="p-2">
      {downloaded ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="#E8522A" />
          <path d="M9 12l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="10" stroke="#E8522A" strokeWidth="2" fill="none" />
          <path d="M9 12l3 3 5-5" stroke="#E8522A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2v13M8 11l4 4 4-4" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 17v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" stroke="#888" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
