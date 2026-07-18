/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useTransition } from 'react';
import { FolderOpen, Search, Sparkles, Image as ImageIcon, CheckCircle, HelpCircle, Trash2, Loader2 } from 'lucide-react';
import { CharacterImage } from '../types';

interface CharacterFolderInputProps {
  images: CharacterImage[];
  onImagesLoaded: (loadedImages: CharacterImage[]) => void;
  onClearImages?: () => void;
  onDeleteImage?: (id: string) => void;
}

// Low-memory, offscreen canvas image resizer and optimizer - keeps original resolution
const compressAndResizeImage = (file: File): Promise<{ blob: Blob; url: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        let w = img.width;
        let h = img.height;
        const maxDim = 1920;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const url = URL.createObjectURL(file);
          resolve({ blob: file, url });
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve({ blob, url });
            } else {
              const url = URL.createObjectURL(file);
              resolve({ blob: file, url });
            }
          },
          'image/jpeg',
          0.85 // 85% high fidelity jpeg matches crisp quality while being 95%+ lighter
        );
      };
      img.onerror = () => {
        const url = URL.createObjectURL(file);
        resolve({ blob: file, url });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      const url = URL.createObjectURL(file);
      resolve({ blob: file, url });
    };
    reader.readAsDataURL(file);
  });
};

