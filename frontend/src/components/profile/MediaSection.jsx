import { useEffect, useState } from "react";
import { useProfileStore } from "../../store/useProfileStore";
import { Image as ImageIcon, Video, FileText, Link, Mic, Maximize2, FolderOpen, Loader2, Download } from "lucide-react";

const MediaSection = () => {
  const { sharedMedia, fetchSharedMedia, isLoadingMedia, openModal } = useProfileStore();
  const [activeTab, setActiveTab] = useState("photos");
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    fetchSharedMedia(activeTab, 1);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    fetchSharedMedia(tab, 1);
  };

  const counts = sharedMedia.counts || {};

  const tabs = [
    { key: "photos", label: "Photos", icon: ImageIcon, count: counts.photos || 0 },
    { key: "videos", label: "Videos", icon: Video, count: counts.videos || 0 },
    { key: "documents", label: "Docs", icon: FileText, count: counts.documents || 0 },
    { key: "links", label: "Links", icon: Link, count: counts.links || 0 },
    { key: "voiceNotes", label: "Voice", icon: Mic, count: counts.voiceNotes || 0 },
  ];

  return (
    <>
      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg} alt="Preview" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
        </div>
      )}

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
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === key ? "bg-primary text-primary-content shadow-xs" : "bg-base-200/60 text-base-content/70 hover:bg-base-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label} ({count})
            </button>
          ))}
        </div>

        {/* Content Preview */}
        <div className="pt-1">
          {isLoadingMedia ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : sharedMedia.items.length === 0 ? (
            <div className="p-4 rounded-xl bg-base-200/40 border border-base-300/60 text-center space-y-2">
              <p className="text-xs font-medium text-base-content/60">No {activeTab} shared yet.</p>
            </div>
          ) : activeTab === "photos" ? (
            <div className="grid grid-cols-4 gap-2">
              {sharedMedia.items.slice(0, 4).map((item, i) =>
                item.image ? (
                  <div
                    key={i}
                    onClick={() => setLightboxImg(item.image)}
                    className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer border border-base-300 shadow-xs"
                  >
                    <img
                      src={item.image}
                      alt={`Shared ${i}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ) : null
              )}
            </div>
          ) : activeTab === "links" ? (
            <div className="space-y-2 max-h-36 overflow-y-auto messages-scrollbar">
              {sharedMedia.items.slice(0, 4).map((item, i) => {
                const url = item.text?.match(/https?:\/\/[^\s]+/)?.[0];
                return url ? (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 bg-base-200/60 rounded-xl border border-base-300/60 hover:bg-base-200 transition-colors text-xs">
                    <span className="text-base">🔗</span>
                    <p className="truncate text-primary font-medium">{url}</p>
                  </a>
                ) : null;
              })}
            </div>
          ) : (
            <div className="space-y-2 max-h-36 overflow-y-auto messages-scrollbar">
              {sharedMedia.items.slice(0, 4).map((item, i) =>
                item.file ? (
                  <a key={i} href={item.file} download target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 bg-base-200/60 rounded-xl border border-base-300/60 hover:bg-base-200 transition-colors text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">📎</span>
                      <p className="truncate text-base-content/80 font-medium">{item.fileType || "file"}</p>
                    </div>
                    <Download className="w-3.5 h-3.5 text-base-content/40 shrink-0" />
                  </a>
                ) : null
              )}
            </div>
          )}

          {sharedMedia.items.length > 0 && (
            <div className="pt-2 text-center">
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
    </>
  );
};

export default MediaSection;
