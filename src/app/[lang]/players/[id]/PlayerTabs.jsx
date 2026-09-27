"use client"
import { useEffect, useState } from "react"
import Image from "next/image"

export default function PlayerTabs({ player, onImageClick }) {
  const [tab, setTab] = useState("gallery")
  const [selectedVideo, setSelectedVideo] = useState(player.videoPrimary || "")

  const videoTitles = {
    [player.videoPrimary]: "Primary Highlights",
  }
  player.videoAdditional.forEach((video, index) => {
    videoTitles[video] = `Additional Video ${index + 1}`
  })


  return (
    <>
    <section className="py-16 border-y border-divider bg-primary-bg">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Tabs */}
        <div className="flex gap-2 lg:gap-4 border-b border-divider overflow-x-auto mb-8">
          {["gallery", "videos", "availability"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 lg:px-6 py-3 font-medium border-b-2 transition text-sm lg:text-base ${
                tab === t
                  ? "text-accent-red border-accent-red"
                  : "text-primary-muted border-transparent hover:text-accent-amber"
              }`}
            >
              {t === "gallery"
                ? "Photo Gallery"
                : t === "videos"
                ? "Highlight Videos"
                : "Availability"}
            </button>
          ))}
        </div>

        {/* Gallery Tab */}
        {tab === "gallery" && (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            data-aos="fade-up"
          >
            {player.imageUrl.map((img, idx) => (
              <div
                key={img}
                className="overflow-hidden rounded-lg border border-divider cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onImageClick(idx)}
              >
                <Image
                  src={img}
                  alt={`Gallery image ${idx + 1}`}
                  width={300}
                  height={200}
                  className="object-cover w-full h-40"
                />
              </div>
            ))}
          </div>
        )}

        {/* Videos Tab */}
        {tab === "videos" && (
          <div className="grid lg:grid-cols-2 gap-8" data-aos="fade-up">
            <div className="bg-primary-bg rounded-lg overflow-hidden border border-divider">
              <div className="aspect-video">
                <video src={selectedVideo} controls className="w-full h-full"></video>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">
                  {videoTitles[selectedVideo] || "Highlight Video"}
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(videoTitles).map(([url, title]) => (
                <div
                  key={url}
                  className={`cursor-pointer rounded-lg p-4 border ${
                    selectedVideo === url ? "border-accent-red" : "border-divider"
                  }`}
                  onClick={() => setSelectedVideo(url)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 bg-primary-secondary flex items-center justify-center rounded">
                      <i className="fa-solid fa-play text-accent-red" />
                    </div>
                    <div>
                      <h4 className="font-medium">{title}</h4>
                      <p className="text-primary-muted text-sm">Click to play</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Availability Tab */}
        {tab === "availability" && (
          <div className="grid lg:grid-cols-2 gap-8" data-aos="fade-up">
            <div className="bg-primary-bg rounded-lg p-6 border border-divider">
              <h3 className="font-semibold text-xl mb-4">Availability</h3>
              <div className="space-y-4 text-sm">
                <p>
                  <strong>Contract Status:</strong> Free Agent
                </p>
                <p>
                  <strong>Available From:</strong> Immediately
                </p>
                <p>
                  <strong>Preferred Destination:</strong>{" "}
                  {Array.isArray(player.preferredLeagues)
                    ? player.preferredLeagues.join(", ") || "unavailable"
                    : player.preferredLeagues || "unavailable"}
                </p>
                <p>
                  <strong>Salary Expectation:</strong>{" "}
                  {player.salaryExpectation
                    ? `${player.salaryExpectation} USD`
                    : "unavailable"}
                </p>
              </div>
            </div>

            <div className="bg-primary-bg rounded-lg p-6 border border-divider">
              <h3 className="font-semibold text-xl mb-4">Agent Contact</h3>
              <p className="text-primary-muted mb-2">
                <i className="fa-solid fa-user-tie mr-2"></i> Ayodeji Michael .F
              </p>
              <p className="text-primary-muted mb-2 text-nowrap">
                <i className="fa-solid fa-envelope mr-2"></i> contact@footballbank.soccer
              </p>
              <p className="text-primary-muted mb-4">
                <i className="fa-solid fa-phone mr-2"></i> +(844) 362-9881 (Toll Free)
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
    </>
  )
}
