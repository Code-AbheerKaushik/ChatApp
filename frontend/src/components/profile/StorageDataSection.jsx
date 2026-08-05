import { useEffect } from "react";
import { useProfileStore } from "../../store/useProfileStore";
import { Database, Trash2, Download, HardDrive, FileText, Image as ImageIcon, Video, Mic, Loader2 } from "lucide-react";

const StorageDataSection = () => {
  const { storageStats, fetchStorageStats, isLoadingStorage, clearCache, exportChatData } = useProfileStore();

  useEffect(() => {
    fetchStorageStats();
  }, []);

  const percentageUsed = storageStats.maxMB > 0
    ? Math.min(100, Math.round((storageStats.totalUsedMB / storageStats.maxMB) * 100))
    : 0;

  const categories = [
    { label: "Photos", sizeMB: storageStats.imagesMB, color: "bg-primary text-primary", icon: ImageIcon },
    { label: "Videos", sizeMB: storageStats.videosMB, color: "bg-secondary text-secondary", icon: Video },
    { label: "Documents", sizeMB: storageStats.docsMB, color: "bg-accent text-accent", icon: FileText },
    { label: "Voice Notes", sizeMB: storageStats.voiceNotesMB, color: "bg-info text-info", icon: Mic },
    { label: "Cached Files", sizeMB: storageStats.cacheMB, color: "bg-warning text-warning", icon: HardDrive },
  ];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-base-content">Storage & Data Usage</h3>
            <p className="text-xs text-base-content/60">Manage local cache and media storage</p>
          </div>
        </div>
        <div className="text-right">
          {isLoadingStorage ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />
          ) : (
            <>
              <p className="text-xs font-bold text-base-content">{storageStats.totalUsedMB} MB / {storageStats.maxMB} MB</p>
              <p className="text-[10px] text-base-content/50">{percentageUsed}% Capacity Used</p>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar Breakdown */}
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-base-200 rounded-full overflow-hidden flex p-0.5 border border-base-300">
          <div style={{ width: `${(storageStats.imagesMB / storageStats.maxMB) * 100}%` }} className="bg-primary h-full rounded-l-full transition-all duration-700" title="Photos" />
          <div style={{ width: `${(storageStats.videosMB / storageStats.maxMB) * 100}%` }} className="bg-secondary h-full transition-all duration-700" title="Videos" />
          <div style={{ width: `${(storageStats.docsMB / storageStats.maxMB) * 100}%` }} className="bg-accent h-full transition-all duration-700" title="Documents" />
          <div style={{ width: `${(storageStats.voiceNotesMB / storageStats.maxMB) * 100}%` }} className="bg-info h-full transition-all duration-700" title="Voice Notes" />
          <div style={{ width: `${(storageStats.cacheMB / storageStats.maxMB) * 100}%` }} className="bg-warning h-full rounded-r-full transition-all duration-700" title="Cache" />
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.label} className="flex items-center gap-2 p-2 rounded-lg bg-base-200/50 border border-base-300/40">
                <Icon className={`w-3.5 h-3.5 ${cat.color.split(" ")[1]}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-base-content/60 truncate">{cat.label}</p>
                  <p className="text-xs font-bold text-base-content">{cat.sizeMB} MB</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Storage Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
        <button
          onClick={clearCache}
          className="btn btn-sm btn-outline btn-warning rounded-xl gap-2 text-xs font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Cache ({storageStats.cacheMB} MB)
        </button>

        <button
          onClick={fetchStorageStats}
          className="btn btn-sm btn-outline btn-primary rounded-xl gap-2 text-xs font-medium"
        >
          <HardDrive className="w-3.5 h-3.5" />
          Recalculate Usage
        </button>

        <button
          onClick={exportChatData}
          className="btn btn-sm btn-primary rounded-xl gap-2 text-xs font-medium"
        >
          <Download className="w-3.5 h-3.5" />
          Export Chat Data
        </button>
      </div>
    </div>
  );
};

export default StorageDataSection;
