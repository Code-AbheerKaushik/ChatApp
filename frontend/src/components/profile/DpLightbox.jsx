import { useState, useEffect, useRef } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const DpLightbox = ({ imageUrl, onClose }) => {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleWheel = (e) => {
    e.preventDefault();
    setScale((s) => Math.max(0.5, Math.min(5, s - e.deltaY * 0.001)));
  };

  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };
  const handleZoomIn = () => setScale((s) => Math.min(5, s + 0.5));
  const handleZoomOut = () => setScale((s) => Math.max(0.5, s - 0.5));

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Image */}
      <div
        ref={containerRef}
        className={`relative flex items-center justify-center w-full h-full overflow-hidden ${isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-zoom-in"}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={imageUrl}
          alt="Profile"
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.2s ease",
            maxWidth: "90vw",
            maxHeight: "90vh",
            borderRadius: "1rem",
          }}
          className="select-none object-contain shadow-2xl"
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5">
        <button onClick={handleZoomOut} className="p-2 rounded-full hover:bg-white/20 text-white transition-colors" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-white text-xs font-mono min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
        <button onClick={handleZoomIn} className="p-2 rounded-full hover:bg-white/20 text-white transition-colors" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-white/30" />
        <button onClick={handleReset} className="p-2 rounded-full hover:bg-white/20 text-white transition-colors" title="Reset">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/25 border border-white/20 rounded-full text-white transition-colors backdrop-blur-sm"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Keyboard hint */}
      <p className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-white/40">
        Scroll to zoom • Drag to pan • ESC to close
      </p>
    </div>
  );
};

export default DpLightbox;
