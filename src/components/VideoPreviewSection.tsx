/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Square, Sliders, Volume2, Maximize2, AlertCircle, ToggleLeft, ToggleRight, RefreshCw, Sparkles } from 'lucide-react';
import { SubtitleBlock, CharacterImage, RenderConfig, SubtitlePreset } from '../types';
import { drawVideoFrame, preloadImage, getHighlightCustomText } from '../utils/videoRenderer';
import { playTypewriterClick, playBackgroundNoise } from '../utils/audioSynthesizer';
import { isBehaviorActiveForBlock } from '../utils/behaviorHelper';
import { safeLocalStorage } from '../utils/safeLocalStorage';
import { SUBTITLE_FONTS } from './SettingsModal';

interface VideoPreviewSectionProps {
  subtitles: SubtitleBlock[];
  images: CharacterImage[];
  videos?: CharacterImage[];
  audioFile: File | null;
  audioDuration: number;
  config: RenderConfig;
  onConfigChange: (newConfig: RenderConfig) => void;
  previewTime: number; // For sync play coordinates
  onPreviewTimeSelect: (time: number) => void;
  bgMusicFiles?: Array<{ id: string; name: string; url: string; file: File; volume?: number }>;
  presets?: SubtitlePreset[];
  onUpdatePresets?: (newPresets: SubtitlePreset[]) => void;
}

