import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Check, Loader2 } from "lucide-react";
import ImageUploader from "./ImageUploader";

export default function ImagePickerModal({ onSelect, onClose }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("library");

  const loadImages = async () => {
    setLoading(true);
    const imgs = await base44.entities.MediaImage.list("-created_date", 1000);
    setImages(imgs);
    setLoading(false);
  };

  useEffect(() => { loadImages(); }, []);

  const handleUpload = async (url) => {
    const user = await base44.auth.me();
    await base44.entities.MediaImage.create({
      url,
      title: `Image ${new Date().toLocaleDateString()}`,
      uploaded_by: user?.email || "",
    });
    await loadImages();
    setTab("library");
  };

  const handleSelect = () => {
    if (selected) onSelect(selected);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-oswald font-bold text-white text-xl uppercase">Media Library</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {["library", "upload"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 font-inter text-sm font-medium capitalize transition-colors ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-white"}`}
            >
              {t === "library" ? "Image Library" : "Upload New"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "upload" ? (
            <ImageUploader onUpload={handleUpload} />
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground font-inter text-sm">
              No images yet. Upload some first.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map(img => (
                <button
                  key={img.id}
                  onClick={() => setSelected(img.url)}
                  className={`relative group aspect-square overflow-hidden rounded-lg border-2 transition-all ${selected === img.url ? "border-primary" : "border-transparent hover:border-border"}`}
                >
                  <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                  {selected === img.url && (
                    <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === "library" && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded border border-border text-sm font-inter text-foreground hover:border-primary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selected}
              className="px-4 py-2 rounded bg-primary text-white text-sm font-inter font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
            >
              Use Selected Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
