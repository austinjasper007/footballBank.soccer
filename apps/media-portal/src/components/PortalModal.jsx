"use client";

import { useEffect, useRef, useState } from "react";

export default function PortalModal({
  type,
  title,
  src,
  description,
  error,
  loading = false,
  onClose,
  onVideoPlay,
}) {
  const dialogRef = useRef(null);
  const iframeRef = useRef(null);
  const handlersRef = useRef({ onVideoPlay });
  const [playerJs, setPlayerJs] = useState(null);
  const [playerError, setPlayerError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    handlersRef.current = { onVideoPlay };
  });

  useEffect(() => {
    if (type !== "video" || !src) return undefined;
    let active = true;
    setPlayerError("");
    import("player.js")
      .then((module) => {
        if (active) setPlayerJs(module.default);
      })
      .catch((loadError) => {
        console.error("Could not load Bunny's playback controls.", loadError);
        if (active) setPlayerError("The secure video player could not be loaded. Please try again.");
      });
    return () => {
      active = false;
    };
  }, [type, src]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (type !== "video" || !src || !playerJs || !iframe) return undefined;

    let onMessage = () => {};
    const addEvent = playerJs.addEvent;
    playerJs.addEvent = (element, eventType, handler) => {
      const wrappedHandler = (event) => handler(event);
      onMessage = wrappedHandler;
      addEvent(element, eventType, wrappedHandler);
    };

    let player;
    try {
      player = new playerJs.Player(iframe);
    } catch (error) {
      console.error("Could not initialize Bunny's playback controls.", error);
      setPlayerError("The secure video player could not be initialized. Please try again.");
    } finally {
      playerJs.addEvent = addEvent;
    }

    if (!player) return undefined;
    player.on("play", () => handlersRef.current.onVideoPlay?.());

    return () => window.removeEventListener("message", onMessage);
  }, [playerJs, src, type]);

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
              playerError ? (
                <div className="viewer-modal-error" role="alert">{playerError}</div>
              ) : playerJs ? (
                <iframe
                  key={src}
                  ref={iframeRef}
                  src={src}
                  title={title}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className="viewer-modal-error" role="status">Loading secure video player…</div>
              )
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
