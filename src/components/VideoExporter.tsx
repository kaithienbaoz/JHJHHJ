/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { SubtitleBlock, CharacterImage, RenderConfig, SubtitlePreset } from '../types';
import { drawVideoFrame, preloadImage, getHighlightCustomText } from '../utils/videoRenderer';
import { playTypewriterClick, playBackgroundNoise, playRenderCompleteTick } from '../utils/audioSynthesizer';
import { isBehaviorActiveForBlock } from '../utils/behaviorHelper';
import { Download, Film, Loader2, Play, AlertTriangle, CheckCircle, RefreshCw, XCircle, Clock, Video, Cpu, Sparkles, Check, X } from 'lucide-react';
// @ts-ignore
import ysFixWebmDuration from 'fix-webm-duration';

interface VideoExporterProps {
  subtitles: SubtitleBlock[];
  images: CharacterImage[];
  videos?: CharacterImage[];
  audioFile: File | null;
  audioDuration: number;
  config: RenderConfig;
  bgMusicFiles?: Array<{ id: string; name: string; url: string; file: File; volume?: number }>;
  presets?: SubtitlePreset[];
}

export default function VideoExporter({
  subtitles,
  images,
  videos = [],
  audioFile,
  audioDuration,
  config,
  bgMusicFiles = [],
  presets = []
}: VideoExporterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    (window as any).isRenderingGlobal = isRendering;
    return () => {
      (window as any).isRenderingGlobal = false;
    };
  }, [isRendering]);
  const [progress, setProgress] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
  const [renderedFilename, setRenderedFilename] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [mimeTypeUsed, setMimeTypeUsed] = useState('');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [exportStats, setExportStats] = useState<{
    videoDuration: number;
    renderTime: number;
    fileSize: number;
    resolution: string;
    fps: number;
    format: string;
  } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const bgPlayNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerWorkerRef = useRef<Worker | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const videoCacheRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Determine total render time (including intro and outro if files exist)
  const getDuration = () => {
    const introTime = config.introVideoUrl ? config.introDuration : 0;
    const outroTime = config.outroVideoUrl ? config.outroDuration : 0;
    return introTime + audioDuration + outroTime;
  };
  const duration = getDuration();

  // Load cache of all images needed for export
  const loadImages = async () => {
    const cache = new Map<string, HTMLImageElement>();
    const itemsToPreload = images.map(img => ({ id: img.id, name: img.name, url: img.url }));
    if (config.logoUrl) {
      itemsToPreload.push({
        id: 'brand-logo',
        name: 'Brand Logo',
        url: config.logoUrl
      });
    }

    const preloads = itemsToPreload.map(async (img) => {
      try {
        const el = await preloadImage(img.url);
        cache.set(img.id, el);
      } catch (err) {
        console.error("Export preload failed:", img.name, err);
      }
    });
    await Promise.all(preloads);
    imageCacheRef.current = cache;
  };

  // Pre-load MP4 video layers if active for export compilation
  const loadVideos = () => {
    return new Promise<void>((resolve) => {
      const cache = videoCacheRef.current;
      cache.clear();
      
      let pending = 0;
      const checkResolve = () => {
        if (pending === 0) resolve();
      };

      if (config.introVideoUrl) {
        pending++;
        const video = document.createElement('video');
        video.src = config.introVideoUrl;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.onloadeddata = () => {
          pending--;
          checkResolve();
        };
        video.onerror = () => {
          pending--;
          checkResolve();
        };
        video.load();
        cache.set('intro', video);
      }

      if (config.outroVideoUrl) {
        pending++;
        const video = document.createElement('video');
        video.src = config.outroVideoUrl;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.onloadeddata = () => {
          pending--;
          checkResolve();
        };
        video.onerror = () => {
          pending--;
          checkResolve();
        };
        video.load();
        cache.set('outro', video);
      }

      // Load character videos
      videos.forEach((vid) => {
        pending++;
        const video = document.createElement('video');
        video.src = vid.url;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.onloadeddata = () => {
          pending--;
          checkResolve();
        };
        video.onerror = () => {
          pending--;
          checkResolve();
        };
        video.load();
        cache.set(vid.id, video);
      });

      checkResolve();
    });
  };

  // Decode audio data for recording destination
  const loadAudioBuffer = async (): Promise<AudioBuffer | null> => {
    if (!audioFile) return null;
    if (audioBufferRef.current) return audioBufferRef.current;
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const buffer = await audioFile.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buffer);
      audioBufferRef.current = decoded;
      return decoded;
    } catch (err) {
      console.error("Audio decode error in exporter:", err);
      throw new Error("Không thể xử lý âm thanh MP3. Hãy thử với file nhạc khác.");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupExport();
    };
  }, []);

  const cleanupExport = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerWorkerRef.current) {
      try { timerWorkerRef.current.terminate(); } catch {}
      timerWorkerRef.current = null;
    }
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch {}
      sourceNodeRef.current = null;
    }
    if (bgPlayNodeRef.current) {
      try { bgPlayNodeRef.current.stop(); } catch {}
      bgPlayNodeRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
      audioBufferRef.current = null;
    }
    if (canvasRef.current) {
      canvasRef.current.width = config.width;
      canvasRef.current.height = config.height;
    }
  };

  const handleStartRender = async () => {
    setIsRendering(true);
    setProgress(0);
    setFrameCount(0);
    setRenderedUrl(null);
    setRenderError(null);

    try {
      // Keep the active preset selected in the preview config
      let exportConfig = config;

      // Force export resolution to always be Full HD (1920x1080) as requested
      exportConfig = {
        ...exportConfig,
        width: 1920,
        height: 1080
      };

      // 1. Double checks
      if (images.length === 0) {
        throw new Error("Vui lòng tải ít nhất 1 thư mục ảnh nhân vật trước khi xuất video.");
      }
      if (subtitles.length === 0) {
        throw new Error("Không có phụ đề. Vui lòng tải dữ liệu file .srt lên.");
      }

      // 2. Pre-cache visual resources & parse Audio & Background Music
      await loadImages();
      await loadVideos();
      let audioBuf: AudioBuffer | null = null;
      if (audioFile) {
        audioBuf = await loadAudioBuffer();
      }

      let bgBuf: AudioBuffer | null = null;
      let selectedMusic: any = null;
      if (bgMusicFiles && bgMusicFiles.length > 0) {
        const randomIndex = Math.floor(Math.random() * bgMusicFiles.length);
        selectedMusic = bgMusicFiles[randomIndex];
        try {
          const exportCtxForDecoding = new (window.AudioContext || (window as any).webkitAudioContext)();
          const arrayBuf = await selectedMusic.file.arrayBuffer();
          bgBuf = await exportCtxForDecoding.decodeAudioData(arrayBuf);
          exportCtxForDecoding.close();
        } catch (err) {
          console.error("Failed to decode background music for export:", err);
        }
      }

      // 3. Prep canvas & capture Stream
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas viewport references are uninitialized.");
      
      // Programmatically resize the canvas elements to strictly render the video in 1920x1080 Full HD
      canvas.width = exportConfig.width;
      canvas.height = exportConfig.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not acquire 2D rendering buffer context.");

      const canvasStream = canvas.captureStream(exportConfig.fps);
      const combinedTracks: MediaStreamTrack[] = [canvasStream.getVideoTracks()[0]];

      // 4. Prep Audio Node Destination
      let recordCtx: AudioContext | null = null;
      let destNode: MediaStreamAudioDestinationNode | null = null;
      let mainGainNode: GainNode | null = null;
      
      const hasAudio = !!audioBuf || !!bgBuf || !!exportConfig.introVideoUrl || !!exportConfig.outroVideoUrl;
      
      if (hasAudio) {
        recordCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        destNode = recordCtx.createMediaStreamDestination();
        
        if (audioBuf) {
          const playNode = recordCtx.createBufferSource();
          playNode.buffer = audioBuf;
          
          const mainGain = recordCtx.createGain();
          const mainVol = exportConfig.mainAudioVolume !== undefined ? exportConfig.mainAudioVolume : 200;
          mainGain.gain.value = mainVol / 100;
          mainGainNode = mainGain;
          
          playNode.connect(mainGain);
          mainGain.connect(destNode);
          sourceNodeRef.current = playNode;
        }

        if (bgBuf) {
          const bgSource = recordCtx.createBufferSource();
          bgSource.buffer = bgBuf;
          bgSource.loop = true;

          const bgGain = recordCtx.createGain();
          const trackPct = selectedMusic && selectedMusic.volume !== undefined ? selectedMusic.volume : 100;
          bgGain.gain.value = 0.20 * (trackPct / 100); // soft volume level adjusted by track volume settings if set
          
          bgSource.connect(bgGain);
          bgGain.connect(destNode);
          bgPlayNodeRef.current = bgSource;
        }

        // Connect intro and outro video audio tracks to the recording stream if they exist
        if (exportConfig.introVideoUrl) {
          const introVideo = videoCacheRef.current.get('intro');
          if (introVideo) {
            try {
              introVideo.muted = false; // Unmute so Web Audio can stream it
              const introSource = recordCtx.createMediaElementSource(introVideo);
              introSource.connect(destNode);
            } catch (err) {
              console.error("Failed to connect intro video audio element source:", err);
            }
          }
        }

        if (exportConfig.outroVideoUrl) {
          const outroVideo = videoCacheRef.current.get('outro');
          if (outroVideo) {
            try {
              outroVideo.muted = false; // Unmute so Web Audio can stream it
              const outroSource = recordCtx.createMediaElementSource(outroVideo);
              outroSource.connect(destNode);
            } catch (err) {
              console.error("Failed to connect outro video audio element source:", err);
            }
          }
        }
        
        combinedTracks.push(destNode.stream.getAudioTracks()[0]);
      }

      const combinedStream = new MediaStream(combinedTracks);

      // 5. Build Media Recorder
      const preferredMimes = [
        'video/mp4;codecs=h264',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      
      let selectedMime = '';
      for (const mime of preferredMimes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      if (!selectedMime) {
        throw new Error("Trình duyệt không hỗ trợ các định dạng mã hóa video hơp lệ.");
      }
      setMimeTypeUsed(selectedMime);

      const bitrateValue = 8000000; // Original high quality without compression (8 Mbps)

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: bitrateValue
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const startTimeStamp = Date.now();
      let typewriterState: { blockId: string | number; typedCount: number } = { blockId: '', typedCount: 0 };
      let drawCircleClickState: { blockId: string | number; played: boolean } = { blockId: '', played: false };
      let playedNoiseTracker: { [key: string]: boolean } = {};

      recorder.onstop = () => {
        const initialBlob = new Blob(chunks, { type: selectedMime.split(';')[0] });
        const extension = getExtensionForMime(selectedMime);

        const processFinalBlob = (blobToSave: Blob) => {
          // Play tick tick sound upon completion
          playRenderCompleteTick(audioContextRef.current);

          const downloadUrl = URL.createObjectURL(blobToSave);
          setRenderedUrl(downloadUrl);
          setIsRendering(false);
          cleanupExport();

          const now = new Date();
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          const filename = `DONE_${hh}${mm}.${extension}`;
          setRenderedFilename(filename);

          // Tự động tải xuống video khi render xong
          try {
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch (downloadErr) {
            console.error("Auto-download failed:", downloadErr);
          }

          // Tính toán thông số thời gian biên dịch
          const endTimeStamp = Date.now();
          const renderTimeMs = endTimeStamp - startTimeStamp;

          setExportStats({
            videoDuration: duration,
            renderTime: renderTimeMs,
            fileSize: blobToSave.size,
            resolution: `${exportConfig.width}x${exportConfig.height}`,
            fps: exportConfig.fps,
            format: extension.toUpperCase()
          });
          setShowStatsModal(true);
        };

        if (extension === 'webm') {
          // Fix WebM metadata duration
          const durationInMs = duration * 1000;
          try {
            const fixFn = typeof ysFixWebmDuration === 'function' ? ysFixWebmDuration : (ysFixWebmDuration as any).default;
            if (typeof fixFn === 'function') {
              fixFn(initialBlob, durationInMs, (fixedBlob: Blob) => {
                processFinalBlob(fixedBlob || initialBlob);
              });
            } else {
              processFinalBlob(initialBlob);
            }
          } catch (err) {
            console.error("Failed to fix WebM duration metadata:", err);
            processFinalBlob(initialBlob);
          }
        } else {
          processFinalBlob(initialBlob);
        }
      };

      // 6. Ticking rendering execution sequences
      const totalFrames = Math.ceil(duration * exportConfig.fps);
      let framesRendered = 0;
      let lastTime = 0;
      
      // Start recording triggers
      recorder.start();
      if (bgPlayNodeRef.current && recordCtx) {
        bgPlayNodeRef.current.start(recordCtx.currentTime);
      }
      if (sourceNodeRef.current && recordCtx) {
        sourceNodeRef.current.start(recordCtx.currentTime + exportConfig.introDuration);
      }

      const startPerformanceTime = performance.now();
      mediaRecorderRef.current = recorder;

      // Create Web Worker to execute non-throttled background timer delays
      const workerCode = `
        self.onmessage = function(e) {
          if (e.data.action === 'delay') {
            setTimeout(() => {
              self.postMessage('tick');
            }, e.data.ms);
          }
        };
      `;
      const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);
      const timerWorker = new Worker(workerUrl);
      timerWorkerRef.current = timerWorker;

      timerWorker.onmessage = (e) => {
        if (e.data === 'tick') {
          runRenderLoop();
        }
      };

      const seekVideoToTime = (video: HTMLVideoElement, targetTime: number): Promise<void> => {
        return new Promise((resolve) => {
          if (Math.abs(video.currentTime - targetTime) < 0.01) {
            resolve();
            return;
          }

          let resolved = false;
          const onSeeked = () => {
            if (resolved) return;
            resolved = true;
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);
            resolve();
          };

          const onError = () => {
            if (resolved) return;
            resolved = true;
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);
            resolve();
          };

          video.addEventListener('seeked', onSeeked);
          video.addEventListener('error', onError);

          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onError);
              resolve();
            }
          }, 150); // wait max 150ms

          video.currentTime = targetTime;
        });
      };

      const runRenderLoop = async () => {
        const elapsedRealTime = (performance.now() - startPerformanceTime) / 1000;

        if (elapsedRealTime >= duration) {
          // Pause and stop videos
          const introVideo = videoCacheRef.current.get('intro');
          if (introVideo && !introVideo.paused) introVideo.pause();
          const outroVideo = videoCacheRef.current.get('outro');
          if (outroVideo && !outroVideo.paused) outroVideo.pause();

          drawVideoFrame(
            canvas,
            ctx,
            duration,
            subtitles,
            images,
            imageCacheRef.current,
            exportConfig,
            duration,
            videoCacheRef.current,
            presets,
            false,
            videos
          );

          // Finished rendering sequence
          if (recorder.state === 'recording') {
            recorder.stop();
          }
          return;
        }

        const currentPlaybackTime = elapsedRealTime;

        // Ensure correct video frames are seeked and loaded before drawing
        const introVideo = videoCacheRef.current.get('intro');
        const outroVideo = videoCacheRef.current.get('outro');

        if (exportConfig.introVideoUrl && currentPlaybackTime < exportConfig.introDuration) {
          if (introVideo) {
            introVideo.muted = false; // Ensure unmuted for Web Audio stream capture
            if (introVideo.paused) {
              introVideo.play().catch(() => {});
            }
            if (Math.abs(introVideo.currentTime - currentPlaybackTime) > 1.2) {
              introVideo.currentTime = currentPlaybackTime;
            }
          }
          if (outroVideo && !outroVideo.paused) {
            try { outroVideo.pause(); } catch {}
          }
        } else if (exportConfig.outroVideoUrl && currentPlaybackTime >= (duration - exportConfig.outroDuration)) {
          const outroOffset = currentPlaybackTime - (duration - exportConfig.outroDuration);
          if (outroVideo) {
            outroVideo.muted = false; // Ensure unmuted for Web Audio stream capture
            if (outroVideo.paused) {
              outroVideo.play().catch(() => {});
            }
            if (Math.abs(outroVideo.currentTime - outroOffset) > 1.2) {
              outroVideo.currentTime = outroOffset;
            }
          }
          if (introVideo && !introVideo.paused) {
            try { introVideo.pause(); } catch {}
          }
        } else {
          if (introVideo && !introVideo.paused) {
            try { introVideo.pause(); } catch {}
          }
          if (outroVideo && !outroVideo.paused) {
            try { outroVideo.pause(); } catch {}
          }
        }

        // Check for active character videos and seek them frame-perfectly before drawing onto canvas
        const contentAdjustedTime = currentPlaybackTime - exportConfig.introDuration;
        if (contentAdjustedTime >= 0 && contentAdjustedTime < (duration - exportConfig.introDuration - exportConfig.outroDuration)) {
          const activeBlock = subtitles.find(s => contentAdjustedTime >= s.startTime && contentAdjustedTime <= s.endTime);
          if (activeBlock) {
            const associatedIds = new Set<string>();
            if (activeBlock.matchedLeftImageId) associatedIds.add(activeBlock.matchedLeftImageId);
            if (activeBlock.matchedRightImageId) associatedIds.add(activeBlock.matchedRightImageId);
            if (activeBlock.matchedImageIds) {
              activeBlock.matchedImageIds.forEach(id => {
                if (id) associatedIds.add(id);
              });
            }
            
            const activeBlockIdx = subtitles.indexOf(activeBlock);
            const prevBlock = activeBlockIdx > 0 ? subtitles[activeBlockIdx - 1] : null;
            if (prevBlock) {
              const transDur = exportConfig.transitionDuration || 0.5;
              if (contentAdjustedTime < prevBlock.endTime + transDur) {
                if (prevBlock.matchedLeftImageId) associatedIds.add(prevBlock.matchedLeftImageId);
                if (prevBlock.matchedRightImageId) associatedIds.add(prevBlock.matchedRightImageId);
                if (prevBlock.matchedImageIds) {
                  prevBlock.matchedImageIds.forEach(id => {
                    if (id) associatedIds.add(id);
                  });
                }
              }
            }

            for (const vidId of associatedIds) {
              const video = videoCacheRef.current.get(vidId);
              if (video) {
                const belongsToActive = activeBlock.matchedLeftImageId === vidId ||
                  activeBlock.matchedRightImageId === vidId ||
                  activeBlock.matchedImageIds?.includes(vidId);
                
                const blockStart = belongsToActive ? activeBlock.startTime : (prevBlock ? prevBlock.startTime : activeBlock.startTime);
                const elapsed = contentAdjustedTime - blockStart;
                const videoDuration = video.duration || 5;
                const targetTime = Math.max(0, elapsed) % videoDuration;
                
                video.muted = true;
                if (video.paused) {
                  video.play().catch(() => {});
                }
                
                if (Math.abs(video.currentTime - targetTime) > 1.2) {
                  video.currentTime = targetTime;
                }
              }
            }
          }
        }

        // Render visual frame
        drawVideoFrame(
          canvas,
          ctx,
          currentPlaybackTime,
          subtitles,
          images,
          imageCacheRef.current,
          exportConfig,
          duration,
          videoCacheRef.current,
          presets,
          true,
          videos
        );

        // Dynamic volume ducking for typing behavior 2 (Human Typewriter) & 12 (Touch Typing)
        const isTouchTypingActiveExport = !!exportConfig.enableTouchTyping;
        let targetVolumeFactor = 1.0;
        if (subtitles && subtitles.length > 0 && recordCtx && destNode) {
          const introTime = exportConfig.introVideoUrl ? exportConfig.introDuration : 0;
          const adjustedTime = Math.max(0, currentPlaybackTime - introTime);
          const maxAudioEnd = introTime + audioDuration;
          if (currentPlaybackTime >= introTime && currentPlaybackTime <= maxAudioEnd) {
            const activeBlock = subtitles.find(s => adjustedTime >= s.startTime && adjustedTime <= s.endTime);
            if (activeBlock) {
              const blockIdx = subtitles.indexOf(activeBlock);
              const blockNum = blockIdx + 1;

              const isHumanTypewriterActiveExport = !!(exportConfig.enableHumanTypewriter && isBehaviorActiveForBlock(blockNum, exportConfig.humanTypewriterBlocks, subtitles, 'typewriter', exportConfig.behaviorSeed));
              const isTouchActiveExport = !!(isTouchTypingActiveExport && isBehaviorActiveForBlock(blockNum, exportConfig.touchTypingBlocks, subtitles, 'touch_typing', exportConfig.behaviorSeed));

              if (isHumanTypewriterActiveExport || isTouchActiveExport) {
                const blockDur = Math.max(0.5, activeBlock.endTime - activeBlock.startTime);
                const typewriterDuration = blockDur * (2 / 3);
                const bElapsed = adjustedTime - activeBlock.startTime;
                if (bElapsed >= 0 && bElapsed <= typewriterDuration) {
                  targetVolumeFactor = 0.8; // dim by 20%
                }
              }
            }
          }
        }

        if (mainGainNode && recordCtx) {
          const mainVol = exportConfig.mainAudioVolume !== undefined ? exportConfig.mainAudioVolume : 200;
          mainGainNode.gain.setValueAtTime((mainVol / 100) * targetVolumeFactor, recordCtx.currentTime);
        }

        // Typewriter & Touch typing Sound Simulation during Export
        if ((exportConfig.enableHumanTypewriter || isTouchTypingActiveExport) && subtitles && subtitles.length > 0 && recordCtx && destNode) {
          const introTime = exportConfig.introVideoUrl ? exportConfig.introDuration : 0;
          const adjustedTime = Math.max(0, currentPlaybackTime - introTime);
          const maxAudioEnd = introTime + audioDuration;
          if (currentPlaybackTime >= introTime && currentPlaybackTime <= maxAudioEnd) {
            const activeBlock = subtitles.find(s => adjustedTime >= s.startTime && adjustedTime <= s.endTime);
            if (activeBlock) {
              const blockIdx = subtitles.indexOf(activeBlock);
              const blockNum = blockIdx + 1;

              const isHumanTypewriterActiveExport = !!(exportConfig.enableHumanTypewriter && isBehaviorActiveForBlock(blockNum, exportConfig.humanTypewriterBlocks, subtitles, 'typewriter', exportConfig.behaviorSeed));
              const isTouchActiveExport = !!(isTouchTypingActiveExport && isBehaviorActiveForBlock(blockNum, exportConfig.touchTypingBlocks, subtitles, 'touch_typing', exportConfig.behaviorSeed));

              if (isHumanTypewriterActiveExport || isTouchActiveExport) {
                const bElapsed = adjustedTime - activeBlock.startTime;
                const blockDur = Math.max(0.5, activeBlock.endTime - activeBlock.startTime);
                const typewriterDuration = blockDur * (2 / 3);
                const typeP = Math.min(1, bElapsed / typewriterDuration);
                const charCount = Math.floor(activeBlock.text.length * typeP);

                const soundAllowedExport = isTouchActiveExport ? (exportConfig.enableTouchTypingSound !== false) : true;
                const activeVolExport = isTouchActiveExport
                  ? (exportConfig.touchTypingVolume !== undefined ? exportConfig.touchTypingVolume : 40)
                  : (exportConfig.typewriterVolume !== undefined ? exportConfig.typewriterVolume : 30);

                if (typewriterState.blockId !== activeBlock.id) {
                   typewriterState = { blockId: activeBlock.id, typedCount: charCount };
                   if (charCount > 0 && soundAllowedExport) {
                     playTypewriterClick(recordCtx, destNode, activeVolExport);
                   }
                } else if (charCount > typewriterState.typedCount) {
                   typewriterState.typedCount = charCount;
                   if (soundAllowedExport) {
                     playTypewriterClick(recordCtx, destNode, activeVolExport);
                   }
                }
              }
            }
          }
        }

        // Draw Circle/X Mouse Pointer Click sound simulation during Export
        if (exportConfig.enableDrawCircle && subtitles && subtitles.length > 0 && recordCtx && destNode) {
          const introTime = exportConfig.introVideoUrl ? exportConfig.introDuration : 0;
          const adjustedTime = Math.max(0, currentPlaybackTime - introTime);
          const maxAudioEnd = introTime + audioDuration;
          if (currentPlaybackTime >= introTime && currentPlaybackTime <= maxAudioEnd) {
            const activeBlock = subtitles.find(s => adjustedTime >= s.startTime && adjustedTime <= s.endTime);
            if (activeBlock) {
              const blockIdx = subtitles.indexOf(activeBlock);
              const blockNum = blockIdx + 1;
              const isDrawCircleActive = exportConfig.drawCircleBlocks && isBehaviorActiveForBlock(blockNum, exportConfig.drawCircleBlocks, subtitles, 'draw_circle', exportConfig.behaviorSeed);
              const isDrawXActive = exportConfig.drawXBlocks && isBehaviorActiveForBlock(blockNum, exportConfig.drawXBlocks, subtitles, 'draw_x', exportConfig.behaviorSeed);
              
              if (isDrawCircleActive || isDrawXActive) {
                const elapsed = adjustedTime - activeBlock.startTime;
                const blockDuration = Math.max(0.5, activeBlock.endTime - activeBlock.startTime);
                const progress = Math.max(0, Math.min(1.0, elapsed / blockDuration));
                
                if (progress >= 0.35) {
                  if (drawCircleClickState.blockId !== activeBlock.id || !drawCircleClickState.played) {
                    drawCircleClickState = { blockId: activeBlock.id, played: true };
                    playBackgroundNoise('mouse_click', recordCtx, destNode, 180);
                  }
                } else {
                  if (drawCircleClickState.blockId === activeBlock.id) {
                    drawCircleClickState.played = false;
                  }
                }
              }
            }
          }
        }

        // Background Noise Simulation during Export
        if (exportConfig.enableBackgroundNoise && subtitles && subtitles.length > 0 && recordCtx && destNode) {
          const introTime = exportConfig.introVideoUrl ? exportConfig.introDuration : 0;
          const adjustedTime = Math.max(0, currentPlaybackTime - introTime);
          const maxAudioEnd = introTime + audioDuration;
          if (currentPlaybackTime >= introTime && currentPlaybackTime <= maxAudioEnd) {
            const activeBlock = subtitles.find(s => adjustedTime >= s.startTime && adjustedTime <= s.endTime);
            if (activeBlock) {
              const blockIdx = subtitles.indexOf(activeBlock);
              const blockNum = blockIdx + 1;
              const noises = exportConfig.backgroundNoises || [];
              noises.forEach((noiseItem) => {
                if (noiseItem.segments) {
                  if (isBehaviorActiveForBlock(blockNum, noiseItem.segments, subtitles, 'noise_' + noiseItem.id, exportConfig.behaviorSeed)) {
                    const trackingKey = `${activeBlock.id}_${noiseItem.id}`;
                    if (!playedNoiseTracker[trackingKey]) {
                      playedNoiseTracker[trackingKey] = true;
                      playBackgroundNoise(noiseItem.id, recordCtx, destNode, noiseItem.volume);
                    }
                  }
                }
              });
            }
          }
        }

        framesRendered++;
        setFrameCount(framesRendered);
        setProgress(Math.min(100, Math.round((currentPlaybackTime / duration) * 100)));

        // Sleep/delay target milliseconds to match FPS (e.g. 1000/30 = ~33ms)
        const delay = 1000 / exportConfig.fps;
        
        // Schedule next segment recursively through background worker or fallback timer
        if (timerWorkerRef.current) {
          timerWorkerRef.current.postMessage({ action: 'delay', ms: delay });
        } else {
          setTimeout(runRenderLoop, delay);
        }
      };

      // Kickoff loop!
      runRenderLoop();

    } catch (err: any) {
      console.error(err);
      setRenderError(err.message || 'Lỗi không xác định trong quá trình xuất video.');
      setIsRendering(false);
      cleanupExport();
    }
  };

  const handleCancelRender = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    setIsRendering(false);
    setProgress(0);
    cleanupExport();
  };

  const getExtensionForMime = (mime: string) => {
    if (mime.includes('mp4')) return 'mp4';
    return 'webm';
  };

  const formatSeconds = (sec: number) => {
    const rounded = Math.round(sec);
    const m = Math.floor(rounded / 60);
    const s = rounded % 60;
    if (m > 0) {
      return `${m} phút ${s} giây`;
    }
    return `${s} giây`;
  };

  const formatMilliseconds = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m > 0) {
      return `${m} phút ${s} giây`;
    }
    return `${s} giây`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-[#0E0E11] border border-white/10 rounded-2xl p-6 shadow-xl" id="video-exporter-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
          <Film size={20} />
        </div>
        <div>
          <h2 className="text-md font-semibold text-white font-sans tracking-tight">
            Xuất Video Thành Phẩm
          </h2>
          <p className="text-xs text-white/40 mt-0.5">
            Ghép nối ảnh, phụ đề và file âm thanh thành tệp video duy nhất hoàn chỉnh
          </p>
        </div>
      </div>

      <div className="bg-[#050505]/45 border border-white/10 rounded-xl p-5 mb-6 flex flex-col items-center justify-center">
        {/* Hidden Canvas Used in background compile operations */}
        <div className="relative border border-white/10 rounded-xl overflow-hidden bg-[#050505] mb-4 max-w-[200px] aspect-[64/72]">
          <canvas
            ref={canvasRef}
            width={config.width}
            height={config.height}
            className="w-full h-full object-contain"
          />
          {isRendering && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-2">
              <RefreshCw size={18} className="text-blue-400 animate-spin mb-1" />
              <span className="text-[10px] text-white/70 font-medium">Đang compile...</span>
            </div>
          )}
        </div>

        {/* Informational settings lists */}
        <div className="w-full text-xs text-white/40 space-y-2 mb-4 max-w-sm">
          <div className="flex justify-between border-b border-white/5 pb-1">
            <span>Kích thước hình ảnh xuất:</span>
            <span className="text-white font-mono font-medium">{config.width}x{config.height} px</span>
          </div>

          <div className="flex justify-between border-b border-white/5 pb-1">
            <span>Độ dài video dự tính:</span>
            <span className="text-white font-mono font-medium">{formatSeconds(duration)}</span>
          </div>
          <div className="flex justify-between">
            <span>Phương thức giải mã âm thanh:</span>
            <span className={`font-medium ${audioFile ? 'text-blue-400' : 'text-amber-400'}`}>
              {audioFile ? 'Đồng bộ hóa mượt MP3' : 'Video tĩnh (Không âm thanh)'}
            </span>
          </div>
        </div>

        {/* Compile buttons and rendering stats overlays */}

        {!isRendering && !renderedUrl && (
          <button
            onClick={handleStartRender}
            disabled={images.length === 0 || subtitles.length === 0}
            className="w-full max-w-xs py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/15 disabled:opacity-45 disabled:pointer-events-none"
            id="start-export-btn"
          >
            <Film size={15} /> Bấm để Tạo Video Ngay
          </button>
        )}

        {isRendering && (
          <div className="w-full max-w-xs text-center space-y-3">
            <div className="flex justify-between text-xs text-white/70">
              <span className="font-medium">Tiến trình kết hợp:</span>
              <span className="font-mono font-bold text-blue-400">{progress}%</span>
            </div>
            
            {/* Linear progress bar */}
            <div className="w-full bg-[#050505] rounded-full h-2 overflow-hidden border border-white/10">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-[10px] text-white/30 font-mono">
              Đã xử lý: {frameCount} frames • FPS: {config.fps}
            </p>

            <button
              onClick={handleCancelRender}
              className="px-4 py-1.5 border border-rose-500/20 text-rose-400 text-xs rounded-lg hover:bg-rose-500/15 duration-150"
            >
              Hủy bỏ xuất
            </button>
          </div>
        )}

        {/* Completed files display and links */}
        {renderedUrl && (
          <div className="w-full max-w-xs text-center space-y-4 bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl">
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-bold">
              <CheckCircle size={16} />
              <span>Ghi hình hoàn tất!</span>
            </div>
            <p className="text-xs text-white/50">
              Video đã được tạo và chứa mã hóa khớp với định dạng: <code className="text-[10px] text-white bg-black px-1.5 py-0.5 rounded font-mono border border-white/10">{mimeTypeUsed}</code>
            </p>

            <div className="flex flex-col gap-2">
              <a
                href={renderedUrl}
                download={renderedFilename || `DONE.${getExtensionForMime(mimeTypeUsed)}`}
                className="py-2.5 w-full bg-emerald-500 hover:bg-emerald-450 text-[#050505] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow"
              >
                <Download size={14} /> Tải Video Về Máy
              </a>

              <button
                onClick={() => {
                  setRenderedUrl(null);
                  setProgress(0);
                }}
                className="py-1.5 w-full text-[11px] text-white/50 hover:text-white border border-white/10 rounded-lg transition-colors"
              >
                Tạo Video Khác
              </button>
            </div>
          </div>
        )}

        {renderError && (
          <div className="w-full max-w-xs mt-3 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-xs text-rose-400 flex gap-2 items-start text-left">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Quá trình xuất thất bại:</p>
              <p className="text-[10px] mt-0.5 opacity-90">{renderError}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 text-xs text-white/50 font-sans space-y-1">
        <span className="font-semibold text-white/80">💡 Lưu ý quan trọng khi xuất:</span>
        <ul className="list-disc pl-4 space-y-1 text-white/40 mt-1">
          <li><strong>Thời gian render & Hiệu ứng:</strong> Video càng nhiều và càng phức tạp các hiệu ứng nền hoạt họa thì quá trình render sẽ <strong>càng lâu hơn</strong>. Hãy hạn chế hoặc tránh lạm dụng các hiệu ứng động dồn dập (như mưa rơi, tuyết rơi...) trong suốt toàn bộ video nếu muốn tối ưu hóa tốc độ tải xuống.</li>
          <li>Quá trình biên dịch video diễn ra <span className="text-white/60">hoàn toàn trên trình duyệt của bạn</span>, không đẩy bất kỳ dữ liệu nào của bạn lên đám mây.</li>
          <li>Hệ thống đã hỗ trợ <span className="text-blue-400 font-semibold">xuất video chạy ngầm (Background Worker Code)</span>. Bạn có thể thoải mái chuyển tab hoặc làm việc khác, video vẫn được tiếp tục vẽ và xuất bình thường!</li>
        </ul>
      </div>

      {/* Modal báo cáo thông số sau khi biên dịch hoàn tất */}
      {showStatsModal && exportStats && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="stats-modal-overlay">
          <div className="bg-[#121216] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Thông báo xuất video</span>
              </div>
              <button 
                onClick={() => setShowStatsModal(false)}
                className="p-1 border border-white/10 text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                id="close-stats-btn"
              >
                <X size={14} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4">
              <div className="flex flex-col items-center text-center space-y-1.5">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-1">
                  <CheckCircle size={28} />
                </div>
                <h3 className="text-sm font-semibold text-white">XUẤT VIDEO THÀNH CÔNG!</h3>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Video dài <span className="text-emerald-400 font-semibold">{formatSeconds(exportStats.videoDuration)}</span> đã được render thành công trong <span className="text-blue-400 font-semibold">{formatMilliseconds(exportStats.renderTime)}</span> và đang được <span className="text-emerald-400 font-semibold">tải xuống tự động</span> về máy của bạn!
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-[#18181F] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/40 mb-1">
                    <Video size={12} className="text-blue-400" />
                    <span>Thời lượng video</span>
                  </div>
                  <span className="text-[11px] font-bold text-white font-mono">{formatSeconds(exportStats.videoDuration)}</span>
                </div>

                <div className="bg-[#18181F] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/40 mb-1">
                    <Clock size={12} className="text-pink-400" />
                    <span>Thời gian render</span>
                  </div>
                  <span className="text-[11px] font-bold text-white font-mono">{formatMilliseconds(exportStats.renderTime)}</span>
                </div>

                <div className="bg-[#18181F] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/40 mb-1">
                    <Cpu size={12} className="text-amber-400" />
                    <span>Độ phân giải & FPS</span>
                  </div>
                  <span className="text-[11px] font-semibold text-white font-mono leading-none">
                    {exportStats.resolution} • {exportStats.fps} FPS
                  </span>
                </div>

                <div className="bg-[#18181F] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/40 mb-1">
                    <Download size={12} className="text-purple-400" />
                    <span>Dung lượng</span>
                  </div>
                  <span className="text-[11px] font-semibold text-white font-mono">
                    {formatBytes(exportStats.fileSize)} ({exportStats.format})
                  </span>
                </div>
              </div>

              {/* V-SYNC Technology Explanation Box */}
              <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3.5 space-y-2 text-left">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-400 uppercase tracking-wide">
                  <Cpu size={13} />
                  <span>Công nghệ Ghi hình Độc quyền V-SYNC</span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Phần mềm <strong>V-SYNC</strong> sử dụng công nghệ ghi hình luồng cao cấp <strong>HTML5 Canvas CaptureStream</strong> kết hợp đồng bộ hóa tần số âm thanh qua <strong>Web Audio API (AudioDestinationNode)</strong> trực tiếp trên trình duyệt web.
                </p>
                <div className="border-t border-white/5 pt-2 text-[10.5px] text-white/50 leading-relaxed">
                  Bằng cách thực hiện render hoạt ảnh từng khung hình và ghi trực tiếp luồng phát thực tế, <strong>tốc độ render luôn là tốc độ phát thực tế (real-time speed)</strong> của trình duyệt, bảo đảm tính khớp khóa âm thanh hoàn hảo và mượt mà tối đa!
                </div>
              </div>

              {/* Render Ratio */}
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
                <span className="text-white/50">Tốc độ render trung bình:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {exportStats.renderTime > 0 
                    ? `${(exportStats.videoDuration / (exportStats.renderTime / 1000)).toFixed(1)}x tốc độ thực`
                    : 'Siêu tốc'}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3 bg-[#18181F] border-t border-white/5 flex gap-2">
              <button
                onClick={() => setShowStatsModal(false)}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-450 text-[#050505] font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-500/10"
              >
                Đồng ý & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
