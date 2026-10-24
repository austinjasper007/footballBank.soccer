"use client";

import { useEffect } from "react";

export default function PostViewTracker({ postId }) {
  useEffect(() => {
    let deviceId;
    try {
      deviceId = localStorage.getItem("footballbank_device_id");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("footballbank_device_id", deviceId);
      }
    } catch (error) {
      console.error("Could not persist post-view device ID:", error);
    }

    fetch(`/api/posts/${postId}/view`, {
      method: "POST",
      headers: deviceId ? { "x-device-id": deviceId } : {},
    }).then((response) => {
      if (!response.ok) {
        console.error(`Failed to track post view (${response.status})`);
      }
    }).catch((error) => {
      console.error("Failed to track post view:", error);
    });
  }, [postId]);

  return null;
}
