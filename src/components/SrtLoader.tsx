/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { AlignLeft, CheckCircle, FileText, Upload } from 'lucide-react';
import { SubtitleBlock } from '../types';
import { parseSRT } from '../utils/srtParser';

interface SrtLoaderProps {
  srtFile: File | null;
  subtitles: SubtitleBlock[];
  onSubtitlesLoaded: (file: File, parsedBlocks: SubtitleBlock[]) => void;
  onClearSubtitles: () => void;
}

export default function SrtLoader({
  srtFile,
  subtitles,
  onSubtitlesLoaded,
  onClearSubtitles
}: SrtLoaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const textStr = e.target?.result as string;
        if (!textStr) {
          throw new Error('Không thể đọc dữ liệu file SRT.');
        }

        const parsed = parseSRT(textStr);
        if (parsed.length === 0) {
          throw new Error('Định dạng SRT không hợp lệ hoặc không tìm thấy dòng phụ đề nào. Hãy kiểm tra lại cấu trúc file srt.');
        }

        onSubtitlesLoaded(file, parsed);
      } catch (err: any) {
        setErrorMsg(err.message || 'Lỗi khi giải mã file phụ đề SRT.');
      }
    };

    reader.onerror = () => {
      setErrorMsg('Lỗi đọc tập tin từ hệ thống.');
    };

    reader.readAsText(file);
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
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.srt') || file.type === 'application/x-subrip' || file.type === 'text/plain') {
        processFile(file);
      } else {
        setErrorMsg('Vui lòng kéo đúng định dạng file phụ đề .srt');
      }
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className="bg-[#24292d] border border-white/10 rounded-2xl p-6 shadow-xl" id="srt-uploader-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
            <AlignLeft size={20} />
          </div>
          <div>
            <h2 className="text-md font-semibold text-white font-sans tracking-tight">
              File phụ đề (SRT Subtitles)
            </h2>
            <p className="text-xs text-white/40 mt-1">
              Phân tách các mốc thời gian để ghép nối hình ảnh tự động
            </p>
          </div>
        </div>
        {srtFile && subtitles.length > 0 && (
          <div className="flex items-center gap-1 bg-blue-500/15 text-blue-400 text-[11px] px-2.5 py-1 rounded-full border border-blue-500/25 font-mono">
            <CheckCircle size={14} />
            {subtitles.length} dòng HOÀN TẤT
          </div>
        )}
      </div>

      {!srtFile ? (
        <div
          className={`border border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
            dragActive
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-white/10 hover:border-blue-500/40 hover:bg-[#050505]/40'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          id="srt-dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            id="srt-file-input"
            className="hidden"
            accept=".srt,text/plain,application/x-subrip"
            onChange={handleFileChange}
          />
          <div className="w-12 h-12 rounded-full bg-[#050505] flex items-center justify-center border border-white/10 mb-3 text-white/40">
            <Upload size={22} className="text-blue-400" />
          </div>
          <p className="text-xs font-semibold text-white/90">
            Click hoặc kéo thả file phụ đề .srt vào đây
          </p>
          <p className="text-[11px] text-white/40 mt-1">
            Đảm bảo tệp tin có định dạng SubRip tiêu chuẩn (.srt)
          </p>
          {errorMsg && (
            <p className="text-xs text-rose-400 mt-3 max-w-sm font-sans bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
              {errorMsg}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-[#050505]/60 border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-full">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate pr-2">
                {srtFile.name}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5 font-mono">
                {subtitles.length} câu thoại • Mốc thời gian cao nhất:{' '}
                {subtitles.length > 0 ? formatTime(subtitles[subtitles.length - 1].endTime) : '0'}
              </p>
            </div>
          </div>

          <button
            onClick={onClearSubtitles}
            className="p-2 text-xs text-rose-400 hover:bg-[#050505] rounded-lg border border-white/5 transition-colors"
          >
            Thay đổi
          </button>
        </div>
      )}
    </div>
  );
}