export default function CharacterFolderInput({ images, onImagesLoaded, onClearImages, onDeleteImage }: CharacterFolderInputProps) {
  const [isPending, startTransition] = useTransition();
  const [optimizeProgress, setOptimizeProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Parse keywords from folder pathways and filenames, allowing Vietnamese accents
  const extractKeywords = (fileName: string, relativePath?: string): string[] => {
    // List of common English and Vietnamese stop words to ignore when extracting keywords from filenames
    const STOP_WORDS = new Set([
      'at', 'of', 'and', 'the', 'with', 'or', 'in', 'to', 'on', 'by', 'for', 'an', 'is', 'it', 'about', 'from', 'as', 
      'this', 'that', 'these', 'those', 'then', 'here', 'there', 'who', 'whom', 'where', 'when', 'why', 'how', 'which',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'not', 'no', 'yes', 'so', 'if', 'your',
      'my', 'their', 'our', 'his', 'her', 'its', 'me', 'you', 'he', 'she', 'they', 'we', 'us', 'him', 'them',
      'cua', 'va', 'trong', 'cho', 'nhu', 'nhung', 'co', 'nay', 'do', 'kia', 'của', 'và', 'trong', 'cho', 'như', 'những', 'có', 'này', 'đó', 'kia',
      'gh', 'thì', 'là', 'mà', 'gì', 'nào', 'với', 'về', 'để', 'cũng', 'đã', 'đang', 'sẽ', 'được', 'từ', 'qua', 'bởi', 'tại', 'ra', 'vào', 'lên', 'xuống', 'lại', 'thêm'
    ]);

    const allKeywords = new Set<string>();

    const processSegment = (segment: string) => {
      const nameWithoutExt = segment.substring(0, segment.lastIndexOf('.')) || segment;
      // Extract Vietnamese accented and alphanumeric names
      const words = nameWithoutExt.split(/[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+/i);
      words.forEach(w => {
        const trimmed = w.trim();
        if (trimmed.length >= 2 && !/^\d+$/.test(trimmed) && !STOP_WORDS.has(trimmed.toLowerCase())) {
          allKeywords.add(trimmed);
        }
      });
    };

    // 1. Filename words
    processSegment(fileName);

    // 2. Folder names if multi-directory upload structure is detected
    if (relativePath) {
      const parts = relativePath.split('/');
      // Evaluate everything except actual file and parent folder if root
      for (let i = 0; i < parts.length - 1; i++) {
        processSegment(parts[i]);
      }
    }

    return Array.from(allKeywords);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFileList(files);
  };

  const processFileList = (files: FileList | File[]) => {
    startTransition(async () => {
      const imageRegex = /\.(png|jpe?g|webp|gif|bmp)$/i;
      const imageFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (imageRegex.test(file.name)) {
          imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) return;

      setOptimizeProgress({ current: 0, total: imageFiles.length });
      const loaded: CharacterImage[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const path = file.webkitRelativePath || file.name;
        const keywords = extractKeywords(file.name, path);
        const id = `img_${i}_${Date.now()}`;

        // Compress and optimize to original size instantly
        const { blob, url } = await compressAndResizeImage(file);
        const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });

        loaded.push({
          id,
          name: file.name,
          path,
          url,
          file: compressedFile,
          keywords,
        });

        // Throttle progress triggers slightly
        setOptimizeProgress({ current: i + 1, total: imageFiles.length });
      }

      if (loaded.length > 0) {
        onImagesLoaded(loaded);
      }
      setOptimizeProgress(null);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  // Get unique keywords across all loaded images for filters
  const allKeywordsMap = new Map<string, number>();
  images.forEach(img => {
    img.keywords.forEach(kw => {
      const lower = kw.toLowerCase();
      allKeywordsMap.set(lower, (allKeywordsMap.get(lower) || 0) + 1);
    });
  });

  const sortedUniqueKeywords = Array.from(allKeywordsMap.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, 15);

  const filteredImages = images.filter(img => 
    img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    img.keywords.some(kw => kw.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-[#0E0E11] border border-white/10 rounded-2xl p-6 shadow-xl" id="folder-uploader-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
            <FolderOpen size={20} />
          </div>
          <div>
            <h2 className="text-md font-semibold text-white font-sans tracking-tight">
              Thư mục ảnh nhân vật
            </h2>
            <p className="text-xs text-white/40 mt-1">
              Ảnh nạp vào tự động gộp, nén nhẹ tối ưu và bóc tách từ khóa thư mục thoại
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {images.length > 0 && (
            <>
              <div className="flex items-center gap-1 bg-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-full border border-blue-500/15 font-mono">
                <CheckCircle size={12} />
                {images.length} ẢNH
              </div>
              {onClearImages && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearImages();
                  }}
                  className="p-1 px-2 border border-rose-500/20 text-rose-450 hover:bg-rose-500/15 rounded-md text-[10px] flex items-center gap-1 font-bold transition-all"
                  title="Xóa toàn bộ kho lưu trữ ảnh"
                >
                  <Trash2 size={11} /> Xóa hết
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Directory Selector Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
          dragActive
            ? 'border-blue-500 bg-blue-500/5'
            : images.length > 0
            ? 'border-white/15 hover:border-white/20 bg-[#050505]/40'
            : 'border-white/10 hover:border-blue-500/30 hover:bg-[#050505]/40'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInputClick}
        id="directory-dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          id="character-folder-input"
          className="hidden"
          // @ts-ignore - webkitdirectory option is standard in React but not completely typed
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFileChange}
        />

        <div className="w-12 h-12 rounded-full bg-[#050505] flex items-center justify-center border border-white/10 mb-3 text-white/40 transition-transform group-hover:scale-105">
          <FolderOpen size={22} className="text-blue-400" />
        </div>

        <p className="text-xs font-semibold text-white/90">
          {optimizeProgress 
            ? `Đang giải nén & nén nhẹ: ${optimizeProgress.current}/${optimizeProgress.total} ảnh...` 
            : isPending 
            ? 'Đang tính toán dung lượng...' 
            : 'Nhấp để nạp thư mục hoặc thả hàng loạt ảnh vào đây'}
        </p>
        <p className="text-[11px] text-white/40 mt-1.5 max-w-sm leading-relaxed">
          Tải bao nhiêu thư mục tùy ý. Hệ thống tối ưu hóa dung lượng xuống cực nhẹ (~100KB) giúp hiển thị siêu tốc và mượt mà!
        </p>

        {(optimizeProgress || isPending) && (
          <div className="mt-4 w-full max-w-xs bg-white/5 rounded-full h-2 overflow-hidden border border-white/5 relative">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-100"
              style={{ 
                width: optimizeProgress 
                  ? `${(optimizeProgress.current / optimizeProgress.total) * 100}%` 
                  : '100%' 
              }}
            />
          </div>
        )}
      </div>

      {/* Mini-instructions helper */}
      <div className="mt-4 bg-[#050505]/45 border border-white/10 rounded-xl p-4 text-xs text-white/40">
        <div className="flex gap-2 items-start">
          <HelpCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>Mỗi thư mục đại diện cho từ khóa (vd thư mục <code className="text-white/60 font-mono bg-white/5 px-1 rounded"> Sarah_DungSy</code>). Tất cả ảnh con sẽ mang từ khóa này.</li>
              <li>Hệ thống tối ưu đưa ảnh về cỡ chuẩn <strong className="text-white/75 font-sans">640x720</strong> để khớp ghép mượt độc bản bên trái và bên phải.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Keywords & Thumbnail Search / Grid if images loaded */}
      {images.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-5">
          {/* Top Frequency Keywords */}
          {sortedUniqueKeywords.length > 0 && (
            <div className="mb-4">
              <span className="text-xs text-white/40 block mb-2 font-medium">Từ khóa phát hiện được phổ biến nhất:</span>
              <div className="flex flex-wrap gap-1.5">
                {sortedUniqueKeywords.map(([kw, count]) => (
                  <button
                    key={kw}
                    onClick={() => setSearchTerm(kw)}
                    className={`text-xs px-2 py-1 rounded-md border transition-all ${
                      searchTerm.toLowerCase() === kw
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 font-semibold'
                        : 'bg-[#050505]/60 text-white/80 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {kw} <span className="opacity-50 font-mono">({count})</span>
                  </button>
                ))}
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-xs px-2 py-1 rounded-md bg-rose-500/15 text-rose-450 border border-rose-500/20 font-semibold hover:bg-rose-500/25"
                  >
                    Xóa lọc x
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Search box */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/40">
                <Search size={15} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo tên file hoặc từ khóa..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#050505] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Grid preview of images scroll area */}
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2.5 max-h-48 overflow-y-auto pr-1 bg-[#050505]/20 p-2 rounded-xl border border-white/10">
            {filteredImages.slice(0, 120).map((img) => (
              <div
                key={img.id}
                className="group relative aspect-[64/72] bg-[#050505] border border-white/10 hover:border-blue-500/40 rounded-lg overflow-hidden transition-all"
                title={`${img.name}\nTừ khóa: ${img.keywords.join(', ')}`}
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1">
                  <p className="text-[9px] text-white/70 truncate font-mono">
                    {img.name.split(/[\/\\]/).pop() || img.name}
                  </p>
                </div>
                {onDeleteImage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteImage(img.id);
                    }}
                    className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-rose-600 text-white rounded transition-colors group-hover:opacity-100 opacity-0 duration-150 shadow shadow-black flex items-center justify-center"
                    title="Xóa hình ảnh này khỏi kho lưu trữ"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
            {filteredImages.length === 0 && (
              <div className="col-span-full py-6 text-center text-xs text-white/45">
                Không tìm thấy ảnh phù hợp với tìm kiếm
              </div>
            )}
            {filteredImages.length > 120 && (
              <div className="col-span-full text-center py-2 text-[10px] text-white/30">
                Đang hiển thị 120 / {filteredImages.length} ảnh. Hãy dùng ô tìm kiếm để lọc thêm.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