export default function VideoPreviewSection({
  subtitles,
  images,
  videos = [],
  audioFile,
  audioDuration,
  config,
  onConfigChange,
  previewTime,
  onPreviewTimeSelect,
  bgMusicFiles = [],
  presets = [],
  onUpdatePresets
}: VideoPreviewSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const playNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const mainGainNodeRef = useRef<GainNode | null>(null);
  const bgPlayNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const bgAudioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  const startAudioNodeRef = useRef<((offset: number) => Promise<void>) | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [showConfig, setShowConfig] = useState(true);
  const [imageCache, setImageCache] = useState<Map<string, HTMLImageElement>>(new Map());
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [activeBgMusicId, setActiveBgMusicId] = useState<string | null>(null);
  const [isAudioDecoded, setIsAudioDecoded] = useState(false);
  
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const typewriterStateRef = useRef<{ blockId: number | string; typedCount: number }>({ blockId: '', typedCount: 0 });
  const drawCircleClickStateRef = useRef<{ blockId: number | string; played: boolean }>({ blockId: '', played: false });
  const playedNoiseTrackerRef = useRef<{ [key: string]: boolean }>({});

  // Derived config for preview that skips intro/outro sequences
  const previewConfig = React.useMemo(() => {
    return {
      ...config,
      introDuration: 0,
      outroDuration: 0,
      introVideoUrl: undefined,
      outroVideoUrl: undefined
    };
  }, [config]);

  // Parse total duration based on presence of intro/outro videos and audio duration
  const getMaxDuration = () => {
    const introTime = previewConfig.introVideoUrl ? previewConfig.introDuration : 0;
    const outroTime = previewConfig.outroVideoUrl ? previewConfig.outroDuration : 0;
    return introTime + audioDuration + outroTime;
  };

  const duration = getMaxDuration();

  const handleRandomizeSubtitlesStyle = () => {
    if (!presets || presets.length === 0) return;
    
    // 1. Choose a random preset/room style from the ones saved
    const randomPresetIndex = Math.floor(Math.random() * presets.length);
    const selectedPreset = presets[randomPresetIndex];
    
    // 2. Retrieve saved effects to see which groups A, B, C, D have saved designs
    let availableGroups = ['A', 'B', 'C', 'D'];
    try {
      const stored = safeLocalStorage.getItem('vsync_saved_effects');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          availableGroups = ['A', 'B', 'C', 'D'].filter(group => 
            parsed.some((eff: any) => (eff.group || 'A') === group)
          );
        }
      }
    } catch (e) {
      console.error("Lỗi đọc danh sách hiệu ứng lưu trữ:", e);
    }
    const finalGroups = availableGroups.length > 0 ? availableGroups : ['A'];
    const randomGroup = finalGroups[Math.floor(Math.random() * finalGroups.length)];
    
    console.log("Randomizing! Selected saved preset: ", selectedPreset.name, "and selected template group: ", randomGroup);
    
    // Select this preset and effect group as active in render config
    onConfigChange({
      ...config,
      activePresetId: selectedPreset.id,
      activeEffectGroup: randomGroup
    });
  };

  const videoCacheRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Buffer and pre-load active MP4 video assets for Intro / Outro phases
  useEffect(() => {
    const cache = videoCacheRef.current;
    
    if (previewConfig.introVideoUrl) {
      if (!cache.has('intro') || cache.get('intro')?.src !== previewConfig.introVideoUrl) {
        const video = document.createElement('video');
        video.src = previewConfig.introVideoUrl;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.load();
        cache.set('intro', video);
      }
    } else {
      cache.delete('intro');
    }

    if (previewConfig.outroVideoUrl) {
      if (!cache.has('outro') || cache.get('outro')?.src !== previewConfig.outroVideoUrl) {
        const video = document.createElement('video');
        video.src = previewConfig.outroVideoUrl;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.load();
        cache.set('outro', video);
      }
    } else {
      cache.delete('outro');
    }
  }, [previewConfig.introVideoUrl, previewConfig.outroVideoUrl]);

  // Load and cache all active character videos in videoCacheRef
  useEffect(() => {
    const cache = videoCacheRef.current;
    
    // Clear old character videos that are no longer in the videos list
    const activeVideoIds = new Set(videos.map(v => v.id));
    for (const key of cache.keys()) {
      if (key !== 'intro' && key !== 'outro' && !activeVideoIds.has(key)) {
        cache.delete(key);
      }
    }

    // Load new character videos
    videos.forEach((vid) => {
      if (!cache.has(vid.id)) {
        try {
          const video = document.createElement('video');
          video.src = vid.url;
          video.muted = true;
          video.playsInline = true;
          video.crossOrigin = 'anonymous';
          video.load();
          cache.set(vid.id, video);
        } catch (err) {
          console.error("Failed to load character video in preview cache:", vid.id, err);
        }
      }
    });
  }, [videos]);

  // 1. Warm-up and load all image elements to cache for instant rendering
  useEffect(() => {
    if (images.length === 0) return;
    
    setIsLoadingImages(true);
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
        console.error(" preload failed for image:", img.name, err);
      }
    });

    Promise.all(preloads).then(() => {
      setImageCache(cache);
      setIsLoadingImages(false);
    });

    return () => {
      cache.clear();
    };
  }, [images, config.logoUrl]);

  // Setup AudioContext lifetime
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  // 2. Decode audio file for high precision sync
  useEffect(() => {
    if (!audioFile) {
      audioBufferRef.current = null;
      setIsAudioDecoded(false);
      return;
    }

    let active = true;
    setIsAudioDecoded(false);

    const decode = async () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) {
          console.warn("AudioContext is not supported by this browser.");
          return;
        }
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx();
        }
        const ctx = audioContextRef.current;
        const arrayBuffer = await audioFile.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        if (active) {
          audioBufferRef.current = decoded;
          setIsAudioDecoded(true);
          
          // If already playing while decoding was running, immediately kick off the audio track
          if (isPlayingRef.current && startAudioNodeRef.current) {
            startAudioNodeRef.current(playbackTimeRef.current);
          }
        }
      } catch (err) {
        console.error("Failed to decode audio file:", err);
      }
    };

    decode();

    return () => {
      active = false;
    };
  }, [audioFile]);

  // Decode background music files
  useEffect(() => {
    if (!bgMusicFiles || bgMusicFiles.length === 0) {
      bgAudioBuffersRef.current.clear();
      return;
    }

    let active = true;

    const decodeBgs = async () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) {
          console.warn("AudioContext is not supported by this browser.");
          return;
        }
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx();
        }
        const ctx = audioContextRef.current;
        
        for (const bg of bgMusicFiles) {
          if (!bgAudioBuffersRef.current.has(bg.id)) {
            const arrayBuf = await bg.file.arrayBuffer();
            const decoded = await ctx.decodeAudioData(arrayBuf);
            if (active) {
              bgAudioBuffersRef.current.set(bg.id, decoded);
            }
          }
        }
      } catch (err) {
        console.error("Failed to decode background music track:", err);
      }
    };

    decodeBgs();

    return () => {
      active = false;
    };
  }, [bgMusicFiles]);

  // Synchronise previewTime triggers from parent layout
  const playbackTimeRef = useRef(playbackTime);
  useEffect(() => {
    playbackTimeRef.current = playbackTime;
  }, [playbackTime]);

  useEffect(() => {
    if (!isPlaying && previewTime !== undefined && Math.abs(previewTime - playbackTimeRef.current) > 0.3) {
      seekTo(previewTime);
    }
  }, [previewTime, isPlaying]);

  // Main Canvas Real-time Animation Preview Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localAnimationFrame: number;

    const render = () => {
      let currentTime = playbackTimeRef.current;
      
      if (isPlaying) {
        const ctxNode = audioContextRef.current;
        if (ctxNode && ctxNode.state === 'running') {
          const elapsed = ctxNode.currentTime - startTimeRef.current;
          currentTime = pausedTimeRef.current + elapsed;
          
          if (currentTime >= duration) {
            // Stop playback at end of track
            setIsPlaying(false);
            currentTime = 0;
            pausedTimeRef.current = 0;
            if (playNodeRef.current) {
              try { playNodeRef.current.stop(); } catch{}
              playNodeRef.current = null;
            }
            if (bgPlayNodeRef.current) {
              try { bgPlayNodeRef.current.stop(); } catch{}
              bgPlayNodeRef.current = null;
            }
            setActiveBgMusicId(null);
            onPreviewTimeSelect(0);
          }
          playbackTimeRef.current = currentTime;
          setPlaybackTime(currentTime);

          const isTouchTypingEnabled = !!previewConfig.enableTouchTyping;

          // Dynamic volume ducking for typing behavior 2 (Human Typewriter) & 12 (Touch Typing)
          let targetVolumeFactor = 1.0;
          if (subtitles && subtitles.length > 0) {
            const introTime = previewConfig.introVideoUrl ? previewConfig.introDuration : 0;
            const adjustedTime = Math.max(0, currentTime - introTime);
            const maxAudioEnd = introTime + audioDuration;
            if (currentTime >= introTime && currentTime <= maxAudioEnd) {
              const activeBlock = subtitles.find(s => adjustedTime >= s.startTime && adjustedTime <= s.endTime);
              if (activeBlock) {
                const blockIdx = subtitles.indexOf(activeBlock);
                const blockNum = blockIdx + 1;
                
                const isHumanTypewriterActive = !!(previewConfig.enableHumanTypewriter && isBehaviorActiveForBlock(blockNum, previewConfig.humanTypewriterBlocks, subtitles, 'typewriter', previewConfig.behaviorSeed));
                const isTouchActive = !!(isTouchTypingEnabled && isBehaviorActiveForBlock(blockNum, previewConfig.touchTypingBlocks, subtitles, 'touch_typing', previewConfig.behaviorSeed));
                
                if (isHumanTypewriterActive || isTouchActive) {
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

          if (mainGainNodeRef.current && ctxNode) {
            const mainVol = previewConfig.mainAudioVolume !== undefined ? previewConfig.mainAudioVolume : 200;
            mainGainNodeRef.current.gain.setValueAtTime((mainVol / 100) * targetVolumeFactor, ctxNode.currentTime);
          }

          // Typewriter Sound Simulation during Playback
          let isTypewriterActive = previewConfig.subtitleShowEffect === 'typewriter';
          if ((previewConfig.enableHumanTypewriter || isTypewriterActive || previewConfig.enableHighlightDate || isTouchTypingEnabled) && subtitles && subtitles.length > 0) {
            const introTime = previewConfig.introVideoUrl ? previewConfig.introDuration : 0;
            const adjustedTime = Math.max(0, currentTime - introTime);
            const maxAudioEnd = introTime + audioDuration;
            if (currentTime >= introTime && currentTime <= maxAudioEnd) {
              const activeBlock = subtitles.find(s => adjustedTime >= s.startTime && adjustedTime <= s.endTime);
              if (activeBlock) {
                const blockIdx = subtitles.indexOf(activeBlock);
                const blockNum = blockIdx + 1;

                let matchedHighlightText = null;
                if (previewConfig.enableHighlightDate) {
                  matchedHighlightText = getHighlightCustomText(activeBlock.text, previewConfig);
                }

                const isHumanTypewriterActive = !!(previewConfig.enableHumanTypewriter && isBehaviorActiveForBlock(blockNum, previewConfig.humanTypewriterBlocks, subtitles, 'typewriter', previewConfig.behaviorSeed));
                const isTouchActive = !!(isTouchTypingEnabled && isBehaviorActiveForBlock(blockNum, previewConfig.touchTypingBlocks, subtitles, 'touch_typing', previewConfig.behaviorSeed));
                const isDateHighlightActive = !!(previewConfig.enableHighlightDate && matchedHighlightText);

                if (isHumanTypewriterActive || isTouchActive || isTypewriterActive || isDateHighlightActive) {
                  const bElapsed = adjustedTime - activeBlock.startTime;
                  const blockDur = Math.max(0.5, activeBlock.endTime - activeBlock.startTime);
                  const typewriterDuration = blockDur * (2 / 3);
                  const typeP = Math.min(1, bElapsed / typewriterDuration);
                  const textLengthToCount = isDateHighlightActive && matchedHighlightText ? matchedHighlightText.length : activeBlock.text.length;
                  const charCount = Math.floor(textLengthToCount * typeP);

                  const prev = typewriterStateRef.current;
                  const soundAllowed = isTouchActive ? (previewConfig.enableTouchTypingSound !== false) : true;
                  const activeVol = isTouchActive 
                    ? (previewConfig.touchTypingVolume !== undefined ? previewConfig.touchTypingVolume : 40)
                    : (previewConfig.typewriterVolume !== undefined ? previewConfig.typewriterVolume : 30);

                  if (prev.blockId !== activeBlock.id) {
                    typewriterStateRef.current = { blockId: activeBlock.id, typedCount: charCount };
                    if (charCount > 0 && audioContextRef.current && soundAllowed) {
                      playTypewriterClick(audioContextRef.current, undefined, activeVol);
                    }
                  } else if (charCount > prev.typedCount) {
                    typewriterStateRef.current.typedCount = charCount;
                    if (audioContextRef.current && soundAllowed) {
                      playTypewriterClick(audioContextRef.current, undefined, activeVol);
                    }
                  }
                }

                // Draw Circle/X Mouse Pointer Click sound simulation
                if (previewConfig.enableDrawCircle) {
                  const isDrawCircleActive = previewConfig.drawCircleBlocks && isBehaviorActiveForBlock(blockNum, previewConfig.drawCircleBlocks, subtitles, 'draw_circle', previewConfig.behaviorSeed);
                  const isDrawXActive = previewConfig.drawXBlocks && isBehaviorActiveForBlock(blockNum, previewConfig.drawXBlocks, subtitles, 'draw_x', previewConfig.behaviorSeed);
                  
                  if (isDrawCircleActive || isDrawXActive) {
                    const elapsed = adjustedTime - activeBlock.startTime;
                    const blockDuration = Math.max(0.5, activeBlock.endTime - activeBlock.startTime);
                    const progress = Math.max(0, Math.min(1.0, elapsed / blockDuration));
                    
                    if (progress >= 0.35) {
                      const state = drawCircleClickStateRef.current;
                      if (state.blockId !== activeBlock.id || !state.played) {
                        drawCircleClickStateRef.current = { blockId: activeBlock.id, played: true };
                        if (audioContextRef.current) {
                          playBackgroundNoise('mouse_click', audioContextRef.current, undefined, 180);
                        }
                      }
                    } else {
                      if (drawCircleClickStateRef.current.blockId === activeBlock.id) {
                        drawCircleClickStateRef.current.played = false;
                      }
                    }
                  }
                }

                // Background Noise Simulation during Preview
                if (previewConfig.enableBackgroundNoise && audioContextRef.current && subtitles && subtitles.length > 0) {
                  const noises = previewConfig.backgroundNoises || [];
                  noises.forEach((noiseItem) => {
                    if (noiseItem.segments) {
                      if (isBehaviorActiveForBlock(blockNum, noiseItem.segments, subtitles, 'noise_' + noiseItem.id, previewConfig.behaviorSeed)) {
                        const trackingKey = `${activeBlock.id}_${noiseItem.id}`;
                        if (!playedNoiseTrackerRef.current[trackingKey]) {
                          playedNoiseTrackerRef.current[trackingKey] = true;
                          playBackgroundNoise(noiseItem.id, audioContextRef.current, undefined, noiseItem.volume);
                        }
                      }
                    }
                  });
                }
              }
            }
          }
        }
      }

      // Handle HTML5 video playback sync for Intro Video and Outro Video in Preview
      const introVideo = videoCacheRef.current.get('intro');
      const outroVideo = videoCacheRef.current.get('outro');

      if (isPlaying) {
        // If we are in Intro sequence
        if (previewConfig.introVideoUrl && currentTime < previewConfig.introDuration) {
          if (introVideo) {
            if (introVideo.paused) {
              introVideo.currentTime = currentTime;
              introVideo.play().catch(() => {});
            } else if (Math.abs(introVideo.currentTime - currentTime) > 1.5) {
              introVideo.currentTime = currentTime;
            }
          }
          if (outroVideo && !outroVideo.paused) {
            outroVideo.pause();
          }
        }
        // If we are in Outro sequence
        else if (previewConfig.outroVideoUrl && currentTime >= (duration - previewConfig.outroDuration)) {
          const outroOffset = currentTime - (duration - previewConfig.outroDuration);
          if (outroVideo) {
            if (outroVideo.paused) {
              outroVideo.currentTime = outroOffset;
              outroVideo.play().catch(() => {});
            } else if (Math.abs(outroVideo.currentTime - outroOffset) > 1.5) {
              outroVideo.currentTime = outroOffset;
            }
          }
          if (introVideo && !introVideo.paused) {
            introVideo.pause();
          }
        }
        // Otherwise during main content playback, both must be paused
        else {
          if (introVideo && !introVideo.paused) introVideo.pause();
          if (outroVideo && !outroVideo.paused) outroVideo.pause();
        }
      } else {
        // When paused, make sure both are paused and display correct timestamps
        if (introVideo) {
          if (!introVideo.paused) introVideo.pause();
          if (previewConfig.introVideoUrl && currentTime < previewConfig.introDuration) {
            if (Math.abs(introVideo.currentTime - currentTime) > 0.05) {
              introVideo.currentTime = currentTime;
            }
          }
        }
        if (outroVideo) {
          if (!outroVideo.paused) outroVideo.pause();
          if (previewConfig.outroVideoUrl && currentTime >= (duration - previewConfig.outroDuration)) {
            const outroOffset = currentTime - (duration - previewConfig.outroDuration);
            if (Math.abs(outroVideo.currentTime - outroOffset) > 0.05) {
              outroVideo.currentTime = outroOffset;
            }
          }
        }
      }

      drawVideoFrame(canvas, ctx, currentTime, subtitles, images, imageCache, previewConfig, duration, videoCacheRef.current, presets, true, videos);
      
      if (isPlaying) {
        localAnimationFrame = requestAnimationFrame(render);
      }
    };

    // Paused draws exactly 1 frame instantly without running a standard ticking thread
    if (!isPlaying) {
      const introVideo = videoCacheRef.current.get('intro');
      const outroVideo = videoCacheRef.current.get('outro');
      const ct = playbackTimeRef.current;
      if (introVideo) {
        if (!introVideo.paused) introVideo.pause();
        if (previewConfig.introVideoUrl && ct < previewConfig.introDuration) {
          introVideo.currentTime = ct;
        }
      }
      if (outroVideo) {
        if (!outroVideo.paused) outroVideo.pause();
        if (previewConfig.outroVideoUrl && ct >= (duration - previewConfig.outroDuration)) {
          outroVideo.currentTime = ct - (duration - previewConfig.outroDuration);
        }
      }
      drawVideoFrame(canvas, ctx, ct, subtitles, images, imageCache, previewConfig, duration, videoCacheRef.current, presets, false, videos);
    } else {
      localAnimationFrame = requestAnimationFrame(render);
    }

    return () => {
      if (localAnimationFrame) {
        cancelAnimationFrame(localAnimationFrame);
      }
      try {
        const introVideo = videoCacheRef.current.get('intro');
        if (introVideo && !introVideo.paused) introVideo.pause();
        const outroVideo = videoCacheRef.current.get('outro');
        if (outroVideo && !outroVideo.paused) outroVideo.pause();
      } catch {}
    };
  }, [isPlaying, subtitles, images, imageCache, previewConfig, duration, presets]);

  const startAudioNode = async (offset: number) => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      console.warn("AudioContext is not supported by this browser.");
      return;
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }
    const ctx = audioContextRef.current;
    
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        // Give 50ms warm-up for the audio thread clock to stabilize before scheduling
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.warn("Failed to resume AudioContext:", e);
      }
    }

    // Stop current play node first
    if (playNodeRef.current) {
      try { playNodeRef.current.stop(); } catch {}
      playNodeRef.current = null;
    }

    // Stop and set up background music node
    if (bgPlayNodeRef.current) {
      try { bgPlayNodeRef.current.stop(); } catch {}
      bgPlayNodeRef.current = null;
    }

    startTimeRef.current = ctx.currentTime;
    
    // Choose and play a random background music loop if available
    if (bgMusicFiles && bgMusicFiles.length > 0) {
      let activeId = activeBgMusicId;
      if (!activeId || !bgAudioBuffersRef.current.has(activeId)) {
        const randomIndex = Math.floor(Math.random() * bgMusicFiles.length);
        activeId = bgMusicFiles[randomIndex].id;
        setActiveBgMusicId(activeId);
      }

      const bgBuf = bgAudioBuffersRef.current.get(activeId);
      if (bgBuf) {
        const bgSource = ctx.createBufferSource();
        bgSource.buffer = bgBuf;
        bgSource.loop = true;

        const bgGain = ctx.createGain();
        const activeTrack = bgMusicFiles.find(t => t.id === activeId);
        const trackPct = activeTrack && activeTrack.volume !== undefined ? activeTrack.volume : 100;
        bgGain.gain.value = 0.20 * (trackPct / 100);
        
        bgSource.connect(bgGain);
        bgGain.connect(ctx.destination);

        const bgOffset = offset % bgBuf.duration;
        bgSource.start(ctx.currentTime, bgOffset);
        bgPlayNodeRef.current = bgSource;
      }
    }

    const buf = audioBufferRef.current;
    if (!buf) return; // Silent playback continues on timer which is fine

    const source = ctx.createBufferSource();
    source.buffer = buf;
    
    const mainGain = ctx.createGain();
    const mainVol = previewConfig.mainAudioVolume !== undefined ? previewConfig.mainAudioVolume : 200;
    mainGain.gain.value = mainVol / 100;
    mainGainNodeRef.current = mainGain;
    
    source.connect(mainGain);
    mainGain.connect(ctx.destination);
    
    // Play with safety boundaries
    const srtDuration = subtitles.length > 0 ? subtitles[subtitles.length - 1].endTime : 0;
    const contentDuration = Math.max(audioDuration, srtDuration) || 10;

    if (offset < previewConfig.introDuration) {
      // Still in intro: schedule start in the future
      const delay = previewConfig.introDuration - offset;
      source.start(ctx.currentTime + delay, 0);
    } else if (offset < (previewConfig.introDuration + contentDuration)) {
      // In main content: start immediately with offset
      const audioOffset = offset - previewConfig.introDuration;
      source.start(ctx.currentTime, Math.max(0, Math.min(audioOffset, buf.duration)));
    } else {
      // Already in outro: do not play audio
      return;
    }
    
    playNodeRef.current = source;
  };

  useEffect(() => {
    startAudioNodeRef.current = startAudioNode;
  }, [startAudioNode]);

  const handlePlayToggle = async () => {
    if (isPlaying) {
      // Pause
      if (playNodeRef.current) {
        try { playNodeRef.current.stop(); } catch {}
        playNodeRef.current = null;
      }
      if (bgPlayNodeRef.current) {
        try { bgPlayNodeRef.current.stop(); } catch {}
        bgPlayNodeRef.current = null;
      }
      const ctx = audioContextRef.current;
      if (ctx) {
        const elapsed = ctx.currentTime - startTimeRef.current;
        pausedTimeRef.current += elapsed;
      }
      setIsPlaying(false);
    } else {
      // Play
      playedNoiseTrackerRef.current = {};
      const startAt = pausedTimeRef.current >= duration ? 0 : pausedTimeRef.current;
      pausedTimeRef.current = startAt;
      setPlaybackTime(startAt);
      playbackTimeRef.current = startAt;
      await startAudioNode(startAt);
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    playedNoiseTrackerRef.current = {};
    if (playNodeRef.current) {
      try { playNodeRef.current.stop(); } catch {}
      playNodeRef.current = null;
    }
    if (bgPlayNodeRef.current) {
      try { bgPlayNodeRef.current.stop(); } catch {}
      bgPlayNodeRef.current = null;
    }
    setActiveBgMusicId(null);
    setIsPlaying(false);
    pausedTimeRef.current = 0;
    setPlaybackTime(0);
    playbackTimeRef.current = 0;
    onPreviewTimeSelect(0);
  };

  const seekTo = (seconds: number) => {
    const safeSecs = Math.max(0, Math.min(seconds, duration));
    playedNoiseTrackerRef.current = {};
    pausedTimeRef.current = safeSecs;
    playbackTimeRef.current = safeSecs;
    setPlaybackTime(safeSecs);
    onPreviewTimeSelect(safeSecs);
    
    if (isPlaying) {
      startAudioNode(safeSecs);
    }
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const timeline = e.currentTarget;
    if (duration <= 0) return;
    
    const updateTimeFromEvent = (clientX: number) => {
      const rect = timeline.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      seekTo(percent * duration);
    };

    updateTimeFromEvent(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updateTimeFromEvent(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTimelineTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const timeline = e.currentTarget;
    if (duration <= 0 || !e.touches[0]) return;
    
    const updateTimeFromEvent = (clientX: number) => {
      const rect = timeline.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      seekTo(percent * duration);
    };

    updateTimeFromEvent(e.touches[0].clientX);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches && moveEvent.touches[0]) {
        updateTimeFromEvent(moveEvent.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
  };

  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    const tenths = Math.floor((timeInSecs % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  // Helper updates for config Sliders
  const updateConfig = (key: keyof RenderConfig, value: any) => {
    onConfigChange({
      ...config,
      [key]: value
    });
  };

  const renderConfigPane = () => {
    return (
      <div className="bg-[#050505] border border-white/10 rounded-xl p-5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2 mb-2">
          <Sliders size={12} /> Cài đặt hiển thị &amp; hiệu ứng
        </h4>

        {/* Transition configurations */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-white/40 font-sans block mb-1">Kiểu chuyển cảnh:</label>
            <select
              value={config.transitionType}
              onChange={(e) => updateConfig('transitionType', e.target.value)}
              className="w-full text-xs bg-[#0E0E11] border border-white/10 rounded-lg px-2 py-1.5 text-white/90 focus:outline-none focus:border-blue-500"
            >
              <option value="none">Thay thế ngay (None)</option>
              <option value="fade">Hòa trộn mượt (Fade)</option>
              <option value="zoom">Thu nhỏ đồng tâm (Zoom)</option>
              <option value="slide">Trượt ngang (Slide)</option>
              <option value="slide_left">Trượt từ phải sang trái (Slide Left)</option>
              <option value="slide_right">Trượt từ trái sang phải (Slide Right)</option>
              <option value="slide_up">Trượt từ dưới lên (Slide Up)</option>
              <option value="slide_down">Trượt từ trên xuống (Slide Down)</option>
              <option value="zoom_fade">Phóng to kết hợp mờ dần (Zoom + Fade)</option>
              <option value="wipe_left">Quét mượt sang trái (Wipe Left)</option>
              <option value="wipe_right">Quét mượt sang phải (Wipe Right)</option>
              <option value="wipe_up">Quét mượt lên trên (Wipe Up)</option>
              <option value="wipe_down">Quét mượt xuống dưới (Wipe Down)</option>
              <option value="rotate_fade">Xoay tròn mờ dần (Rotate + Fade)</option>
              <option value="curtain_open">Mở rèm sang hai bên (Curtain Open)</option>
              <option value="curtain_close">Đóng rèm vào giữa (Curtain Close)</option>
              <option value="grid_dissolve">Rã lưới sọc đứng (Grid Dissolve)</option>
              <option value="ripple_fade">Sóng cuộn thu nhỏ (Ripple Zoom + Fade)</option>
              <option value="cross_zoom">Thu phóng chéo điện ảnh (Cross Zoom)</option>
              <option value="random_all">NGẪU NHIÊN TOÀN BỘ (Đổi kiểu liên tục)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-white/40 font-sans block mb-1">Thời gian chuyển (s):</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="2"
              value={config.transitionDuration}
              onChange={(e) => updateConfig('transitionDuration', parseFloat(e.target.value) || 0.5)}
              className="w-full text-xs bg-[#0E0E11] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Dynamic Image Motion Effect selector with fallback button */}
        <div className="bg-[#0E0E11]/60 p-3.5 rounded-xl border border-white/5 space-y-2.5">
          <div>
            <p className="text-[11px] text-white font-medium flex items-center gap-1.5">
              Hiệu ứng chuyển động ảnh:
            </p>
            <p className="text-[9px] text-white/30">Hỗ trợ thu phóng xoay panning mượt tránh tĩnh đơn điệu</p>
          </div>
          <div className="grid grid-cols-5 gap-2 items-center">
            <div className="col-span-3">
              <select
                value={config.imageEffect || 'random'}
                onChange={(e) => {
                  const val = e.target.value;
                  onConfigChange({
                    ...config,
                    imageEffect: val as any,
                    enableKenBurns: true
                  });
                }}
                className="w-full text-[11px] bg-[#050505] border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="none">❌ KHÔNG HIỆU ỨNG (Tĩnh)</option>
                <option value="random">🔀 NGẪU NHIÊN TOÀN BỘ</option>
                <option value="zoom_in">🔍 Thu phóng vào trong chậm</option>
                <option value="zoom_out">🔎 Thu phóng ra ngoài chậm</option>
                <option value="pan_left">◀ Trượt mượt sang trái</option>
                <option value="pan_right">▶ Trượt mượt sang phải</option>
                <option value="pan_up">▲ Trượt mượt lên trên</option>
                <option value="pan_down">▼ Trượt mượt xuống dưới</option>
                <option value="pan_up_left">↖ Chéo lên trái</option>
                <option value="pan_up_right">↗ Chéo lên phải</option>
                <option value="pan_down_left">↙ Chéo xuống trái</option>
                <option value="pan_down_right">↘ Chéo xuống phải</option>
                <option value="rotate_slow_cw">🔄 Xoay nhẹ thuận chiều kim</option>
                <option value="rotate_slow_ccw">🔄 Xoay nhẹ ngược chiều kim</option>
                <option value="zoom_pulse">💓 Thu phóng co giãn</option>
                <option value="shiver">📳 Rung lắc nhẹ (Camera Shake)</option>
              </select>
            </div>
            <div className="col-span-2 justify-end flex">
              <button
                type="button"
                onClick={() => {
                  onConfigChange({
                    ...config,
                    enableKenBurns: true
                  });
                }}
                className="flex items-center gap-1 text-[10px] text-white/60 bg-[#050505] border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none"
                title="Ken Burns legacy mode toggle"
              >
                <span>Luôn mở</span>
                <ToggleRight size={18} className="text-blue-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Subtitle font options */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] text-white/40">
            <span>Kích cỡ chữ Subtitle (px):</span>
            <span className="font-mono text-white font-semibold">{config.subtitleFontSize}px</span>
          </div>
          <input
            type="range"
            min="12"
            max="40"
            value={config.subtitleFontSize}
            onChange={(e) => updateConfig('subtitleFontSize', parseInt(e.target.value))}
            className="w-full accent-blue-500 bg-[#0E0E11] h-1 rounded"
          />

          <div className="flex justify-between items-center text-[10px] text-white/40">
            <span>Khoảng cách Sub từ biên dưới (%):</span>
            <span className="font-mono text-white font-semibold">{config.subtitleOffset}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            value={config.subtitleOffset}
            onChange={(e) => updateConfig('subtitleOffset', parseInt(e.target.value))}
            className="w-full accent-blue-500 bg-[#0E0E11] h-1 rounded"
          />
        </div>

        {/* Color and Styles Pickers */}
        <div className="grid grid-cols-2 gap-3 bg-[#0E0E11]/40 p-2 border border-white/5 rounded-xl">
          <div>
            <span className="text-[9px] text-white/40 block mb-1">Màu chữ gốc:</span>
            <div className="flex gap-1.5 items-center">
              <input
                type="color"
                value={config.subtitleColor}
                onChange={(e) => updateConfig('subtitleColor', e.target.value)}
                className="w-7 h-7 bg-transparent border border-white/10 rounded cursor-pointer shrink-0"
              />
              <span className="text-[10px] font-mono text-white">{config.subtitleColor}</span>
            </div>
          </div>

          <div>
            <span className="text-[9px] text-white/40 block mb-1">Màu viền chữ:</span>
            <div className="flex gap-1.5 items-center">
              <input
                type="color"
                value={config.subtitleOutlineColor}
                onChange={(e) => updateConfig('subtitleOutlineColor', e.target.value)}
                className="w-7 h-7 bg-transparent border border-white/10 rounded cursor-pointer shrink-0"
              />
              <span className="text-[10px] font-mono text-white">{config.subtitleOutlineColor}</span>
            </div>
          </div>

          <div className="col-span-2">
            <div className="flex justify-between items-center text-[10px] text-white/40 mb-1">
              <span>Độ phản quang nền hộp Sub ({Math.round(config.subtitleBgOpacity * 100)}%):</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.subtitleBgOpacity}
              onChange={(e) => updateConfig('subtitleBgOpacity', parseFloat(e.target.value))}
              className="w-full accent-blue-500 bg-[#0E0E11] h-1 rounded"
            />
          </div>
        </div>
      </div>
    );
  };

  const activePresetIndex = presets ? presets.findIndex(p => p.id === config.activePresetId) : -1;
  const styleNumber = activePresetIndex !== -1 ? activePresetIndex + 1 : 1;
  const effectGroupLetter = config.activeEffectGroup || 'A';

  return (
    <div className="bg-[#0E0E11] border border-white/10 rounded-2xl p-6 shadow-xl" id="video-preview-card">
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-md font-semibold text-white font-sans tracking-tight">
            Màn Hình Preview Video
          </h2>
          <p className="text-xs text-white/40 mt-0.5">
            Xem thử hoạt cảnh căn chỉnh thời gian thực (Cấu hình chi tiết chữ &amp; chuyển cảnh trong mục Cài đặt góc trên)
          </p>
        </div>
        <div className="px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl text-xs font-bold font-mono shrink-0 self-start sm:self-center">
          Phong cách #{styleNumber}, MẪU CHỮ {effectGroupLetter}
        </div>
      </div>

      <div className="w-full flex flex-col items-center">
        {images.length === 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl p-3 mb-4 w-full flex gap-2 items-center">
            <AlertCircle size={15} className="shrink-0" />
            <span>Chưa nạp ảnh nhân vật nào! Hãy nạp thư mục ảnh nhân vật trước.</span>
          </div>
        )}

        <div 
          className="relative w-full max-w-xl aspect-video bg-[#050505] border border-white/10 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center group"
          id="viewport-frame"
        >
          <canvas
            ref={canvasRef}
            width={config.width}
            height={config.height}
            className="w-full h-full object-contain"
          />

          {isLoadingImages && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center p-4">
              <RefreshCw size={24} className="text-blue-400 animate-spin mb-2" />
              <p className="text-xs text-white/70">Đang khởi tạo bộ nhớ đệm ảnh...</p>
            </div>
          )}
        </div>

        {/* Media Player Control Timeline bar */}
        <div className="w-full max-w-xl mt-4 space-y-3">
          {/* Timeline progression bar */}
          <div 
            onMouseDown={handleTimelineMouseDown}
            onTouchStart={handleTimelineTouchStart}
            className="relative w-full bg-[#050505] h-2 rounded-full cursor-pointer hover:h-2.5 transition-all outline-none border border-white/10 group/timeline select-none"
            id="preview-timeline"
          >
            <div 
              className="bg-blue-500 h-full rounded-full absolute left-0 top-0"
              style={{ width: `${(playbackTime / duration) * 100}%` }}
            />
            {/* Render small visual indicator notches for subtitles start markers */}
            {subtitles.map((sub, idx) => (
              <div
                key={`${sub.id}-${idx}`}
                className="absolute top-0 bottom-0 bg-white/20 w-[1px] pointer-events-none"
                style={{ left: `${(sub.startTime / duration) * 100}%` }}
                title={`Sub #${sub.id}-${idx}: ${sub.text}`}
              />
            ))}
            {/* Playhead thumb knob */}
            <div 
              className="absolute top-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-full shadow-md scale-0 group-hover/timeline:scale-100 transition-transform pointer-events-none"
              style={{ 
                left: `${(playbackTime / duration) * 100}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          </div>

          {/* Timings and Play action toggles */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePlayToggle}
                disabled={images.length === 0}
                className="p-2.5 bg-blue-500 hover:bg-blue-400 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white rounded-full transition-transform"
              >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              </button>
              <button
                onClick={handleStop}
                disabled={images.length === 0}
                className="p-2.5 bg-[#050505] hover:bg-white/5 border border-white/10 active:scale-[0.98] text-white/85 rounded-full transition-transform"
              >
                <Square size={14} fill="currentColor" />
              </button>
              
              <button
                type="button"
                onClick={handleRandomizeSubtitlesStyle}
                disabled={images.length === 0 || !presets || presets.length === 0}
                className="ml-2.5 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-600 hover:brightness-110 text-white text-[11px] font-bold uppercase tracking-wide rounded-full flex items-center gap-1.5 shadow-lg shadow-orange-500/10 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                title="Chọn ngẫu nhiên kiểu chữ và phong cách mẫu chữ khác"
              >
                <Sparkles size={11} className="text-white animate-bounce" />
                Random Kiểu Chữ
              </button>

              {!audioFile && (
                <span className="text-[10px] text-amber-400 font-medium ml-1.5 flex items-center gap-1">
                  <Volume2 size={12} /> Mode: Không nhạc
                </span>
              )}
            </div>

            <div className="font-mono text-white/40 text-xs text-right">
              {formatTime(playbackTime)} <span className="opacity-40">/</span> {formatTime(duration)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
