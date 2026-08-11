import { useEffect, useRef, useState } from "react";
import { FileText, FileVideo, Image as ImageIcon, Music, Pause, Play, Volume2, VolumeX, Maximize, RotateCcw, AlertTriangle, Download } from "lucide-react";
import { axiosInstance } from "../lib/axios";

export const mediaUrl = (media) => media.accessUrl ? axiosInstance.getUri({ url: media.accessUrl }) : media.url;

// --- Helper: Format duration and file sizes ---
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// --- Real Waveform Canvas Component ---
const Waveform = ({ src, playing, currentTime, duration, onSeek }) => {
  const canvasRef = useRef(null);
  const [peaks, setPeaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const decodeAudio = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(src, { credentials: "include" });
        if (!response.ok) throw new Error("Network error loading audio");
        const arrayBuffer = await response.arrayBuffer();
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
        if (cancelled) return;
        const channelData = audioBuffer.getChannelData(0);
        const sampleCount = 45;
        const blockSize = Math.floor(channelData.length / sampleCount);
        const extractedPeaks = [];
        for (let i = 0; i < sampleCount; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j] || 0);
          }
          extractedPeaks.push(sum / blockSize);
        }
        // Normalize peaks between 0.15 and 1.0
        const maxPeak = Math.max(...extractedPeaks, 0.001);
        const normalized = extractedPeaks.map((p) => Math.max(0.15, p / maxPeak));
        setPeaks(normalized);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    decodeAudio();
    return () => { cancelled = true; };
  }, [src]);

  // Render bars onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const width = (canvas.width = canvas.clientWidth * dpr);
    const height = (canvas.height = canvas.clientHeight * dpr);

    ctx.clearRect(0, 0, width, height);

    const progressRatio = duration > 0 ? currentTime / duration : 0;
    const barWidth = 3 * dpr;
    const gap = 2 * dpr;
    const totalBars = peaks.length;

    peaks.forEach((peak, i) => {
      const x = i * (barWidth + gap);
      const barHeight = Math.max(4 * dpr, peak * height * 0.85);
      const y = (height - barHeight) / 2;

      const isPlayed = i / totalBars <= progressRatio;
      ctx.fillStyle = isPlayed ? "#3b82f6" : "rgba(156, 163, 175, 0.4)";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, barWidth, barHeight, 2 * dpr) : ctx.rect(x, y, barWidth, barHeight);
      ctx.fill();
    });
  }, [peaks, currentTime, duration]);

  const handleCanvasClick = (e) => {
    if (!canvasRef.current || duration <= 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1 h-8 w-full px-1">
        <div className="h-1.5 w-full bg-base-300 rounded-full animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-8 w-full flex items-center justify-center text-[11px] text-base-content/50">
        Audio wave unavailable
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      aria-label="Audio waveform"
      className="w-full h-8 cursor-pointer select-none"
    />
  );
};

