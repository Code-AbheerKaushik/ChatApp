import { useProfileStore } from "../../store/useProfileStore";
import { Image as ImageIcon, Video, FileText, Link, Mic, Maximize2, FolderOpen } from "lucide-react";
import { useState } from "react";

const MediaSection = () => {
  const { openModal } = useProfileStore();
  const [activeTab, setActiveTab] = useState("photos");

  const mediaCounts = {
    photos: 42,
    videos: 12,
    documents: 8,
    links: 19,
    voiceNotes: 31,
  };

  const samplePhotos = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
  ];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-base-content">Shared Media & Links</h3>
            <p className="text-xs text-base-content/60">Photos, documents, clips, and web links</p>
          </div>
        </div>
        <button
          onClick={() => openModal("mediaGallery")}
          className="btn btn-xs btn-ghost text-primary gap-1"
        >
          <Maximize2 className="w-3 h-3" />
          Open Gallery
        </button>
      </div>

      {/* Category Pills with Counts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 messages-scrollbar">
        <button
          onClick={() => setActiveTab("photos")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === "photos" ? "bg-primary text-primary-content shadow-xs" : "bg-base-200/60 text-base-content/70 hover:bg-base-200"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Photos ({mediaCounts.photos})
        </button>

        <button
          onClick={() => setActiveTab("videos")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === "videos" ? "bg-primary text-primary-content shadow-xs" : "bg-base-200/60 text-base-content/70 hover:bg-base-200"
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          Videos ({mediaCounts.videos})
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === "documents" ? "bg-primary text-primary-content shadow-xs" : "bg-base-200/60 text-base-content/70 hover:bg-base-200"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Docs ({mediaCounts.documents})
        </button>

        <button
          onClick={() => setActiveTab("links")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === "links" ? "bg-primary text-primary-content shadow-xs" : "bg-base-200/60 text-base-content/70 hover:bg-base-200"
          }`}
        >
          <Link className="w-3.5 h-3.5" />
          Links ({mediaCounts.links})
        </button>

        <button
          onClick={() => setActiveTab("voiceNotes")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === "voiceNotes" ? "bg-primary text-primary-content shadow-xs" : "bg-base-200/60 text-base-content/70 hover:bg-base-200"
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          Voice ({mediaCounts.voiceNotes})
        </button>
      </div>

      {/* Thumbnail / Content Preview */}
      <div className="pt-1">
        {activeTab === "photos" && (
          <div className="grid grid-cols-4 gap-2">
            {samplePhotos.map((src, i) => (
              <div
                key={i}
                onClick={() => openModal("mediaGallery", { index: i })}
                className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer border border-base-300 shadow-xs"
              >
                <img
                  src={src}
                  alt={`Shared ${i}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab !== "photos" && (
          <div className="p-4 rounded-xl bg-base-200/40 border border-base-300/60 text-center space-y-2">
            <p className="text-xs font-medium text-base-content/70">
              Viewing {mediaCounts[activeTab]} item(s) in {activeTab}
            </p>
            <button
              onClick={() => openModal("mediaGallery")}
              className="btn btn-xs btn-primary rounded-lg"
            >
              Browse All {activeTab}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaSection;
