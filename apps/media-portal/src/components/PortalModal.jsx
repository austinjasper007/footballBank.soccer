"use client";

import { useEffect, useRef } from "react";

export default function PortalModal({
  type,
  title,
  src,
  description,
  error,
  loading = false,
  onClose,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      id="viewer-modal"
      ref={dialogRef}
      className={`viewer-modal viewer-modal-${type}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="viewer-modal-card">
        <header className="viewer-modal-header">
          <div>
            <p className="eyebrow">{type === "video" ? "Private video" : "Player photo"}</p>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="viewer-modal-close" onClick={onClose} aria-label="Close viewer">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className={`viewer-modal-content viewer-modal-content-${type}`}>
          {type === "video" ? (
            loading ? (
              <div className="viewer-modal-error" role="status">Preparing secure playback…</div>
            ) : src ? (
              <iframe
                src={src}
                title={title}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="origin"
              />
            ) : (
              <div className="viewer-modal-error" role="alert">
                {error || "Secure video playback could not be authorized. Please try again."}
              </div>
            )
          ) : (
            <img src={src} alt={title} />
          )}
        </div>
      </section>
    </dialog>
  );
}