// --- Custom Audio Player Component ---
const AudioMessage = ({ media }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media.duration || 0);
  const src = mediaUrl(media);

  useEffect(() => {
    const handlePauseOthers = (e) => {
      if (e.detail !== audioRef.current && audioRef.current) {
        audioRef.current.pause();
      }
    };
    window.addEventListener("chat-audio-play", handlePauseOthers);
    return () => window.removeEventListener("chat-audio-play", handlePauseOthers);
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      window.dispatchEvent(new CustomEvent("chat-audio-play", { detail: audioRef.current }));
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  const handleSeek = (newTime) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div className="w-64 sm:w-72 max-w-full flex items-center gap-3 p-2 bg-base-200/50 rounded-2xl border border-base-300/60 shadow-xs">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || media.duration || 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
      />
      <button
        onClick={togglePlay}
        className="btn btn-circle btn-primary btn-sm flex-shrink-0 shadow-xs"
        aria-label={playing ? "Pause voice note" : "Play voice note"}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <Waveform
          src={src}
          playing={playing}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
        />
        <div className="flex justify-between items-center text-[10px] text-base-content/60 px-0.5 mt-0.5 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

// --- Inline Video Player Component ---
const CustomVideoPlayer = ({ media }) => {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(false);
  const src = mediaUrl(media);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) videoRef.current.play();
    else videoRef.current.pause();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
      else if (videoRef.current.webkitRequestFullscreen) videoRef.current.webkitRequestFullscreen();
    }
  };

  return (
    <div className="relative group w-full max-w-[340px] sm:max-w-[380px] rounded-2xl overflow-hidden bg-black shadow-md border border-base-300/40">
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        className="w-full max-h-72 object-contain cursor-pointer"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onError={() => setError(true)}
      />

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-300/90 text-error p-4 text-center">
          <AlertTriangle className="size-8 mb-1" />
          <p className="text-xs font-semibold">Video could not be played</p>
        </div>
      ) : (
        <>
          {/* Central Overlay Play Button when paused */}
          {!playing && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto size-12 btn btn-circle btn-primary shadow-xl flex items-center justify-center transition-transform hover:scale-110"
              aria-label="Play video"
            >
              <Play className="size-6 ml-1" />
            </button>
          )}

          {/* Controls Overlay Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (videoRef.current) videoRef.current.currentTime = val;
                setCurrentTime(val);
              }}
              className="range range-xs range-primary h-1 cursor-pointer"
            />
            <div className="flex items-center justify-between text-white text-xs px-1">
              <div className="flex items-center gap-2">
                <button onClick={togglePlay} className="hover:text-primary transition-colors">
                  {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
                <button onClick={toggleMute} className="hover:text-primary transition-colors">
                  {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
                <span className="text-[10px] font-mono text-white/80">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <button onClick={handleFullscreen} className="hover:text-primary transition-colors">
                <Maximize className="size-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- Rich File Card Component ---
const FileCard = ({ media }) => {
  const src = mediaUrl(media);
  if (media.kind === "image") return null;
  if (media.kind === "video") return <CustomVideoPlayer media={media} />;
  if (media.kind === "audio") return <AudioMessage media={media} />;

  const isPdf = media.mimeType === "application/pdf" || media.fileName?.endsWith(".pdf");
  const ext = media.fileName ? media.fileName.split(".").pop().toUpperCase() : "FILE";

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      download={media.fileName}
      className="flex items-center gap-3 rounded-2xl bg-base-200/80 hover:bg-base-200 p-3 min-w-[220px] max-w-[320px] border border-base-300/70 transition-colors shadow-xs group"
    >
      <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold text-xs">
        {isPdf ? "PDF" : ext.slice(0, 4)}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-xs font-semibold truncate group-hover:text-primary transition-colors">
          {media.fileName || "Document"}
        </span>
        <span className="block text-[10px] text-base-content/60 mt-0.5">
          {formatFileSize(media.size)}
        </span>
      </div>
      <Download className="size-4 text-base-content/40 group-hover:text-primary flex-shrink-0 transition-colors" />
    </a>
  );
};

// --- Main MediaMessage Component ---
const MediaMessage = ({ message, onOpenImage }) => {
  const modern = message.media || [];
  const images = modern.filter((media) => media.kind === "image");
  const otherMedia = modern.filter((media) => media.kind !== "image");

  return (
    <div className="space-y-1.5">
      {/* Grouped Image Grid Layout */}
      {images.length > 0 && (
        <div
          className={`grid gap-1 rounded-2xl overflow-hidden ${
            images.length === 1
              ? "grid-cols-1"
              : images.length === 2
              ? "grid-cols-2"
              : "grid-cols-2"
          } max-w-[280px] sm:max-w-[320px]`}
        >
          {images.slice(0, 4).map((media, index) => {
            const isMore = images.length > 4 && index === 3;
            return (
              <button
                key={media._id || index}
                onClick={() => onOpenImage(images, index)}
                className="relative aspect-square overflow-hidden group focus:outline-none"
              >
                <img
                  src={mediaUrl(media)}
                  alt={media.fileName || `Attachment ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => { e.currentTarget.alt = "Image unavailable"; }}
                />
                {isMore && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg backdrop-blur-xs">
                    +{images.length - 3}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Non-Image Attachments (Video, Audio, Docs) */}
      {otherMedia.map((media, idx) => (
        <FileCard key={media._id || idx} media={media} />
      ))}

      {/* Backward Compatibility for single image / file legacy fields */}
      {!modern.length && message.image && (
        <button onClick={() => onOpenImage([{ url: message.image, fileName: "Image" }], 0)} className="block focus:outline-none">
          <img
            src={message.image}
            alt="Attachment"
            className="max-w-[220px] sm:max-w-[280px] w-full rounded-2xl object-cover max-h-64 shadow-xs"
          />
        </button>
      )}

      {!modern.length && message.file && (
        <a
          href={message.file}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs font-medium underline text-primary hover:opacity-80"
        >
          <FileText className="size-4" />
          {message.fileType === "audio" ? "Voice message" : "Attachment"}
        </a>
      )}
    </div>
  );
};

export default MediaMessage;
