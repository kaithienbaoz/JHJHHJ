/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Music, CheckCircle, Play, Pause, RefreshCw } from 'lucide-react';

interface AudioLoaderProps {
  audioFile: File | null;
  audioDuration: number;
  onAudioLoaded: (file: File, duration: number) => void;
  onClearAudio: () => void;
}

export default function AudioLoader({ 
  audioFile, 
  audioDuration, 
  onAudioLoaded,
  onClearAudio 
}: AudioLoaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;

      const handleLoadedMetadata = () => {
        onAudioLoaded(audioFile, audio.duration);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);

      // Trigger standard manual detection fallback because sometimes loadedmetadata triggers too late
      audio.oncanplaythrough = () => {
        if (audio.duration && audioDuration === 0) {
          onAudioLoaded(audioFile, audio.duration);
        }
      };

      return () => {
        audio.pause();
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
    } else {
      setAudioUrl(null);
      audioRef.current = null;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [audioFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onAudioLoaded(files[0], 0); // main component will decode
    }
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
      if (file.type.startsWith('audio/') || file.name.endsWith('.mp3')) {
        onAudioLoaded(file, 0);
      }
    }
  };

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering container click
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-[#24292d] border border-white/10 rounded-2xl p-6 shadow-xl" id="audio-uploader-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
            <Music size={20} />
          </div>
          <div>
            <h2 className="text-md font-semibold text-white font-sans tracking-tight">
              File âm thanh (Audio)
            </h2>
            <p className="text-xs text-white/40 mt-1">
              Hỗ trợ file nhạc kịch, thoại thuyết minh định dạng MP3
            </p>
          </div>
        </div>
        {audioFile && (
          <div className="flex items-center gap-1 bg-blue-500/10 text-blue-404 text-[11px] px-2.5 py-1 rounded-full border border-blue-500/20 font-mono">
            <CheckCircle size={14} className="text-blue-400" />
            <span className="text-blue-400">READY</span>
          </div>
        )}
      </div>

      {!audioFile ? (
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
          id="audio-dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            id="audio-file-input"
            className="hidden"
            accept="audio/*,.mp3"
            onChange={handleFileChange}
          />
          <div className="w-12 h-12 rounded-full bg-[#050505] flex items-center justify-center border border-white/10 mb-3 text-white/40">
            <Music size={22} className="text-blue-400" />
          </div>
          <p className="text-xs font-semibold text-white/90">
            Click hoặc kéo thả file âm thanh vào đây
          </p>
          <p className="text-[11px] text-white/40 mt-1">
            Định dạng khuyên dùng: .mp3, .wav, .m4a
          </p>
        </div>
      ) : (
        <div className="bg-[#050505]/60 border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handlePlayToggle}
              className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-transform hover:scale-105 shrink-0 shadow-lg shadow-blue-600/20 flex items-center justify-center"
              title={isPlaying ? 'Tạm dừng nghe thử' : 'Nghe thử âm thanh'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate pr-2">
                {audioFile.name}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5 font-mono">
                {formatSize(audioFile.size)} • {audioDuration > 0 ? formatTime(audioDuration) : 'Đang tính...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Simple audio seeker representation */}
            {isPlaying && (
              <span className="text-[10px] text-blue-400 font-mono">
                {formatTime(currentTime)} / {formatTime(audioDuration)}
              </span>
            )}
            <button
              onClick={() => {
                onClearAudio();
                if (audioRef.current) audioRef.current.pause();
              }}
              className="p-2 text-xs text-rose-400 hover:bg-[#050505] rounded-lg border border-white/5 transition-colors"
            >
              Thay đổi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
