import { useEffect, useRef, useState } from "react";
import { FileText, FileVideo, Image as ImageIcon, Music, Pause, Play } from "lucide-react";
import { axiosInstance } from "../lib/axios";

export const mediaUrl = (media) => media.accessUrl ? axiosInstance.getUri({ url: media.accessUrl }) : media.url;

const Waveform = ({ src, playing }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const draw = async () => {
      try {
        const response = await fetch(src, { credentials: "include" });
        const data = await response.arrayBuffer();
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioBuffer = await new AudioContext().decodeAudioData(data);
        if (cancelled || !canvasRef.current) return;
        const canvas = canvasRef.current; const context = canvas.getContext("2d");
        const width = canvas.width = canvas.clientWidth * devicePixelRatio; const height = canvas.height = canvas.clientHeight * devicePixelRatio;
        const samples = Math.min(80, Math.floor(width / 3)); const channel = audioBuffer.getChannelData(0); const block = Math.max(1, Math.floor(channel.length / samples));
        context.clearRect(0, 0, width, height); context.strokeStyle = "currentColor"; context.lineWidth = 2 * devicePixelRatio;
        for (let i = 0; i < samples; i += 1) { let peak = 0; for (let j = 0; j < block; j += 1) peak = Math.max(peak, Math.abs(channel[i * block + j] || 0)); const x = i * width / samples; const h = Math.max(2 * devicePixelRatio, peak * height); context.beginPath(); context.moveTo(x, (height - h) / 2); context.lineTo(x, (height + h) / 2); context.stroke(); }
      } catch { /* the native player remains usable if waveform decoding is unavailable */ }
    };
    draw(); return () => { cancelled = true; };
  }, [src]);
  return <canvas ref={canvasRef} aria-label="Audio waveform" className={`w-full h-8 opacity-70 ${playing ? "text-primary" : "text-base-content"}`} />;
};

const AudioMessage = ({ media }) => {
  const ref = useRef(null); const [playing, setPlaying] = useState(false); const [time, setTime] = useState(0); const [duration, setDuration] = useState(0); const src = mediaUrl(media);
  useEffect(() => {
    const pause = (event) => { if (event.detail !== ref.current) ref.current?.pause(); };
    window.addEventListener("chat-audio-play", pause); return () => window.removeEventListener("chat-audio-play", pause);
  }, []);
  const toggle = () => { if (!ref.current) return; if (ref.current.paused) { window.dispatchEvent(new CustomEvent("chat-audio-play", { detail: ref.current })); ref.current.play(); } else ref.current.pause(); };
  const format = (value) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
  return <div className="w-64 max-w-full flex items-center gap-2 py-1"><audio ref={ref} src={src} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onLoadedMetadata={() => setDuration(ref.current?.duration || 0)} onTimeUpdate={() => setTime(ref.current?.currentTime || 0)} /><button onClick={toggle} className="btn btn-circle btn-xs btn-primary">{playing ? <Pause className="size-3" /> : <Play className="size-3" />}</button><div className="flex-1 min-w-0"><Waveform src={src} playing={playing} /><input aria-label="Audio position" type="range" min="0" max={duration || 0} step="0.1" value={time} className="range range-xs" onChange={(e) => { if (ref.current) ref.current.currentTime = Number(e.target.value); }} /></div><span className="text-[10px] whitespace-nowrap">{format(time)} / {format(duration)}</span></div>;
};

const FileCard = ({ media }) => {
  const src = mediaUrl(media); const icon = media.kind === "video" ? <FileVideo /> : media.kind === "image" ? <ImageIcon /> : media.kind === "audio" ? <Music /> : <FileText />;
  const size = media.size ? `${(media.size / 1024 / 1024).toFixed(media.size > 1024 * 1024 ? 1 : 2)} MB` : "Unknown size";
  if (media.kind === "image") return null;
  if (media.kind === "video") return <video controls preload="metadata" className="w-full max-w-[360px] rounded-xl bg-black" onError={(e) => { e.currentTarget.poster = ""; }}><source src={src} type={media.mimeType} />Your browser cannot play this video.</video>;
  if (media.kind === "audio") return <AudioMessage media={media} />;
  return <a href={src} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl bg-base-100/30 p-2 min-w-[190px]"><span className="text-primary">{icon}</span><span className="min-w-0"><span className="block text-sm truncate">{media.fileName}</span><span className="block text-[10px] opacity-70">{media.mimeType} · {size}</span></span></a>;
};

const MediaMessage = ({ message, onOpenImage }) => {
  const modern = message.media || [];
  const images = modern.filter((media) => media.kind === "image");
  return <>
    {images.length > 0 && <div className={`grid gap-1 mb-1 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>{images.map((media, index) => <button key={media._id} className="relative" onClick={() => onOpenImage(images, index)}><img src={mediaUrl(media)} alt={media.fileName} loading="lazy" className="w-full max-w-[280px] max-h-60 object-cover rounded-xl" onError={(e) => { e.currentTarget.alt = "Image unavailable"; }} /></button>)}</div>}
    {modern.filter((media) => media.kind !== "image").map((media) => <FileCard key={media._id} media={media} />)}
    {!modern.length && message.image && <button onClick={() => onOpenImage([{ url: message.image, fileName: "Image" }], 0)}><img src={message.image} alt="Attachment" className="max-w-[220px] sm:max-w-[280px] w-full rounded-xl mb-1.5 object-cover max-h-60" /></button>}
    {!modern.length && message.file && <a href={message.file} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm underline mb-1"><FileText className="size-4" />{message.fileType === "audio" ? "Voice message" : "Attachment"}</a>}
  </>;
};

export default MediaMessage;
