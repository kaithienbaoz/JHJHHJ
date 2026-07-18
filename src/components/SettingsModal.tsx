/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useRef, useEffect } from 'react';
import { RenderConfig, CharacterImage, SubtitlePreset } from '../types';
import { DEFAULT_STICKER_GROUPS, populateDefaultStickers } from '../utils/stickerGenerator';
import { drawBackgroundEffect, getHighlightDateText, getHighlightCustomText } from '../utils/videoRenderer';
import { playTypewriterClick, playBackgroundNoise } from '../utils/audioSynthesizer';
import { safeLocalStorage } from '../utils/safeLocalStorage';
import { BehaviorSettings } from './BehaviorSettings';
import { 
  X, 
  Sliders, 
  AlignLeft, 
  AlignCenter,
  AlignRight,
  AlignJustify,
  Film, 
  Sparkles, 
  Type, 
  Image as ImageIcon, 
  ToggleLeft, 
  ToggleRight, 
  Check, 
  Upload,
  Clock,
  Palette,
  Music,
  Trash2,
  Plus,
  Edit2,
  Save,
  RefreshCw,
  Play,
  Pause,
  Cpu,
  ChevronLeft,
  Loader2,
  ShieldAlert,
  SlidersHorizontal,
  Volume2
} from 'lucide-react';

export const SUBTITLE_FONTS = [
  'Alfa Slab One',
  'Allerta',
  'Allerta Stencil',
  'Amatic SC',
  'Anton',
  'Archivo Black',
  'Arimo',
  'Bebas Neue',
  'Big Shoulders Display',
  'Black Ops One',
  'Bowlby One SC',
  'Cabin',
  'Caprasimo',
  'Cardo',
  'Caveat',
  'Changa One',
  'Cinzel',
  'Cinzel Decorative',
  'Comfortaa',
  'Cormorant Garamond',
  'Crimson Text',
  'Dancing Script',
  'Days One',
  'Dela Gothic One',
  'DM Sans',
  'DM Serif Display',
  'Do Hyeon',
  'Domine',
  'Eczar',
  'Fjalla One',
  'Frank Ruhl Libre',
  'Fredoka',
  'Goldman',
  'IBM Plex Sans',
  'IBM Plex Serif',
  'Inter',
  'Itim',
  'Josefin Sans',
  'Kanit',
  'Krona One',
  'Lexend',
  'Libre Baskerville',
  'Lilita One',
  'Lobster',
  'Luckiest Guy',
  'Merriweather',
  'Michroma',
  'Montserrat',
  'Newsreader',
  'Oswald',
  'Outfit',
  'Pacifico',
  'Passion One',
  'Pathway Gothic One',
  'Patrick Hand',
  'Patua One',
  'Paytone One',
  'Permanent Marker',
  'Platypi',
  'Playfair Display',
  'Playpen Sans',
  'Poller One',
  'Prata',
  'PT Sans',
  'PT Serif',
  'Quicksand',
  'Rammetto One',
  'Righteous',
  'Roboto Condensed',
  'Rubik',
  'Rubik Mono One',
  'Saira Extra Condensed',
  'Saira Stencil One',
  'Secular One',
  'Sigmar',
  'Space Grotesk',
  'Spectral',
  'Squada One',
  'Staatliches',
  'Syncopate',
  'Syne',
  'Teko',
  'Ultra',
  'Unbounded',
  'Unica One',
  'Viga',
  'Vollkorn',
  'Zilla Slab Highlight'
];

function hexToRgba(hexStr: string, alpha: number) {
  let hex = hexStr.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RenderConfig;
  onConfigChange: (newConfig: RenderConfig) => void;
  images: CharacterImage[];
  onCustomBgUploaded: (type: 'intro' | 'outro', file: File) => void;
  bgMusicFiles: Array<{ id: string; name: string; url: string; file: File; volume?: number }>;
  onAddBgMusic: (files: File[]) => void;
  onDeleteBgMusic: (id: string) => void;
  onUpdateBgMusicVolume?: (id: string, volume: number) => void;
  audioFile?: File | null;
  onVideoConfigUploaded?: (type: 'intro' | 'outro', file: File, duration: number) => void;
  onVideoConfigRemoved?: (type: 'intro' | 'outro') => void;
  presets?: SubtitlePreset[];
  onPresetsChange?: (newPresets: SubtitlePreset[]) => void;
}

export function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    return '#000000';
  }
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

export default function SettingsModal({
  isOpen,
  onClose,
  config,
  onConfigChange,
  images,
  onCustomBgUploaded,
  bgMusicFiles,
  onAddBgMusic,
  onDeleteBgMusic,
  onUpdateBgMusicVolume,
  audioFile,
  onVideoConfigUploaded,
  onVideoConfigRemoved,
  presets = [],
  onPresetsChange = () => {}
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'bg-effect' | 'display' | 'font' | 'intro-outro' | 'bg-music' | 'behavior'>('display');
  const [activeBehaviorAccordion, setActiveBehaviorAccordion] = useState<number | null>(1);
  
  // Custom Subtitle Style Presets Form states
  const bgEffectCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sampleImageIndex, setSampleImageIndex] = useState(0);
  const [bgTime, setBgTime] = useState(0);
  const [preloadedImage, setPreloadedImage] = useState<HTMLImageElement | null>(null);

  // Preload preview images to prevent flickering/jitter on every frame
  useEffect(() => {
    if (!isOpen || activeTab !== 'bg-effect') return;

    const selectable = images.filter(img => img.id !== 'intro-bg-custom' && img.id !== 'outro-bg-custom');
    const sampleImgObj = selectable.length > 0 ? selectable[sampleImageIndex % selectable.length] : null;

    if (sampleImgObj) {
      const img = new Image();
      img.src = sampleImgObj.url;
      const handleLoad = () => {
        setPreloadedImage(img);
      };
      img.addEventListener('load', handleLoad);
      if (img.complete) {
        setPreloadedImage(img);
      }
      return () => {
        img.removeEventListener('load', handleLoad);
      };
    } else {
      setPreloadedImage(null);
    }
  }, [isOpen, activeTab, images, sampleImageIndex]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'bg-effect') return;

    let animFrame: number;
    const start = Date.now();

    const renderLoop = () => {
      const elapsedSeconds = (Date.now() - start) / 1000;
      setBgTime(elapsedSeconds);

      const canvas = bgEffectCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          // Clear first
          ctx.fillStyle = '#0F0F12';
          ctx.fillRect(0, 0, w, h);

          const selectable = images.filter(img => img.id !== 'intro-bg-custom' && img.id !== 'outro-bg-custom');
          
          if (selectable.length > 0) {
            if (preloadedImage) {
              ctx.drawImage(preloadedImage, 0, 0, w, h);
            } else {
              // Draw a soft blue/slate loading background
              const grad = ctx.createLinearGradient(0, 0, 0, h);
              grad.addColorStop(0, '#1E293B');
              grad.addColorStop(1, '#0F172A');
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, w, h);
            }
          } else {
            // Elegant scenario gradient backdrop if no inventory images are loaded
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#12121A');
            grad.addColorStop(1, '#08080C');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Draw placeholder text inside
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = 'bold 13px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Chưa nạp ảnh trong kho hàng', w / 2, h / 2 - 10);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.font = '11px system-ui';
            ctx.fillText('Hiển thị hiệu ứng trên hình nền tối', w / 2, h / 2 + 15);
          }

          // Render active background effect particles
          const activeEffect = config.bgEffect || 'none';
          drawBackgroundEffect(ctx, activeEffect, w, h, elapsedSeconds);
        }
      }
      animFrame = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [isOpen, activeTab, config.bgEffect, preloadedImage, images]);

  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetFormName, setPresetFormName] = useState('');
  const [presetFormFontFamily, setPresetFormFontFamily] = useState('Montserrat');
  const [presetFormFontSize, setPresetFormFontSize] = useState(24);
  const [presetFormColor, setPresetFormColor] = useState('#FFFFFF');
  const [presetFormOutlineColor, setPresetFormOutlineColor] = useState('#000000');
  const [presetFormOutlineWidth, setPresetFormOutlineWidth] = useState(4);
  const [presetFormBgColor, setPresetFormBgColor] = useState('#000000');
  const [presetFormBgOpacity, setPresetFormBgOpacity] = useState(0.4);
  const [presetFormPosition, setPresetFormPosition] = useState<'bottom-center' | 'top-center' | 'left' | 'right' | 'center'>('bottom-center');
  const [presetFormEffect, setPresetFormEffect] = useState<'standard' | 'cinematic' | 'badge' | 'neon' | 'frosted'>('standard');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Subtitle Sub-tab options: 'style' (Phong cách) vs 'effect' (Hiệu ứng)
  const [fontSubTab, setFontSubTab] = useState<'style' | 'effect'>('style');
  
  // Local preset state specifically for editing when adjusting fields
  const [localEditingPreset, setLocalEditingPreset] = useState<SubtitlePreset | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
  const [stylePreviewInCanvas, setStylePreviewInCanvas] = useState(false);
  const [isDraggingStylePresetY, setIsDraggingStylePresetY] = useState(false);
  const stylePresetCanvasRef = useRef<HTMLDivElement>(null);

  // Background music preview auditioner states
  const [trialVoiceFile, setTrialVoiceFile] = useState<File | null>(null);
  const [trialVoiceUrl, setTrialVoiceUrl] = useState<string | null>(null);
  const [isAuditionPlaying, setIsAuditionPlaying] = useState(false);
  const [auditionMusicTrackId, setAuditionMusicTrackId] = useState<string>('');

  const auditionVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const auditionMusicAudioRef = useRef<HTMLAudioElement | null>(null);

  // Handle cleanup and URL generation for trial voice
  useEffect(() => {
    if (trialVoiceFile) {
      const url = URL.createObjectURL(trialVoiceFile);
      setTrialVoiceUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setTrialVoiceUrl(null);
    }
  }, [trialVoiceFile]);

  // Clean up audio elements on unmount or when modal is closed
  useEffect(() => {
    return () => {
      if (auditionVoiceAudioRef.current) {
        auditionVoiceAudioRef.current.pause();
        auditionVoiceAudioRef.current = null;
      }
      if (auditionMusicAudioRef.current) {
        auditionMusicAudioRef.current.pause();
        auditionMusicAudioRef.current = null;
      }
      setIsAuditionPlaying(false);
    };
  }, [isOpen]);

  // Dynamically update music volume during real-time auditioning
  useEffect(() => {
    if (auditionMusicAudioRef.current) {
      const selectedTrack = bgMusicFiles.find(t => t.id === auditionMusicTrackId) || bgMusicFiles[0];
      if (selectedTrack) {
        const trackPct = selectedTrack.volume !== undefined ? selectedTrack.volume : 100;
        auditionMusicAudioRef.current.volume = 0.20 * (trackPct / 100);
      }
    }
  }, [bgMusicFiles, auditionMusicTrackId]);

  // Dynamically update voice volume during real-time auditioning
  useEffect(() => {
    if (auditionVoiceAudioRef.current) {
      const vol = config.mainAudioVolume !== undefined ? config.mainAudioVolume : 200;
      auditionVoiceAudioRef.current.volume = Math.min(1.0, vol / 100);
    }
  }, [config.mainAudioVolume]);

  const handleAuditionToggle = () => {
    if (isAuditionPlaying) {
      if (auditionVoiceAudioRef.current) auditionVoiceAudioRef.current.pause();
      if (auditionMusicAudioRef.current) auditionMusicAudioRef.current.pause();
      setIsAuditionPlaying(false);
    } else {
      // Prioritize trialVoiceFile, fallback to main audioFile if present
      const voiceUrl = trialVoiceUrl || (audioFile ? URL.createObjectURL(audioFile) : null);
      
      // Get the background music selected
      const selectedTrack = bgMusicFiles.find(t => t.id === auditionMusicTrackId) || bgMusicFiles[0];
      const bgUrl = selectedTrack ? selectedTrack.url : null;

      if (!voiceUrl && !bgUrl) {
         alert("Hãy tải tệp voice hoặc chọn nhạc nền trước khi chạy thử phối hợp âm thanh!");
         return;
      }

      // Initialize voice audio
      if (voiceUrl) {
        if (!auditionVoiceAudioRef.current) {
          auditionVoiceAudioRef.current = new Audio(voiceUrl);
        } else {
          auditionVoiceAudioRef.current.src = voiceUrl;
        }
        auditionVoiceAudioRef.current.currentTime = 0;
        auditionVoiceAudioRef.current.loop = true;
        const mainVol = config.mainAudioVolume !== undefined ? config.mainAudioVolume : 200;
        auditionVoiceAudioRef.current.volume = Math.min(1.0, mainVol / 100);
      } else {
        if (auditionVoiceAudioRef.current) {
          auditionVoiceAudioRef.current.pause();
          auditionVoiceAudioRef.current = null;
        }
      }

      // Initialize background music audio
      if (bgUrl) {
        if (!auditionMusicAudioRef.current) {
          auditionMusicAudioRef.current = new Audio(bgUrl);
        } else {
          auditionMusicAudioRef.current.src = bgUrl;
        }
        auditionMusicAudioRef.current.currentTime = 0;
        auditionMusicAudioRef.current.loop = true;
        
        // Dynamically set volume
        const trackPct = selectedTrack && selectedTrack.volume !== undefined ? selectedTrack.volume : 100;
        auditionMusicAudioRef.current.volume = 0.20 * (trackPct / 100);
      } else {
        if (auditionMusicAudioRef.current) {
          auditionMusicAudioRef.current.pause();
          auditionMusicAudioRef.current = null;
        }
      }

      // Play both of them
      if (auditionVoiceAudioRef.current) {
        auditionVoiceAudioRef.current.play().catch(e => console.error("Error playing audition voice:", e));
      }
      if (auditionMusicAudioRef.current) {
        auditionMusicAudioRef.current.play().catch(e => console.error("Error playing audition music:", e));
      }

      setIsAuditionPlaying(true);
    }
  };

  const handleAuditionStop = () => {
    if (auditionVoiceAudioRef.current) auditionVoiceAudioRef.current.pause();
    if (auditionMusicAudioRef.current) auditionMusicAudioRef.current.pause();
    setIsAuditionPlaying(false);
  };

  const currentActivePreset = presets.find(p => p.id === config.activePresetId) || presets[0] || null;

  useEffect(() => {
    if (currentActivePreset) {
      const isTraditional = (currentActivePreset.position || 'bottom-center') === 'bottom-center';
      setLocalEditingPreset({
        ...currentActivePreset,
        subtitleHighlightMode: currentActivePreset.subtitleHighlightMode || 'none',
        subtitleHighlightColor: currentActivePreset.subtitleHighlightColor || '#EAB308',
        presetY: isTraditional ? 91 : (currentActivePreset.presetY !== undefined ? currentActivePreset.presetY : 85)
      });
    } else {
      setLocalEditingPreset(null);
    }
  }, [config.activePresetId, presets]);

  const updateLocalPresetField = (key: keyof SubtitlePreset, value: any) => {
    setLocalEditingPreset(prev => {
      if (!prev) return null;
      const next = { ...prev, [key]: value };
      if ((next.position || 'bottom-center') === 'bottom-center') {
        next.presetY = 91;
      }
      return next;
    });
  };

  const handleSaveLocalPreset = () => {
    if (!localEditingPreset) return;
    const updated = presets.map(p => p.id === localEditingPreset.id ? localEditingPreset : p);
    onPresetsChange(updated);
    // Sync to config too so the live video preview hears about the update immediately
    if (config.activePresetId === localEditingPreset.id) {
      // Small trigger to update config so preview forces a redraw
      onConfigChange({
        ...config,
        subtitleFontSize: localEditingPreset.fontSize // dummy triggers
      });
    }
    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 2000);
  };

  const [isDragSimActive, setIsDragSimActive] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [dragTarget, setDragTarget] = useState<'text' | 'blur'>('text');
  const [popupEditingEffect, setPopupEditingEffect] = useState<any | null>(null);
  const [selectedEffectMẫu, setSelectedEffectMẫu] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  
  // Immersive Popup Studio Canvas simulator states
  const [simPopupPlaying, setSimPopupPlaying] = useState(true);
  const [simPopupTime, setSimPopupTime] = useState(1.2);
  const [simPopupText, setSimPopupText] = useState('This is a longer sample subtitle line designed to test multi-line wrapping and responsive pointer positioning inside the interactive simulator!');

  // YouTube audio protect chaotic static noise states
  const [isGeneratingNoise, setIsGeneratingNoise] = useState(false);
  const [localNoiseVolume, setLocalNoiseVolume] = useState(15);
  const [noiseAudio, setNoiseAudio] = useState<HTMLAudioElement | null>(null);
  const [isNoisePlaying, setIsNoisePlaying] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const logoContainerRef = useRef<HTMLDivElement>(null);
  const [simTime, setSimTime] = useState(0);
  const [isSimPlaying, setIsSimPlaying] = useState(false);

  const [simBgImage, setSimBgImage] = useState<string | null>(null);
  const [preloadedSimBgImage, setPreloadedSimBgImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!simBgImage) {
      setPreloadedSimBgImage(null);
      return;
    }
    const img = new Image();
    img.src = simBgImage;
    const handleLoad = () => {
      setPreloadedSimBgImage(img);
    };
    img.addEventListener('load', handleLoad);
    if (img.complete) {
      setPreloadedSimBgImage(img);
    }
    return () => {
      img.removeEventListener('load', handleLoad);
    };
  }, [simBgImage]);

  const randomizeSimulatorBg = () => {
    if (images && images.length > 0) {
      const validImages = images.filter(img => img.url);
      if (validImages.length > 0) {
        const randomIndex = Math.floor(Math.random() * validImages.length);
        setSimBgImage(validImages[randomIndex].url);
      }
    }
  };

  useEffect(() => {
    if (isOpen && images && images.length > 0) {
      const validImages = images.filter(img => img.url);
      if (validImages.length > 0 && !simBgImage) {
        const randomIndex = Math.floor(Math.random() * validImages.length);
        setSimBgImage(validImages[randomIndex].url);
      }
    }
  }, [isOpen, images, simBgImage]);

  // YouTube audio protect chaotic static noise generator
  const generateChaoticNoiseWav = (): Blob => {
    const sampleRate = 22050; // optimized
    const duration = 120; // 2 minutes
    const totalSamples = sampleRate * duration;
    const channelData = new Float32Array(totalSamples);
    
    let lastOut = 0.0;
    let phase1 = 0;
    let phase2 = 0;
    
    for (let i = 0; i < totalSamples; i++) {
      // 1. White noise
      const white = Math.random() * 2 - 1;
      
      // 2. Brown noise (integrated random walk for deep rumbling hiss)
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      const brown = lastOut * 3.5;
      
      // 3. Frequency Sweep oscillators (whistles & hums)
      const freq1 = 80 + Math.sin(i / 15000) * 60 + Math.sin(i / 130) * 15;
      const freq2 = 1200 + Math.cos(i / 35000) * 800 + Math.sin(i / 400) * 300;
      
      phase1 += (2 * Math.PI * freq1) / sampleRate;
      phase2 += (2 * Math.PI * freq2) / sampleRate;
      
      const osc1 = Math.sin(phase1);
      const osc2 = Math.cos(phase2) * 0.12;
      
      // 4. Short static burp or click (cosmic static)
      let click = 0;
      if (Math.random() < 0.0005) {
        click = (Math.random() * 2 - 1) * 0.7;
      }
      
      // Sum everything and clamp
      let sample = (white * 0.12 + brown * 0.45 + osc1 * 0.15 + osc2 * 0.1 + click * 0.1) * 0.45;
      if (sample > 1.0) sample = 1.0;
      if (sample < -1.0) sample = -1.0;
      
      channelData[i] = sample;
    }
    
    // Pack into standard 16-bit Mono WAV
    const bufferArr = new ArrayBuffer(totalSamples * 2 + 44);
    const view = new DataView(bufferArr);
    
    const setUint32 = (pos: number, val: number) => view.setUint32(pos, val, true);
    const setUint16 = (pos: number, val: number) => view.setUint16(pos, val, true);
    
    // RIFF identifier
    setUint32(0, 0x46464952); // "RIFF"
    setUint32(4, totalSamples * 2 + 36);
    setUint32(8, 0x45564157); // "WAVE"
    
    // fmt subchunk
    setUint32(12, 0x20746d66); // "fmt "
    setUint32(16, 16);
    setUint16(20, 1); // linear PCM
    setUint16(22, 1); // mono
    setUint32(24, sampleRate);
    setUint32(28, sampleRate * 2);
    setUint16(32, 2);
    setUint16(34, 16);
    
    // data subchunk
    setUint32(36, 0x61746164); // "data"
    setUint32(40, totalSamples * 2);
    
    let index = 44;
    for (let i = 0; i < totalSamples; i++) {
      const val = channelData[i];
      const quantized = Math.max(-1, Math.min(1, val)) * 32767;
      view.setInt16(index, quantized, true);
      index += 2;
    }
    
    return new Blob([bufferArr], { type: "audio/wav" });
  };

  // Local popup simulation preview canvas drawing logic
  const drawPopupRender = (canvas: HTMLCanvasElement, eff: any, time: number, text: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Clear with gradient ambient background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    if (preloadedSimBgImage) {
      ctx.drawImage(preloadedSimBgImage, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, w, h);
    }

    // Faint video safety boundary gridlines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Title label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(10, 10, 220, 20);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ TRÌNH GIẢ LẬP CANVAS MẪU CHUẨN 16:9', 16, 20);

    // Resolve style properties
    const firstPreset = presets && presets.length > 0 ? (presets.find((p: any) => p.id === 'preset_1') || presets[0]) : null;
    const fontFamily = eff.fontFamily || firstPreset?.fontFamily || 'Inter';
    const originalFontSize = eff.fontSize || firstPreset?.fontSize || 40;
    const textColor = eff.color || firstPreset?.color || '#FFFFFF';
    const outlineColor = eff.outlineColor || firstPreset?.outlineColor || '#000000';
    const outlineWidth = eff.outlineWidth !== undefined ? eff.outlineWidth : (firstPreset?.outlineWidth !== undefined ? firstPreset.outlineWidth : 1.5);

    // Standard high-res coordinates reference scaling
    const stdW = 1280;
    const stdH = 720;
    const sx = w / stdW;
    const sy = h / stdH;

    const blurHeight = eff.blurBgHeight || 285;
    const blurWidthPercent = eff.blurBgWidth || 100;
    const blurShape = eff.blurBgShape || 'rectangle';

    let stdBoxW = stdW * (blurWidthPercent / 100);
    let stdBoxH = blurHeight;

    if (blurShape === 'circle') {
      const d = Math.max(stdBoxW, stdBoxH);
      stdBoxW = d;
      stdBoxH = d;
    }

    // Local wrapAndFormatText helper
    const wrapAndFormatText = (tempCtx: CanvasRenderingContext2D, textStr: string, maxW: number): string[] => {
      const paragraphs = textStr.split('\n');
      const linesArr: string[] = [];
      
      for (const para of paragraphs) {
        if (para.trim() === '') {
          linesArr.push('');
          continue;
        }
        const wordsArr = para.split(' ');
        let currentLine = '';
        
        for (const word of wordsArr) {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const testWidth = tempCtx.measureText(testLine).width;
          
          if (testWidth > maxW) {
            if (tempCtx.measureText(word).width > maxW) {
              if (currentLine) {
                linesArr.push(currentLine);
                currentLine = '';
              }
              let tempLine = '';
              for (let i = 0; i < word.length; i++) {
                const letter = word[i];
                const letterLine = tempLine + letter;
                if (tempCtx.measureText(letterLine).width > maxW) {
                  linesArr.push(tempLine);
                  tempLine = letter;
                } else {
                  tempLine = letterLine;
                }
              }
              currentLine = tempLine;
            } else {
              if (currentLine) {
                linesArr.push(currentLine);
              }
              currentLine = word;
            }
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          linesArr.push(currentLine);
        }
      }
      return linesArr;
    };

    // Strict alignment and wrap width settings
    const isTraditional = !eff.enableBlurBg;
    const maxAllowedWidth = isTraditional ? Math.max(200, stdW * 0.96) : Math.max(40, stdBoxW - 30);
    const maxAllowedHeight = isTraditional ? Math.max(100, stdH * 0.45) : Math.max(20, stdBoxH - 12);
    const minFontSize = 12;

    let currentFontSize = originalFontSize;
    ctx.font = `bold ${currentFontSize}px "${fontFamily}", "Inter", "Segoe UI", sans-serif`;

    let lines = wrapAndFormatText(ctx, text, maxAllowedWidth);
    let lineHeight = currentFontSize * 1.35;
    let totalTextHeight = lines.length * lineHeight;
    let maxLineWidth = 0;
    for (const l of lines) {
      const lw = ctx.measureText(l).width;
      if (lw > maxLineWidth) maxLineWidth = lw;
    }

    while (currentFontSize > minFontSize) {
      if (maxLineWidth <= maxAllowedWidth && totalTextHeight <= maxAllowedHeight) {
        break;
      }
      currentFontSize -= 1;
      ctx.font = `bold ${currentFontSize}px "${fontFamily}", "Inter", "Segoe UI", sans-serif`;
      lines = wrapAndFormatText(ctx, text, maxAllowedWidth);
      lineHeight = currentFontSize * 1.35;
      totalTextHeight = lines.length * lineHeight;
      let tempMaxW = 0;
      for (const hline of lines) {
        const lw = ctx.measureText(hline).width;
        if (lw > tempMaxW) tempMaxW = lw;
      }
      maxLineWidth = tempMaxW;
    }

    if (isTraditional && lines.length > 3) {
      lines = lines.slice(0, 3);
      totalTextHeight = lines.length * lineHeight;
    }

    // Align and constrain coordinates
    let subX = 50;
    let subY = 85;
    if (eff.enableBlurBg) {
      subX = (eff.blurBgX !== undefined) ? eff.blurBgX : ((eff.subtitleX !== undefined) ? eff.subtitleX : 50);
      subY = (eff.blurBgY !== undefined) ? eff.blurBgY : ((eff.subtitleY !== undefined) ? eff.subtitleY : 85);
    } else {
      subX = (eff.subtitleX !== undefined) ? eff.subtitleX : 50;
      subY = (eff.subtitleY !== undefined) ? eff.subtitleY : 85;
    }

    const rawBlurBaseX = stdW * (subX / 100);
    const rawBlurBaseY = stdH * (subY / 100);

    const margin = 10;
    let safeBlurBaseX = rawBlurBaseX;
    let safeBlurBaseY = rawBlurBaseY;
    let safeBaseX = rawBlurBaseX;
    let safeBaseY = rawBlurBaseY;

    if (isTraditional) {
      const textW = maxLineWidth;
      const textH = totalTextHeight;
      const paddingYWall = 35;
      const paddingXWall = 25;

      safeBaseX = Math.max(textW / 2 + paddingYWall, Math.min(stdW - textW / 2 - paddingXWall, rawBlurBaseX));
      safeBaseY = Math.max(textH / 2 + paddingYWall, Math.min(stdH - textH / 2 - paddingYWall, rawBlurBaseY));
    } else {
      if (stdBoxW >= stdW - margin * 2) {
        safeBlurBaseX = stdW / 2;
      } else {
        safeBlurBaseX = Math.max(stdBoxW / 2 + margin, Math.min(stdW - stdBoxW / 2 - margin, rawBlurBaseX));
      }

      if (stdBoxH >= stdH - margin * 2) {
        safeBlurBaseY = stdH / 2;
      } else {
        safeBlurBaseY = Math.max(stdBoxH / 2 + margin, Math.min(stdH - stdBoxH / 2 - margin, rawBlurBaseY));
      }

      safeBaseX = (eff.enableBlurBg && blurWidthPercent < 100) ? safeBlurBaseX : rawBlurBaseX;
      safeBaseY = (eff.enableBlurBg && stdBoxH < stdH - margin * 2) ? safeBlurBaseY : rawBlurBaseY;
    }

    // Proportional dimensions
    const finalBoxW = stdBoxW * sx;
    const finalBoxH = stdBoxH * sy;
    const finalSafeBlurBaseX = safeBlurBaseX * sx;
    const finalSafeBlurBaseY = safeBlurBaseY * sy;

    const boxX = finalSafeBlurBaseX - finalBoxW / 2;
    const boxY = finalSafeBlurBaseY - finalBoxH / 2;

    let bgProgress = 1.0;
    const inDuration = 0.35;
    const outDuration = 0.35;
    if (time < inDuration) {
      bgProgress = time / inDuration;
    } else if (time > 2.65) {
      bgProgress = Math.max(0, Math.min(1, (3.0 - time) / outDuration));
    }

    let bgOffsetX = 0;
    let bgOffsetY = 0;
    let blurInOutDir = eff.blurBgInOutEffect || 'bottom-to-top';
    if (blurInOutDir === 'random') {
      blurInOutDir = 'bottom-to-top';
    }
    const blurOpacity = eff.blurBgOpacity !== undefined ? eff.blurBgOpacity : 0.5;

    if (blurInOutDir === 'top-to-bottom') {
      bgOffsetY = -(1 - bgProgress) * (boxY + finalBoxH + 50 * sy);
    } else if (blurInOutDir === 'bottom-to-top') {
      bgOffsetY = (1 - bgProgress) * (h - boxY + 50 * sy);
    } else if (blurInOutDir === 'left-to-right') {
      bgOffsetX = -(1 - bgProgress) * (boxX + finalBoxW + 50 * sx);
    } else if (blurInOutDir === 'right-to-left') {
      bgOffsetX = (1 - bgProgress) * (w - boxX + 50 * sx);
    }

    if (eff.enableBlurBg) {
      ctx.save();
      ctx.beginPath();

      const drawShapePath = (x: number, y: number, bW: number, bH: number) => {
        if (blurShape === 'circle') {
          ctx.arc(x + bW / 2, y + bH / 2, bW / 2, 0, Math.PI * 2);
        } else if (blurShape === 'pill') {
          const radius = Math.min(bW, bH) / 2;
          if (ctx.roundRect) ctx.roundRect(x, y, bW, bH, radius);
          else ctx.rect(x, y, bW, bH);
        } else if (blurShape === 'rounded') {
          const radius = 16 * sx;
          if (ctx.roundRect) ctx.roundRect(x, y, bW, bH, radius);
          else ctx.rect(x, y, bW, bH);
        } else {
          ctx.rect(x, y, bW, bH);
        }
      };

      drawShapePath(boxX + bgOffsetX, boxY + bgOffsetY, finalBoxW, finalBoxH);
      ctx.clip();

      const hexToRgb = (hexStr: string) => {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        const fullHex = hexStr.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
      };

      const rgb = hexToRgb(eff.blurBgColorHex || '#000000');
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${blurOpacity})`;
      ctx.fillRect(boxX + bgOffsetX, boxY + bgOffsetY, finalBoxW, finalBoxH);

      const borderHex = eff.blurBgBorderColorHex;
      if (borderHex && borderHex !== 'none' && borderHex !== '') {
        const borderRgb = hexToRgb(borderHex);
        ctx.strokeStyle = `rgba(${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}, ${0.8 * bgProgress})`;
        ctx.lineWidth = 1.5 * sx;
        ctx.beginPath();
        drawShapePath(boxX + bgOffsetX, boxY + bgOffsetY, finalBoxW, finalBoxH);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Subtitle text rendering animations
    let scale = 1.0;
    let textOpacity = 1.0;
    let animOffsetY = 0;
    let animOffsetX = 0;

    if (time < inDuration) {
      const p = time / inDuration;
      const effIn = eff.subtitleEffectIn || 'zoom_fade';
      if (effIn === 'zoom_fade') {
        scale = 0.75 + 0.25 * p;
        textOpacity = p;
      } else if (effIn === 'bounce' || effIn === 'bounce_in') {
        scale = p < 0.75 ? (p / 0.75) * 1.25 : 1.25 - ((p - 0.75) / 0.25) * 0.25;
        textOpacity = Math.min(1.0, p * 1.5);
      } else if (effIn === 'slide_up') {
        animOffsetY = (1 - p) * 20 * sy;
        textOpacity = p;
      } else if (effIn === 'slide_down') {
        animOffsetY = -(1 - p) * 20 * sy;
        textOpacity = p;
      } else if (effIn === 'slide_left') {
        animOffsetX = (1 - p) * 30 * sx;
        textOpacity = p;
      } else if (effIn === 'slide_right') {
        animOffsetX = -(1 - p) * 30 * sx;
        textOpacity = p;
      } else if (effIn === 'zoom_in') {
        scale = 0.1 + 0.9 * p;
        textOpacity = p;
      } else if (effIn === 'zoom_out') {
        scale = 1.8 - 0.8 * p;
        textOpacity = p;
      } else if (effIn === 'fade_in') {
        textOpacity = p;
      }
    } else if (time > 2.65) {
      const p = Math.max(0, Math.min(1, (3.0 - time) / outDuration));
      const effOut = eff.subtitleEffectOut || 'fade';
      if (effOut === 'fade') {
        textOpacity = p;
      } else if (effOut === 'slide_down') {
        animOffsetY = (1 - p) * 20 * sy;
        textOpacity = p;
      } else if (effOut === 'slide_up') {
        animOffsetY = -(1 - p) * 20 * sy;
        textOpacity = p;
      } else if (effOut === 'zoom_out') {
        scale = 0.6 + 0.4 * p;
        textOpacity = p;
      } else if (effOut === 'none') {
        textOpacity = 1.0;
      }
    }

    const showEff = eff.subtitleShowEffect || 'none';
    let showScale = 1.0;
    let glowActive = false;

    if (time >= inDuration && time <= 2.65) {
      if (showEff === 'pulse_grow') {
        showScale = 1.0 + Math.sin((time - inDuration) * 8) * 0.08;
      } else if (showEff === 'bounce_loop') {
        animOffsetY += Math.abs(Math.sin((time - inDuration) * 6)) * -10 * sy;
      } else if (showEff === 'flicker_warm') {
        textOpacity *= 0.85 + Math.random() * 0.15;
      } else if (showEff === 'slide_up_down') {
        animOffsetY += Math.sin((time - inDuration) * 4) * 8 * sy;
      } else if (showEff === 'slide_left_right') {
        animOffsetX += Math.sin((time - inDuration) * 4) * 12 * sx;
      } else if (showEff === 'wave_text') {
        animOffsetY += Math.sin(time * 5) * 6 * sy;
        animOffsetX += Math.cos(time * 5) * 4 * sx;
      } else if (showEff === 'shake_vibe') {
        animOffsetX += (Math.random() - 0.5) * 8 * sx;
        animOffsetY += (Math.random() - 0.5) * 8 * sy;
      } else if (showEff === 'tiktok_glow') {
        glowActive = true;
        animOffsetX += (Math.random() - 0.5) * 2 * sx;
      }
    }

    ctx.save();
    const finalFontSize = currentFontSize * sx;
    ctx.font = `bold ${finalFontSize}px "${fontFamily}", "Inter", "Segoe UI", sans-serif`;
    ctx.textAlign = (isTraditional ? 'center' : (eff.subtitleAlign || 'center')) as any;
    ctx.textBaseline = 'middle';

    let finalOffsetX = animOffsetX;
    let finalOffsetY = animOffsetY;
    if (eff.enableBlurBg && eff.lockTextInBlur) {
      finalOffsetX += bgOffsetX;
      finalOffsetY += bgOffsetY;
    }

    const finalSafeBaseX = safeBaseX * sx;
    const finalSafeBaseY = safeBaseY * sy;

    ctx.translate(finalSafeBaseX + finalOffsetX, finalSafeBaseY + finalOffsetY);
    ctx.scale(scale * showScale, scale * showScale);
    ctx.globalAlpha = textOpacity;

    const scaledOutlineWidth = outlineWidth * sx;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = scaledOutlineWidth;
    ctx.lineJoin = 'round';

    if (showEff === 'tiktok_glow' || glowActive) {
      ctx.shadowColor = '#FF0050';
      ctx.shadowBlur = 12 * sx;
    }

    const finalLineHeight = lineHeight * sy;
    const startY = -((lines.length * finalLineHeight) / 2) + (finalLineHeight / 2);

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const itemY = startY + (i * finalLineHeight);

      const words = lineText.split(/\s+/);
      const isHighlightMode = showEff === 'highlight_two_words' || eff.enableTextHighlight || eff.subtitleHighlightMode === 'random_pair';

      if (isHighlightMode && words.length >= 2 && time >= inDuration && time <= 2.65) {
        const highlightIndex = Math.min(words.length - 2, Math.max(0, Math.floor(words.length / 2) - 1));
        const spaceW = ctx.measureText(' ').width;
        const wordWidths = words.map(wd => ctx.measureText(wd).width);
        const totalW = wordWidths.reduce((a, b) => a + b, 0) + (words.length - 1) * spaceW;

        let startX = 0;
        if (ctx.textAlign === 'center') {
          startX = -totalW / 2;
        } else if (ctx.textAlign === 'right') {
          startX = -totalW;
        }

        const prevAlign = ctx.textAlign;
        ctx.textAlign = 'left';
        let currentX = 0;

        for (let wIdx = 0; wIdx < words.length; wIdx++) {
          const isHighlighted = (wIdx === highlightIndex || wIdx === highlightIndex + 1);
          ctx.fillStyle = isHighlighted ? (eff.subtitleHighlightColor || '#EAB308') : textColor;

          if (scaledOutlineWidth > 0) {
            ctx.strokeText(words[wIdx], startX + currentX, itemY);
          }
          ctx.fillText(words[wIdx], startX + currentX, itemY);
          currentX += wordWidths[wIdx] + spaceW;
        }
        ctx.textAlign = prevAlign;
      } else {
        if (scaledOutlineWidth > 0) {
          ctx.strokeText(lineText, 0, itemY);
        }
        ctx.fillStyle = textColor;
        ctx.fillText(lineText, 0, itemY);
      }
    }

    ctx.restore();
  };

  // Sync sound level volume
  useEffect(() => {
    if (noiseAudio) {
      noiseAudio.volume = localNoiseVolume / 100;
    }
  }, [localNoiseVolume, noiseAudio]);

  // Cleanup background noise on close / destruction
  useEffect(() => {
    return () => {
      if (noiseAudio) {
        try {
          noiseAudio.pause();
        } catch {}
      }
    };
  }, [noiseAudio]);

  // Sync animation loops of the saved effect edit preview popup 
  useEffect(() => {
    if (!popupEditingEffect || !simPopupPlaying) return;

    let startTime = Date.now() - (simPopupTime * 1000);
    let id = requestAnimationFrame(function tick() {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= 3.0) {
        startTime = Date.now();
        setSimPopupTime(0);
      } else {
        setSimPopupTime(elapsed);
      }
      id = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(id);
  }, [popupEditingEffect, simPopupPlaying]);

  // Trigger preview rendering on update changes
  useEffect(() => {
    if (!popupEditingEffect) return;
    const canvas = document.getElementById('popup-preview-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    drawPopupRender(canvas, popupEditingEffect, simPopupTime, simPopupText);
  }, [popupEditingEffect, simPopupTime, simPopupText, presets, preloadedSimBgImage]);

  // Text Effects Preset templates local storage states
  const [newEffectTemplateName, setNewEffectTemplateName] = useState('');
  const [savedEffects, setSavedEffects] = useState<Array<any>>(() => {
    const defaultCobanA = {
      id: 'effect_coban_A',
      name: 'CƠ BẢN',
      group: 'A',
      subtitleX: 50,
      subtitleY: 85,
      subtitleAlign: 'center',
      subtitleEffectIn: 'zoom_fade',
      subtitleEffectOut: 'zoom_fade',
      subtitleShowEffect: 'none',
      enableBlurBg: false,
      blurBgHeight: 45,
      blurBgWidth: 95,
      blurBgOpacity: 20,
      blurBgInOutEffect: 'fade_grow',
      blurBgX: 50,
      blurBgY: 85,
      blurBgShape: 'rect',
      blurBgColorHex: '#000000',
      blurBgBorderColorHex: 'none',
      blurBgBlurAmount: 18,
      lockTextInBlur: false,
    };

    const saved = safeLocalStorage.getItem('vsync_saved_effects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out legacy default pre-saved effects
          const list = parsed.filter(eff => eff.id !== 'effect_default' && eff.id !== 'effect_cinematic');
          if (!list.some(eff => (eff.group || 'A') === 'A' && eff.name === 'CƠ BẢN')) {
            return [defaultCobanA, ...list];
          }
          return list;
        }
      } catch (e) {
        console.error("Lỗi parse saved text effects:", e);
      }
    }
    return [defaultCobanA];
  });

  // Saving preset effects on collection adjustments
  useEffect(() => {
    try {
      safeLocalStorage.setItem('vsync_saved_effects', JSON.stringify(savedEffects));
    } catch (e) {
      console.warn("Lỗi lưu savedEffects vào safeLocalStorage:", e);
    }
  }, [savedEffects]);

  // Simulated Animation Timer
  useEffect(() => {
    if (!isOpen || activeTab !== 'font') return;
    
    if (!isSimPlaying) {
      setSimTime(1.5); // Static fully shown state in intermediate
      return;
    }
    
    // Play transition once from 0 to 3.8 seconds (entrance -> visible -> exit)
    const startTimeStamp = Date.now();
    const interval = setInterval(() => {
      if (isDragSimActive) {
        setIsSimPlaying(false);
        setSimTime(1.5);
        return;
      }
      const elapsed = (Date.now() - startTimeStamp) / 1000;
      if (elapsed >= 3.8) {
        setIsSimPlaying(false);
        setSimTime(1.5);
        clearInterval(interval);
      } else {
        setSimTime(elapsed);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isOpen, activeTab, isSimPlaying, isDragSimActive]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Stop any active preview test immediately on interaction
    setIsSimPlaying(false);
    setSimTime(1.5);

    if (!containerRef.current) return;
    setIsDragSimActive(true);
    containerRef.current.setPointerCapture(e.pointerId);

    updateCoordsFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragSimActive) return;
    updateCoordsFromPointer(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragSimActive) return;
    setIsDragSimActive(false);
    if (containerRef.current) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleLogoPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!logoContainerRef.current) return;
    setIsDraggingLogo(true);
    logoContainerRef.current.setPointerCapture(e.pointerId);
    
    const rect = logoContainerRef.current.getBoundingClientRect();
    const x = parseFloat(Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100)).toFixed(1));
    const y = parseFloat(Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100)).toFixed(1));
    
    onConfigChange({
      ...config,
      logoX: x,
      logoY: y
    });
  };

  const handleLogoPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingLogo || !logoContainerRef.current) return;
    const rect = logoContainerRef.current.getBoundingClientRect();
    const x = parseFloat(Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100)).toFixed(1));
    const y = parseFloat(Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100)).toFixed(1));
    
    onConfigChange({
      ...config,
      logoX: x,
      logoY: y
    });
  };

  const handleLogoPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingLogo) return;
    setIsDraggingLogo(false);
    if (logoContainerRef.current) {
      try {
        logoContainerRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const updateCoordsFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    const xRaw = ((e.clientX - rect.left) / rect.width) * 100;
    const yRaw = ((e.clientY - rect.top) / rect.height) * 100;

    // Strict 16:9 bounds to prevent the blur backdrop from sticking out of the canvas
    const simHeightPercent = ((config.blurBgHeight || 285) / 720) * 100;
    const simWidthPercent = config.blurBgWidth || 100;

    const halfW = simWidthPercent / 2;
    const halfH = simHeightPercent / 2;

    let minX = Math.max(2, halfW);
    let maxX = Math.min(98, 100 - halfW);
    let minY = Math.max(2, halfH);
    let maxY = Math.min(98, 100 - halfH);

    // Safe guards in case width or height exceeds 100%
    if (minX >= maxX) {
      minX = 50;
      maxX = 50;
    }
    if (minY >= maxY) {
      minY = 50;
      maxY = 50;
    }

    const x = parseFloat(Math.max(minX, Math.min(maxX, xRaw)).toFixed(1));
    const y = parseFloat(Math.max(minY, Math.min(maxY, yRaw)).toFixed(1));
    
    // Maintain absolute alignment with the first styling preset
    if (presets && presets.length > 0) {
      const updated = [...presets];
      updated[0] = {
        ...updated[0],
        presetY: Math.round(y)
      };
      onPresetsChange(updated);
    }

    onConfigChange({
      ...config,
      subtitleX: x,
      subtitleY: y,
      blurBgX: x,
      blurBgY: y
    });
  };

  const handleStylePresetPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stylePresetCanvasRef.current || !localEditingPreset) return;
    setIsDraggingStylePresetY(true);
    stylePresetCanvasRef.current.setPointerCapture(e.pointerId);
    updateStylePresetYFromPointer(e);
  };

  const handleStylePresetPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingStylePresetY || !stylePresetCanvasRef.current || !localEditingPreset) return;
    updateStylePresetYFromPointer(e);
  };

  const handleStylePresetPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingStylePresetY) return;
    setIsDraggingStylePresetY(false);
    if (stylePresetCanvasRef.current) {
      try {
        stylePresetCanvasRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const updateStylePresetYFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stylePresetCanvasRef.current || !localEditingPreset) return;
    const rect = stylePresetCanvasRef.current.getBoundingClientRect();
    const yRaw = ((e.clientY - rect.top) / rect.height) * 100;
    const y = Math.round(Math.max(5, Math.min(95, yRaw)));
    setLocalEditingPreset(prev => prev ? { ...prev, presetY: y } : null);
  };

  const syncHighlightColorToPresets = (color: string) => {
    if (presets && presets.length > 0) {
      const updated = presets.map((p, idx) => {
        if (idx === 0 || p.id === config.activePresetId) {
          return {
            ...p,
            subtitleHighlightColor: color
          };
        }
        return p;
      });
      onPresetsChange(updated);
    }
  };

  const firstPreset = presets && presets.length > 0 ? presets[0] : null;
  const simFontFamily = firstPreset ? firstPreset.fontFamily : 'Josefin Sans, sans-serif';
  const simFontSizeBase = firstPreset ? firstPreset.fontSize : (config.subtitleFontSize || 24);
  const simColorBase = firstPreset ? firstPreset.color : (config.subtitleColor || '#FFFFFF');
  const simOutlineColorBase = firstPreset ? firstPreset.outlineColor : (config.subtitleOutlineColor || '#000000');
  const simOutlineWidthBase = firstPreset ? firstPreset.outlineWidth !== undefined ? firstPreset.outlineWidth : 3 : (config.subtitleOutlineWidth !== undefined ? config.subtitleOutlineWidth : 3);

  // Derive Simulator Animations values based on loop timer (4.0s total) - English Text
  let simText = "This is a longer sample subtitle line designed to test multi-line wrapping and responsive pointer positioning inside the interactive simulator!";
  let simOpacity = 1;
  let simScaleX = 1;
  let simScaleY = 1;
  let simOffsetX = 0;
  let simOffsetY = 0;
  let simRotate = 0;
  let simColor = simColorBase;
  let simShadow = '';

  let simBgProgress = 1; 
  let simBgOffsetX = 0;
  let simBgOffsetY = 0;

  const activeSimTime = isDragSimActive ? 1.5 : simTime;

  if (activeSimTime < 1.0) {
    const progress = activeSimTime; 
    simBgProgress = progress;
    
    let bgDir = config.blurBgInOutEffect || 'bottom-to-top';
    if (bgDir === 'random') {
      bgDir = 'bottom-to-top';
    }
    if (bgDir === 'bottom-to-top') {
      simBgOffsetY = 60 * (1 - progress);
    } else if (bgDir === 'top-to-bottom') {
      simBgOffsetY = -60 * (1 - progress);
    } else if (bgDir === 'left-to-right') {
      simBgOffsetX = -120 * (1 - progress);
    } else if (bgDir === 'right-to-left') {
      simBgOffsetX = 120 * (1 - progress);
    }

    const modeIn = config.subtitleEffectIn || 'zoom_fade';
    if (modeIn === 'zoom_fade') {
      simOpacity = progress;
      simScaleX = 0.75 + 0.25 * progress;
      simScaleY = 0.75 + 0.25 * progress;
    } else if (modeIn === 'bounce' || modeIn === 'bounce_in') {
      simOpacity = Math.min(1.0, progress * 1.5);
      const bs = progress < 0.74 ? (progress / 0.74) * 1.25 : 1.25 - ((progress - 0.74) / 0.26) * 0.25;
      simScaleX = bs;
      simScaleY = bs;
    } else if (modeIn === 'slide_up') {
      simOpacity = progress;
      simOffsetY = 25 * (1 - progress);
    } else if (modeIn === 'slide_down') {
      simOpacity = progress;
      simOffsetY = -25 * (1 - progress);
    } else if (modeIn === 'slide_left') {
      simOpacity = progress;
      simOffsetX = 40 * (1 - progress);
    } else if (modeIn === 'slide_right') {
      simOpacity = progress;
      simOffsetX = -40 * (1 - progress);
    } else if (modeIn === 'zoom_in') {
      simOpacity = progress;
      simScaleX = 0.1 + 0.9 * progress;
      simScaleY = 0.1 + 0.9 * progress;
    } else if (modeIn === 'zoom_out') {
      simOpacity = progress;
      simScaleX = 2.0 - 1.0 * progress;
      simScaleY = 2.0 - 1.0 * progress;
    } else if (modeIn === 'flip_in') {
      simOpacity = progress;
      simScaleX = 1;
      simScaleY = progress;
    } else if (modeIn === 'stretch_in') {
      simOpacity = progress;
      simScaleX = progress < 0.6 ? (progress / 0.6) * 1.4 : 1.4 - ((progress - 0.6) / 0.4) * 0.4;
      simScaleY = progress < 0.6 ? (progress / 0.6) * 0.7 : 0.7 + ((progress - 0.6) / 0.4) * 0.3;
    } else if (modeIn === 'fade_in') {
      simOpacity = progress;
    } else if (modeIn === 'typewriter') {
      simOpacity = 1;
      const chars = Math.max(0, Math.floor(simText.length * progress));
      simText = simText.substring(0, chars);
    } else {
      simOpacity = 1;
    }
  } else if (activeSimTime >= 3.0) {
    const progress = Math.min(1.0, (activeSimTime - 3.0) / 0.8);
    simBgProgress = 1 - progress;

    let bgDir = config.blurBgInOutEffect || 'bottom-to-top';
    if (bgDir === 'random') {
      bgDir = 'bottom-to-top';
    }
    if (bgDir === 'bottom-to-top') {
      simBgOffsetY = 60 * progress;
    } else if (bgDir === 'top-to-bottom') {
      simBgOffsetY = -60 * progress;
    } else if (bgDir === 'left-to-right') {
      simBgOffsetX = -120 * progress;
    } else if (bgDir === 'right-to-left') {
      simBgOffsetX = 120 * progress;
    }

    const modeOut = config.subtitleEffectOut || 'fade';
    if (modeOut === 'fade') {
      simOpacity = 1 - progress;
    } else if (modeOut === 'slide_down') {
      simOpacity = 1 - progress;
      simOffsetY = 25 * progress;
    } else if (modeOut === 'slide_up') {
      simOpacity = 1 - progress;
      simOffsetY = -25 * progress;
    } else if (modeOut === 'slide_left') {
      simOpacity = 1 - progress;
      simOffsetX = -40 * progress;
    } else if (modeOut === 'slide_right') {
      simOpacity = 1 - progress;
      simOffsetX = 40 * progress;
    } else if (modeOut === 'zoom_in') {
      simOpacity = 1 - progress;
      const zs = 1.0 + progress * 1.5;
      simScaleX = zs;
      simScaleY = zs;
    } else if (modeOut === 'zoom_out') {
      simOpacity = 1 - progress;
      const zs = 1.0 - 0.5 * progress;
      simScaleX = zs;
      simScaleY = zs;
    } else if (modeOut === 'flip_out') {
      simOpacity = 1 - progress;
      simScaleX = 1;
      simScaleY = 1 - progress;
    } else if (modeOut === 'stretch_out') {
      simOpacity = 1 - progress;
      simScaleX = (1 - progress) * 1.3;
      simScaleY = (1 - progress) * 0.7;
    } else {
      simOpacity = 1;
    }
  } else {
    simOpacity = 1;
    simScaleX = 1;
    simScaleY = 1;
    simBgProgress = 1;
  }

  // Live active show continuous animations for simulator
  if (isSimPlaying && !isDragSimActive) {
    const elapsed = activeSimTime;
    const currentShowEffect = config.subtitleShowEffect || 'none';
    
    if (currentShowEffect === 'flicker_warm') {
      const flicker = 0.88 + 0.12 * Math.sin(elapsed * 25) * Math.cos(elapsed * 12);
      simOpacity *= Math.max(0, Math.min(1, flicker));
      simShadow = `0 0 ${10 + 6 * Math.sin(elapsed * 15)}px #F59E0B`;
    } else if (currentShowEffect === 'bounce_loop') {
      simOffsetY = 12 * Math.sin(elapsed * 4.5);
    } else if (currentShowEffect === 'pulse_grow') {
      const grow = 1.0 + 0.07 * Math.sin(elapsed * 4.0);
      simScaleX *= grow;
      simScaleY *= grow;
    } else if (currentShowEffect === 'slide_up_down') {
      simOffsetY = 20 * Math.sin(elapsed * 3.0);
    } else if (currentShowEffect === 'slide_left_right') {
      simOffsetX = 25 * Math.sin(elapsed * 3.0);
    } else if (currentShowEffect === 'wave_text') {
      simRotate = 0.05 * Math.sin(elapsed * 4.0) * (180 / Math.PI);
    } else if (currentShowEffect === 'shake_vibe') {
      simOffsetX = Math.sin(elapsed * 60) * 4;
      simOffsetY = Math.cos(elapsed * 55) * 3;
    } else if (currentShowEffect === 'tiktok_glow') {
      const shift = 4 * Math.sin(elapsed * 18);
      const isCyan = Math.sin(elapsed * 10) > 0;
      simShadow = `${shift}px ${-shift * 0.5}px 12px ${isCyan ? '#00f3ff' : '#ff0055'}`;
    } else if (currentShowEffect === 'glitch_cyber') {
      const seed = Math.sin(elapsed * 40);
      if (Math.abs(seed) > 0.85) {
        simOffsetX = seed * 8;
        simOffsetY = Math.cos(elapsed * 40) * 5;
        simShadow = `0 0 8px #00ff33`;
      }
    } else if (currentShowEffect === 'rainbow_flow') {
      const hue = (elapsed * 90) % 360;
      simColor = `hsl(${hue}, 95%, 65%)`;
    } else if (currentShowEffect === 'typewriter') {
      const typeDuration = 3.8 * (2 / 3);
      const p = Math.min(1.0, activeSimTime / typeDuration);
      const chars = Math.max(0, Math.floor(simText.length * p));
      simText = simText.substring(0, chars);
      if (p < 1.0 && Math.floor(activeSimTime * 10) % 2 === 0) {
        simText += '_';
      }
    }
  }

  const introFileInputRef = useRef<HTMLInputElement>(null);
  const outroFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const updateConfig = (key: keyof RenderConfig, value: any) => {
    onConfigChange({
      ...config,
      [key]: value
    });
  };

  const handleSavePreset = () => {
    const name = presetFormName.trim() || `Phong cách #${presets.length + 1}`;
    const newPreset: SubtitlePreset = {
      id: editingPresetId || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      fontFamily: presetFormFontFamily,
      fontSize: presetFormFontSize,
      color: presetFormColor,
      outlineColor: presetFormOutlineColor,
      outlineWidth: presetFormOutlineWidth,
      bgColor: presetFormBgColor,
      bgOpacity: presetFormBgOpacity,
      position: presetFormPosition,
      effect: presetFormEffect
    };

    let updated: SubtitlePreset[];
    if (editingPresetId) {
      updated = presets.map((p) => (p.id === editingPresetId ? newPreset : p));
    } else {
      updated = [...presets, newPreset];
    }

    onPresetsChange(updated);
    resetPresetForm();
  };

  const handleEditPreset = (preset: SubtitlePreset) => {
    setEditingPresetId(preset.id);
    setPresetFormName(preset.name);
    setPresetFormFontFamily(preset.fontFamily);
    setPresetFormFontSize(preset.fontSize);
    setPresetFormColor(preset.color);
    setPresetFormOutlineColor(preset.outlineColor);
    setPresetFormOutlineWidth(preset.outlineWidth);
    setPresetFormBgColor(preset.bgColor);
    setPresetFormBgOpacity(preset.bgOpacity);
    setPresetFormPosition(preset.position);
    setPresetFormEffect(preset.effect);
    setIsFormOpen(true);
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    onPresetsChange(updated);
    
    // Fallback if the active preset gets deleted
    if (config.activePresetId === id) {
      updateConfig('activePresetId', 'default');
    }
  };

  const resetPresetForm = () => {
    setEditingPresetId(null);
    setPresetFormName('');
    setPresetFormFontFamily('Montserrat');
    setPresetFormFontSize(24);
    setPresetFormColor('#FFFFFF');
    setPresetFormOutlineColor('#000000');
    setPresetFormOutlineWidth(4);
    setPresetFormBgColor('#000000');
    setPresetFormBgOpacity(0.4);
    setPresetFormPosition('bottom-center');
    setPresetFormEffect('standard');
    setIsFormOpen(false);
  };

  const handleFileChange = (type: 'intro' | 'outro', e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onCustomBgUploaded(type, files[0]);
    }
  };

  // Filter character images to use in background selection (skip custom virtual backgrounds themselves)
  const selectableImages = images.filter(img => img.id !== 'intro-bg-custom' && img.id !== 'outro-bg-custom');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" id="settings-modal-overlay">
      <div 
        className="bg-[#181a1d] border border-white/10 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-[#24292d] flex items-center justify-[space-between] justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-md font-bold text-white tracking-tight uppercase">
                Bảng điều khiển Cài đặt Video
              </h2>
              <p className="text-[11px] text-white/40">
                Tinh chỉnh công nghệ hiển thị, phong cách chữ và các đoạn mở đầu/kết thúc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Categories Tab Bar */}
        <div className="flex border-b border-white/5 bg-[#050505]/40 p-2 gap-1 col-span-4">
          <button
            onClick={() => setActiveTab('bg-effect')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'bg-effect'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={13} /> Hiệu ứng nền
          </button>
          <button
            onClick={() => setActiveTab('display')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'display'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film size={13} /> Hiển thị &amp; Hiệu ứng
          </button>
          <button
            onClick={() => setActiveTab('font')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'font'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Type size={13} /> Chữ
          </button>
          <button
            onClick={() => setActiveTab('intro-outro')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'intro-outro'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={13} /> Intro &amp; Outro
          </button>
          <button
            onClick={() => setActiveTab('bg-music')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'bg-music'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Music size={13} /> Nhạc nền ({bgMusicFiles.length})
          </button>
          <button
            onClick={() => setActiveTab('behavior')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'behavior'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu size={13} /> Hành vi
          </button>
        </div>

        {/* Content Body Selection Panels */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#202528]/35">
          
          {/* Tab 0: Background Effects Config */}
          {activeTab === 'bg-effect' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-xs text-amber-300 leading-relaxed">
                <span className="text-sm font-bold">⚠️</span>
                <div>
                  <p className="font-bold mb-0.5">Xử lý đồ họa & Cảnh báo Tốc độ Render</p>
                  <p className="opacity-80 mb-2">
                    Các hiệu ứng này được dựng bằng GPU/Canvas trực tiếp trên máy của bạn và hoàn toàn miễn phí. Tuy nhiên, <strong>việc thêm quá nhiều hiệu ứng hoặc bật liên tục sẽ làm tăng đáng kể thời gian xuất/render video</strong>.
                  </p>
                  <p className="opacity-80">
                    <strong>Lời khuyên:</strong> Hãy hạn chế bật hiệu ứng cho toàn bộ video. Thay vào đó, bạn nên đặt <em>"Khoảng cách xuất hiện"</em> (ví dụ: cứ sau 3-5 đoạn mới hiển thị 1-2 đoạn có hiệu ứng) để tạo điểm nhấn vừa đủ và xuất video nhanh hơn!
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 font-medium block mb-2 font-semibold text-zinc-300">Lựa chọn Hiệu ứng Nền hoạt họa:</label>
                <select
                  value={config.bgEffect || 'none'}
                  onChange={(e) => updateConfig('bgEffect', e.target.value)}
                  className="w-full text-sm bg-[#050505] border border-white/10 rounded-lg px-3 py-2.5 text-white/90 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="none">❌ KHÔNG SỬ DỤNG (Không có hiệu ứng)</option>
                  <option value="random">🔀 NGẪU NHIÊN TẤT CẢ (Đổi ngẫu nhiên theo từng đoạn phụ đề)</option>
                  <option value="snow">❄ TUYẾT RƠI (Hạt tuyết nhỏ rơi nhẹ nhàng, êm dịu)</option>
                  <option value="snowflake">❅ BÔNG TUYẾT LỚN (Bông tuyết hình sao xoay tròn trôi chậm)</option>
                  <option value="rain">☔ MƯA RƠI (Các vệt mưa rơi nghiêng nhanh, buồn lãng mạn)</option>
                  <option value="sparks">🔥 TIA LỬA BỐM (Tia lửa lơ lửng bốc lên, ấm cúng)</option>
                  <option value="lightning">⚡ TIA SÉT (Sét đánh giật chớp lóe, kịch tính dữ dội)</option>
                  <option value="lightning_clouds">⛈ SÉT &amp; MÂY ĐEN (Chớp sét giật kết hợp lớp mây mù âm u)</option>
                  <option value="sakura">🌸 HOA ANH ĐÀO (Cánh hoa đào hồng bay lượn lãng mạn)</option>
                  <option value="bubbles">🫧 BONG BÓNG NƯỚC (Bong bóng xà phòng óng ánh lơ lửng bay lên)</option>
                  <option value="golden_dust">✨ BỤI VÀNG CINEMATIC (Hạt bụi vàng lấp lánh ảo diệu lung linh)</option>
                  <option value="autumn_leaves">🍁 LÁ RỤNG MÙA THU (Lá cây vàng đỏ bay xoay rơi lãng mạn)</option>
                  <option value="starry_glow">🌟 SAO LẤP LÁNH (Ngôi sao phát sáng lấp lánh ảo diệu cực chill)</option>
                  <option value="hearts">💖 THẢ TIM LÃNG MẠN (Hạt trái tim dễ thương nổi nhẹ bay bổng)</option>
                  <option value="fireflies">💡 ĐOM ĐÓM BAN ĐÊM (Đom đóm phát sáng xanh lá bay nhấp nháy, ảo diệu)</option>
                  <option value="matrix_rain">📟 MA TRẬN MATRIX (Dòng mã số rơi phong cách hacker kịch tính)</option>
                  <option value="snow_storm">💨 BÃO TUYẾT GIÓ CUỐN (Tuyết rơi nghiêng nhanh gió thổi cực mạnh)</option>
                  <option value="neon_stars">🪐 SAO NEON CYBERPUNK (Ngôi sao đổi màu phát sáng rực rỡ lôi cuốn)</option>
                  <option value="old_film_vintage">🎞 PHIM CỔ ĐIỂN VINTAGE (Tông màu ấm, bụi bẩn nhảy múa, xước dọc mộc mạc)</option>
                  <option value="old_film_noir">🎬 PHIM ĐEN TRẮNG SILENT (Hơi rung nhẹ, đen trắng hoài niệm, sệt đốm hóa chất cổ)</option>
                  <option value="old_film_scratch">📼 PHIM XƯỚC MÁY CHIẾU GRANGE (Xước dọc mảnh rải rác, hạt bụi mạnh, vạch cuộn dọc)</option>
                </select>
              </div>

              {/* Advanced Block Interval Controls */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div>
                  <label className="text-xs text-white/50 font-medium block mb-1.5 font-semibold text-zinc-300">
                    Khoảng cách xuất hiện (Cứ sau mỗi X đoạn):
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Mặc định: 0 (Hiển thị liên tục)"
                    value={config.bgEffectInterval || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      updateConfig('bgEffectInterval', isNaN(val) ? 0 : val);
                    }}
                    className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white/90 focus:outline-none focus:border-blue-500 font-medium placeholder:text-white/20"
                  />
                  <span className="text-[10px] text-white/40 mt-1.5 block leading-normal">
                    Chu kỳ lặp lại hiệu ứng. Hệ số <strong>0</strong> có nghĩa là luôn xuất hiện không ngưng.
                  </span>
                </div>

                <div>
                  <label className="text-xs text-white/50 font-medium block mb-1.5 font-semibold text-zinc-300">
                    Mỗi lần xuất hiện (Gồm Y đoạn liên tiếp):
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Mặc định: 0 (Hiển thị liên tục)"
                    value={config.bgEffectConsecutive || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      updateConfig('bgEffectConsecutive', isNaN(val) ? 0 : val);
                    }}
                    className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white/90 focus:outline-none focus:border-blue-500 font-medium placeholder:text-white/20"
                  />
                  <span className="text-[10px] text-white/40 mt-1.5 block leading-normal">
                    Thời lượng duy trì hiệu ứng. Điền <strong>2</strong> để hiệu ứng kéo dài trong 2 đoạn phụ đề rồi tắt.
                  </span>
                </div>
              </div>

              {/* Real-time Interactive Canvas Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-medium font-semibold">Bản xem trước trực quan (Trực tiếp 30 FPS):</span>
                  {images.filter(img => img.id !== 'intro-bg-custom' && img.id !== 'outro-bg-custom').length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSampleImageIndex(prev => prev + 1)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-zinc-900/50 hover:bg-zinc-800 text-[11px] text-white/70 hover:text-white transition-all cursor-pointer select-none"
                    >
                      <RefreshCw size={11} />
                      <span>Đổi ảnh nền mẫu</span>
                    </button>
                  )}
                </div>

                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-[#070709] shadow-inner flex items-center justify-center">
                  <canvas
                    ref={bgEffectCanvasRef}
                    width={640}
                    height={360}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] text-white/70 font-mono flex items-center gap-1.5 uppercase font-bold border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Preview • {(config.bgEffect || 'none').toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Display Config */}
          {activeTab === 'display' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 font-medium block mb-1.5">Kiểu chuyển cảnh (Transition):</label>
                  <select
                    value={config.transitionType}
                    onChange={(e) => updateConfig('transitionType', e.target.value)}
                    className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white/90 focus:outline-none focus:border-blue-500"
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
                  <label className="text-xs text-white/50 font-medium block mb-1.5">Độ dài chuyển cảnh (giây/s):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="2"
                    value={config.transitionDuration}
                    onChange={(e) => updateConfig('transitionDuration', parseFloat(e.target.value) || 0.5)}
                    className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>



              <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 space-y-3">
                <div>
                  <p className="text-xs text-white font-medium flex items-center gap-1.5">
                    Hiệu ứng chuyển động ảnh nhân vật:
                  </p>
                  <p className="text-[10px] text-white/40 mt-1">
                    Tránh ảnh tĩnh đơn điệu, hỗ trợ phóng thu zoom pan xoay mượt mà đậm chất hoạt ảnh.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Kiểu hoạt ảnh chính:</label>
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
                      className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2.5 py-2 text-white/90 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="none">❌ KHÔNG HIỆU ỨNG (Ảnh tĩnh tuyệt đối)</option>
                      <option value="random">🔀 NGẪU NHIÊN TOÀN BỘ (Đổi kiểu liên tục)</option>
                      <option value="zoom_in">🔍 Thu phóng vào trong chậm (Ken Burns In)</option>
                      <option value="zoom_out">🔎 Thu phóng ra ngoài chậm (Ken Burns Out)</option>
                      <option value="pan_left">◀ Di chuyển mượt sang trái (Pan Left)</option>
                      <option value="pan_right">▶ Di chuyển mượt sang phải (Pan Right)</option>
                      <option value="pan_up">▲ Di chuyển mượt lên trên (Pan Up)</option>
                      <option value="pan_down">▼ Di chuyển mượt xuống dưới (Pan Down)</option>
                      <option value="pan_up_left">↖ Di chuyển chéo lên trái</option>
                      <option value="pan_up_right">↗ Di chuyển chéo lên phải</option>
                      <option value="pan_down_left">↙ Di chuyển chéo xuống trái</option>
                      <option value="pan_down_right">↘ Di chuyển chéo xuống phải</option>
                      <option value="rotate_slow_cw">🔄 Xoay nhẹ xuôi chiều kim đồng hồ</option>
                      <option value="rotate_slow_ccw">🔄 Xoay nhẹ ngược chiều kim đồng hồ</option>
                      <option value="zoom_pulse">💓 Thu phóng nhịp điệu co giãn</option>
                      <option value="shiver">📳 Rung lắc nhẹ sống động (Camera Shake)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Hiệu ứng Legacy (Ken Burns):</label>
                    <button
                      type="button"
                      onClick={() => {
                        onConfigChange({
                          ...config,
                          enableKenBurns: true
                        });
                      }}
                      className="flex items-center justify-between w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1.5 text-white/80"
                    >
                      <span>Luôn mở (Always On)</span>
                      <ToggleRight size={24} className="text-blue-500" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <label className="text-xs text-white/50 font-medium block mb-1.5">Bố cục ghép ảnh khi chỉ có 1 từ khóa:</label>
                <select
                  value={config.singleKeywordMode || 'pair'}
                  onChange={(e) => updateConfig('singleKeywordMode', e.target.value)}
                  className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white/90 focus:outline-none focus:border-blue-500"
                >
                  <option value="pair">GHÉP ĐÔI TOÀN BỘ (Ghép song song 2 ảnh khác nhau cùng nhân vật)</option>
                  <option value="single">KHÔNG GHÉP ĐÔI (Hiển thị 1 ảnh chính + Nền mờ phía sau)</option>
                  <option value="no_split">KHÔNG GHÉP ẢNH (Dù có nhiều từ khóa cũng chỉ lấy 1 từ khóa ngẫu nhiên và hiển thị 1 ảnh đơn)</option>
                  <option value="percent_50_50">Tỉ lệ ngẫu nhiên 50/50 (Ghép đôi / Không ghép)</option>
                  <option value="percent_25_75">Tỉ lệ 25% Ghép đôi / 75% Không ghép</option>
                  <option value="percent_75_25">Tỉ lệ 75% Ghép đôi / 25% Không ghép</option>
                </select>
                <p className="text-[10px] text-white/40 mt-1">
                  Đoạn thoại có một nhân vật/từ khóa khớp sẽ được tự động xử lý bằng cách nhân đôi hoặc hiển thị sắc nét ở giữa kèm mờ ảo phía sau.
                </p>
              </div>

              <div className="border-t border-white/5 pt-4">
                <label className="text-xs text-white/50 font-medium block mb-2">⚡ VỆT NGĂN ẢNH (Chỉ áp dụng khi ghép 2 ảnh):</label>
                
                {/* Updated standard select option index */}
                <select
                  value={config.dividerStyle || 'none'}
                  onChange={(e) => updateConfig('dividerStyle', e.target.value)}
                  className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white/90 focus:outline-none focus:border-blue-500 mb-3"
                >
                  <option value="none">❌ Không sử dụng vệt ngăn (Ghép sát mịn)</option>
                  
                  {/* Tĩnh */}
                  <option value="torn_paper_white">📄 [Tĩnh] Giấy xé rách nghệ thuật màu trắng dầy</option>
                  <option value="torn_paper_gold">👑 [Tĩnh] Giấy xé mạ vàng kim cổ điễn quý tộc</option>
                  <option value="solid_white_shadow">⚪ [Tĩnh] Vệt gạch thẳng dầy trắng + Bóng đen sâu</option>
                  <option value="solid_gold_shadow">⚜️ [Tĩnh] Vệt gạch thẳng dầy vàng mạ + Bóng đen sâu</option>
                  <option value="dashed_stitch">🧵 [Tĩnh] Vệt khâu đứt đoạn dệt chỉ cam neon thêu vải</option>
                  <option value="watercolor_splash">🎨 [Tĩnh] Vệt mực khói đen loang nát xiêu vẹo</option>
                  <option value="vintage_dots">🏁 [Tĩnh] Hạt chấm sọc Halftone retro bán tông hoài cổ</option>
                  <option value="static_lightning_natural">⚡ [Tĩnh] Tia sét sấm phóng điện tự nhiên vĩnh cửu</option>
                  <option value="static_line_white">🥛 [Tĩnh] Đường gạch dọc đơn màu trắng tuyết mảnh</option>
                  <option value="static_line_gold">🍯 [Tĩnh] Đường gạch dọc đơn màu vàng mật ong tối giản</option>
                  <option value="static_line_red">🏮 [Tĩnh] Đường gạch dọc đơn màu đỏ ruby năng lượng</option>
                  <option value="static_line_blue">🧊 [Tĩnh] Đường gạch dọc đơn màu xanh lam băng ngọc</option>
                  <option value="static_chalk_dust">💨 [Tĩnh] Phấn bụi mờ sương mành trắng vẽ bảng phấn</option>
                  <option value="static_bamboo_pole">🎋 [Tĩnh] Thân tre trúc ghép xanh lục thăng hoa</option>
                  <option value="static_double_white">👥 [Tĩnh] Đường kép song song đôi thanh lịch sạch</option>
                  <option value="static_zipper">🔩 [Tĩnh] Khóa kéo răng kim đồng cổ thời hoài niệm</option>
                  <option value="static_film_strip">🎞️ [Tĩnh] Cuộn phim nhựa âm bản cổ kính đính răng</option>

                  {/* Động */}
                  <option value="neon_cyan">💎 [Động] Sợi quang tơ Neon phát sáng xanh lam nhấp nháy</option>
                  <option value="neon_pink">🌸 [Động] Sợi quang tơ Neon phát sáng màu hồng phớt ảo</option>
                  <option value="lightning_yellow">⚡ [Động] Sấm điện vàng phóng nổ giật rung cuồng loạn</option>
                  <option value="lightning_blue">❄️ [Động] Sét băng tuyết lam bùng nổ gián đoạn huyền bí</option>
                  <option value="cyber_glitch">👾 [Động] Hiện tượng rách nhiễu tín hiệu Cyber Glitch</option>
                  <option value="chain_link">⛓️ [Động] Sợi dây xích sắt sập xệ cơ khí lắc đều</option>
                  <option value="laser_red">🛑 [Động] Sợi chỉ nhiệt năng Laser beam lòe ánh sáng đỏ</option>
                  <option value="rainbow_ribbon">🌈 [Động] Ruy-băng lụa chuyển sắc tuần hoàn đa quang phổ</option>
                </select>


                
                <p className="text-[10px] text-white/40 mt-1.5">
                  Xử lý vệt ngăn nghệ thuật dài hết canvas giúp phân tách rạch ròi 2 ảnh độc lập, phối hợp với bóng đổ tăng chiều sâu cực mạnh.
                </p>
              </div>

              <div className="border-t border-white/5 pt-4">
                <label className="text-xs text-white/50 font-medium block mb-2">🔍 KÝ TỰ TỐI THIỂU TRONG ĐOẠN SUB:</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    min="0"
                    max="300"
                    placeholder="Không gộp"
                    value={config.minSubChars !== undefined ? config.minSubChars : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                      updateConfig('minSubChars', val);
                    }}
                    className="w-36 text-xs bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white/90 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-white/40">ký tự (Mặc định: 40. Nhập 0 hoặc để trống để tắt tự động gộp).</span>
                </div>
                <p className="text-[10px] text-white/40 mt-1.5">
                  Quy tắc: Hệ thống tự động phát hiện và gộp các đoạn sub ngắn dưới phạm vi tối thiểu vào đoạn tiếp theo (gộp cả text lẫn thời gian bắt đầu/kết thúc) để tối ưu thời gian hiển thị, tránh chữ nhấp nháy quá nhanh.
                </p>
              </div>

              <div className="border-t border-white/5 pt-4">
                <label className="text-xs text-white/50 font-medium block mb-2">✂️ KÝ TỰ TỐI ĐA TRONG ĐOẠN SUB:</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    min="10"
                    max="500"
                    placeholder="Không giới hạn"
                    value={config.maxSubChars || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(10, parseInt(e.target.value) || 0);
                      updateConfig('maxSubChars', val);
                    }}
                    className="w-36 text-xs bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white/90 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-white/40">ký tự (Ví dụ: 80. Nhập 0 hoặc để trống để tắt tự động chia nhỏ).</span>
                </div>
                <p className="text-[10px] text-white/40 mt-1.5">
                  Quy tắc: Hệ thống tự động tính thời gian theo tỷ số từ trên giây và chia đều các câu dài thành các đoạn nhỏ dưới giới hạn ký tự bạn yêu cầu, số lượng từ gần bằng nhau để khán giả dễ đọc hơn.
                </p>
              </div>

            </div>
          )}

          {/* Tab 2: Font Config & Presets */}
          {activeTab === 'font' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Nested Sub-Tabs under Text settings */}
              <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFontSubTab('style')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    fontSubTab === 'style'
                      ? 'bg-blue-600 text-white shadow-md border border-white/10'
                      : 'text-white/45 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Type size={13} /> 1. PHONG CÁCH CHỮ (Styles)
                </button>
                <button
                  type="button"
                  onClick={() => setFontSubTab('effect')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    fontSubTab === 'effect'
                      ? 'bg-blue-600 text-white shadow-md border border-white/10'
                      : 'text-white/45 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Sliders size={13} /> 2. HIỆU ỨNG CHỮ & NỀN MỜ
                </button>
              </div>

              {fontSubTab === 'style' ? (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {(() => {
                    const handleAddNewPreset = () => {
                      const newId = `preset_${Date.now()}`;
                      const newPreset: SubtitlePreset = {
                        id: newId,
                        name: `Phong cách #${presets.length + 1}`,
                        fontFamily: 'Josefin Sans',
                        fontSize: 40,
                        color: '#FFFFFF',
                        outlineColor: '#000000',
                        outlineWidth: 1.5,
                        bgColor: '#000000',
                        bgOpacity: 0.0,
                        position: 'bottom-center',
                        effect: 'cinematic',
                        subtitleHighlightMode: 'none',
                        subtitleHighlightColor: '#EAB308',
                        presetY: 85
                      };
                      onPresetsChange([...presets, newPreset]);
                      updateConfig('activePresetId', newId);
                    };

                    const handleDeletePresetAndFallback = (id: string, e: React.MouseEvent) => {
                      e.stopPropagation();
                      const remaining = presets.filter(p => p.id !== id);
                      if (config.activePresetId === id || !config.activePresetId) {
                        const nextActiveId = remaining.length > 0 ? remaining[0].id : '';
                        updateConfig('activePresetId', nextActiveId);
                      }
                      onPresetsChange(remaining);
                    };

                    const posNames: Record<string, string> = {
                      'bottom-center': 'Dưới giữa',
                      'top-center': 'Trên cao',
                      'left': 'Trái',
                      'right': 'Phải',
                      'center': 'Chính giữa'
                    };

                    const effNames: Record<string, string> = {
                      'standard': 'Cơ bản',
                      'cinematic': 'Dày cinematic',
                      'badge': 'Sticker',
                      'neon': 'Neon',
                      'frosted': 'Mành mờ'
                    };

                    const selectedPreset = presets.find(p => p.id === config.activePresetId) || presets[0] || null;

                    return (
                      <div className="space-y-5 animate-in fade-in duration-200">
                        
                        {/* Header List Section */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white uppercase tracking-wider block">
                              Bộ sưu tập Phong cách chữ của bạn ({presets.length})
                            </span>
                            <button
                              type="button"
                              onClick={handleAddNewPreset}
                              className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                            >
                              <Plus size={12} /> Tạo mẫu mới
                            </button>
                          </div>

                          {presets.length > 0 ? (
                            /* Horizontal Grid list / collection of presets */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              {presets.map((preset) => {
                                const isSelected = selectedPreset && selectedPreset.id === preset.id;
                                return (
                                  <div
                                    key={preset.id}
                                    onClick={() => updateConfig('activePresetId', preset.id)}
                                    className={`rounded-xl p-3 flex flex-col justify-between gap-2.5 transition-all cursor-pointer relative border ${
                                      isSelected 
                                        ? 'bg-[#181822] border-blue-500 shadow-md shadow-blue-500/10'
                                        : 'bg-[#121215] border-white/10 hover:border-white/20'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                          {preset.name}
                                          {isSelected && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Chọn</span>}
                                        </h4>
                                        <p className="text-[10px] text-white/40 font-mono mt-0.5 truncate">
                                          Font: {preset.fontFamily} • Size: {preset.fontSize}px
                                        </p>
                                      </div>
                                      
                                      {/* Trash button for preset */}
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeletePresetAndFallback(preset.id, e)}
                                        className="p-1 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all self-start"
                                        title="Xóa phong cách"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>

                                    {/* Tiny real-time preview card inside catalog */}
                                    <div className="bg-[#050505] rounded-lg p-1.5 flex items-center justify-center min-h-[36px] overflow-hidden whitespace-nowrap">
                                      <span 
                                        style={{
                                          fontFamily: `"${preset.fontFamily}", sans-serif`,
                                          fontSize: '11px',
                                          color: preset.color,
                                          fontWeight: 'bold',
                                          textShadow: preset.effect === 'neon'
                                            ? `0 0 6px ${preset.color}`
                                            : (preset.outlineWidth > 0 
                                                ? `-1px -1px 0 ${preset.outlineColor}, 1px -1px 0 ${preset.outlineColor}, -1px 1px 0 ${preset.outlineColor}, 1px 1px 0 ${preset.outlineColor}`
                                                : 'none')
                                        }}
                                      >
                                        Khớp Sub: {preset.name.split(' ')[0]}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] bg-white/5 text-white/50 px-1.5 py-0.5 rounded font-medium">
                                        {posNames[preset.position] || preset.position}
                                      </span>
                                      <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-medium">
                                        {effNames[preset.effect] || preset.effect}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-8 text-center text-white/45 bg-[#121215]/50 border border-dashed border-white/10 rounded-2xl font-medium text-xs">
                              Bạn chưa thiết lập phong cách chữ nào. Hãy click <strong className="text-blue-400">"Tạo mẫu mới"</strong> ở trên để bắt đầu chỉnh sửa phong cách độc bản của bạn!
                            </div>
                          )}
                        </div>

                        {presets.length > 0 && localEditingPreset && (
                          <>
                            {/* Collapsible details styling editor fields for localEditingPreset - Unified Design */}
                            <div className="bg-[#121215]/80 border border-white/5 rounded-xl p-4.5 space-y-4 animate-in slide-in-from-top duration-200">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                  🛠️ Tùy chỉnh chi tiết: <span className="text-white underline">{localEditingPreset.name}</span>
                                </span>
                              </div>

                          <div className="grid grid-cols-2 gap-3.5">
                            <div className="col-span-2">
                              <label className="text-[10px] text-white/50 block mb-1">Tên nhãn phong cách:</label>
                              <input
                                type="text"
                                value={localEditingPreset.name}
                                onChange={(e) => updateLocalPresetField('name', e.target.value)}
                                placeholder="Nhập tên phong cách..."
                                className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-semibold"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-white/50 block mb-1">Phông chữ (30+ Google Fonts):</label>
                              <select
                                value={localEditingPreset.fontFamily}
                                onChange={(e) => updateLocalPresetField('fontFamily', e.target.value)}
                                className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-blue-500 font-bold"
                              >
                                {SUBTITLE_FONTS.map((font) => (
                                  <option key={font} value={font} style={{ fontFamily: font }}>
                                    {font}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-white/50 block mb-1">Kích cỡ chữ chính:</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="14"
                                  max="46"
                                  value={localEditingPreset.fontSize}
                                  onChange={(e) => updateLocalPresetField('fontSize', parseInt(e.target.value) || 24)}
                                  className="flex-1 accent-blue-500 bg-[#050505] h-1.5 rounded-lg cursor-pointer"
                                />
                                <span className="text-[11px] font-mono font-bold text-[#EAB308] flex-shrink-0 min-w-[32px] text-right">{localEditingPreset.fontSize}px</span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-white/50 block mb-1">Vị trí hiển thị:</label>
                              <select
                                value={localEditingPreset.position}
                                onChange={(e) => updateLocalPresetField('position', e.target.value)}
                                className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500 font-semibold"
                              >
                                <option value="bottom-center">Dưới giữa (Cơ bản)</option>
                                <option value="top-center">Trên cao (Meme)</option>
                                <option value="left">Màn bên trái</option>
                                <option value="right">Màn bên phai</option>
                                <option value="center">Chính giữa</option>
                              </select>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] text-white/50">Chiều cao chữ (Trục Y %):</label>
                                {((localEditingPreset.position || 'bottom-center') === 'bottom-center') && (
                                  <span className="text-[9px] text-[#EAB308] font-bold tracking-wider">(CỐ ĐỊNH SÁT NỀN)</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="5"
                                  max="95"
                                  disabled={(localEditingPreset.position || 'bottom-center') === 'bottom-center'}
                                  value={(localEditingPreset.position || 'bottom-center') === 'bottom-center' ? 91 : (localEditingPreset.presetY !== undefined ? localEditingPreset.presetY : 85)}
                                  onChange={(e) => updateLocalPresetField('presetY', parseInt(e.target.value) || 85)}
                                  className={`flex-1 h-1.5 rounded-lg cursor-pointer ${((localEditingPreset.position || 'bottom-center') === 'bottom-center') ? 'accent-gray-500 bg-[#050505]/40 opacity-50 cursor-not-allowed' : 'accent-blue-500 bg-[#050505]'}`}
                                />
                                <span className="text-[11px] font-mono font-bold text-[#EAB308] flex-shrink-0 min-w-[32px] text-right">
                                  {((localEditingPreset.position || 'bottom-center') === 'bottom-center') ? 91 : (localEditingPreset.presetY !== undefined ? localEditingPreset.presetY : 85)}%
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-white/50 block mb-1">Hiệu ứng phông nền:</label>
                              <select
                                value={localEditingPreset.effect}
                                onChange={(e) => updateLocalPresetField('effect', e.target.value)}
                                className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500 font-semibold"
                              >
                                <option value="standard">Bo viền nét mảnh</option>
                                <option value="cinematic">Bo viền dày nổi bật</option>
                                <option value="badge">Nhãn dán Sticker mờ mềm</option>
                                <option value="neon">Phát quang bừng sáng Neon</option>
                                <option value="frosted">Khung mành mờ sang trọng</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-white/50 block mb-1">Màu chữ chính:</label>
                              <div className="flex items-center gap-2 bg-[#050505] p-1 border border-white/10 rounded-lg">
                                <input
                                  type="color"
                                  value={localEditingPreset.color}
                                  onChange={(e) => updateLocalPresetField('color', e.target.value)}
                                  className="w-7 h-7 rounded border border-white/10 bg-transparent cursor-pointer"
                                />
                                <span className="text-[9px] font-mono text-white/60">{localEditingPreset.color.toUpperCase()}</span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-white/50 block mb-1">Màu viền chữ phụ:</label>
                              <div className="flex items-center gap-2 bg-[#050505] p-1 border border-white/10 rounded-lg">
                                <input
                                  type="color"
                                  value={localEditingPreset.outlineColor}
                                  onChange={(e) => updateLocalPresetField('outlineColor', e.target.value)}
                                  className="w-7 h-7 rounded border border-white/10 bg-transparent cursor-pointer"
                                />
                                <span className="text-[9px] font-mono text-white/60">{localEditingPreset.outlineColor.toUpperCase()}</span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-white/50 block mb-1">Độ dày viền (px):</label>
                              <input
                                type="number"
                                min="0"
                                max="15"
                                value={localEditingPreset.outlineWidth}
                                onChange={(e) => updateLocalPresetField('outlineWidth', parseInt(e.target.value) || 0)}
                                className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none font-semibold font-mono"
                              />
                            </div>

                            <div className="flex items-center gap-2 mt-4 select-none col-span-2">
                              <input
                                type="checkbox"
                                id="preset_uppercase_chk"
                                checked={!!localEditingPreset.uppercase}
                                onChange={(e) => updateLocalPresetField('uppercase', e.target.checked)}
                                className="rounded border-white/10 bg-[#050505] text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-blue-500"
                              />
                              <label htmlFor="preset_uppercase_chk" className="text-[11px] text-zinc-300 font-bold cursor-pointer uppercase tracking-wide">
                                🔠 Buộc In Hoa hoàn toàn (Dạng News)
                              </label>
                            </div>

                            <div>
                              <label className="text-[10px] text-white/50 block mb-1 font-sans">Độ mờ nền hộp (Opacity):</label>
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  value={localEditingPreset.bgOpacity}
                                  onChange={(e) => updateLocalPresetField('bgOpacity', parseFloat(e.target.value))}
                                  className="flex-1 accent-blue-500 bg-[#050505] h-1 rounded-lg cursor-pointer"
                                />
                                <span className="text-[10px] font-mono text-white/50 min-w-[28px] text-right">{Math.round(localEditingPreset.bgOpacity * 100)}%</span>
                              </div>
                            </div>

                            {localEditingPreset.bgOpacity > 0 && (
                              <div>
                                <label className="text-[10px] text-white/50 block mb-1">Màu sắc phông nền:</label>
                                <div className="flex items-center gap-2 bg-[#050505] p-1 border border-white/10 rounded-lg">
                                  <input
                                    type="color"
                                    value={localEditingPreset.bgColor}
                                    onChange={(e) => updateLocalPresetField('bgColor', e.target.value)}
                                    className="w-7 h-7 rounded border border-white/10 bg-transparent cursor-pointer"
                                  />
                                  <span className="text-[9px] font-mono text-white/60">{localEditingPreset.bgColor.toUpperCase()}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 🌟 PHONG CÁCH HIGHLIGHT CHỮ (WORD-BY-WORD HIGHLIGHTING) - Inside individual presets as requested */}
                        <div className="bg-[#121217]/60 border border-white/5 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                              ✨ Cấu hình Highlight nổi bật từ sát nhau
                            </span>
                            <span className="text-[10px] text-white/30 hidden sm:inline">(Tự động tạo điểm nhấn)</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[11px] text-white/50 block mb-1.5 font-medium">Chế độ Highlight chữ:</label>
                              <select
                                value={localEditingPreset.subtitleHighlightMode || 'none'}
                                onChange={(e) => updateLocalPresetField('subtitleHighlightMode', e.target.value as any)}
                                className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2.5 py-2.5 text-white focus:outline-none focus:border-blue-500 font-bold"
                              >
                                <option value="none">Màu đồng nhất (Mặc định)</option>
                                <option value="alternating">Phân tách so-le từng chữ sát nhau</option>
                                <option value="pair">Phân tách so-le từng cặp 2 chữ</option>
                                <option value="random_pair">Highlight 2 chữ ngẫu nhiên cạnh nhau (Mặc định)</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] text-white/50 block mb-1.5 font-medium">Màu chữ Highlight:</label>
                              <div className="flex items-center gap-2 bg-[#050505] p-1.5 border border-white/10 rounded-lg font-bold font-mono">
                                <input
                                  type="color"
                                  value={localEditingPreset.subtitleHighlightColor || '#EAB308'}
                                  onChange={(e) => updateLocalPresetField('subtitleHighlightColor', e.target.value)}
                                  className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
                                />
                                <span className="text-[10px] text-white/80">{(localEditingPreset.subtitleHighlightColor || '#EAB308').toUpperCase()}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 💾 NÚT LƯU PHONG CÁCH CHỮ (SAVE STYLE BUTTON) */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleSaveLocalPreset}
                            className={`w-full py-3.5 px-6 rounded-xl font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 leading-none cursor-pointer ${
                              saveSuccessMessage
                                ? 'bg-emerald-600 border border-emerald-400 text-white animate-pulse'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/20 text-white shadow-blue-500/10'
                            }`}
                          >
                            {saveSuccessMessage ? (
                              <>
                                <Check size={14} className="animate-bounce" /> ĐÃ LƯU THÀNH CÔNG!
                              </>
                            ) : (
                              <>
                                <Save size={14} /> LƯU PHONG CÁCH CHỮ
                              </>
                            )}
                          </button>
                        </div>

                        {/* 📱 BỘ ĐIỀU CHỈNH CHẾ ĐỘ PREVIEW PHONG CÁCH CHỮ */}
                        <div className="flex items-center justify-between mt-4 bg-[#0a0a0d] border border-white/10 rounded-t-xl p-2.5">
                          <span className="text-[10px] font-bold text-white/40 tracking-wider uppercase flex items-center gap-1.5">
                            <Sparkles size={11} className="text-blue-400" /> Chế độ bản xem thử chữ
                          </span>

                          <div className="flex gap-1 bg-black/60 p-0.5 rounded-lg border border-white/5">
                            <button
                              type="button"
                              onClick={() => setStylePreviewInCanvas(false)}
                              className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                                !stylePreviewInCanvas
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'text-white/45 hover:text-white'
                              }`}
                            >
                              Khung dẹt
                            </button>
                            <button
                              type="button"
                              onClick={() => setStylePreviewInCanvas(true)}
                              className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                                stylePreviewInCanvas
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'text-white/45 hover:text-white'
                              }`}
                            >
                              Canvas 16:9 (Thực tế vị trí Y)
                            </button>
                          </div>
                        </div>

                        {!stylePreviewInCanvas ? (
                          /* Integrated dynamic sample preview card targeting localEditingPreset */
                          <div className="bg-gradient-to-br from-slate-950 via-zinc-900 to-black border-x border-b border-white/10 rounded-b-xl p-4 text-center shadow-inner relative overflow-hidden aspect-[40/10] flex items-center justify-center min-h-[100px]">
                            <div className="absolute inset-0 bg-[#000]/15 z-10 pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/15 via-transparent to-emerald-900/15" />
                            <div 
                              className="px-4 py-2 rounded-lg font-sans transition-all inline-block max-w-[90%] shadow-md z-20"
                              style={{
                                backgroundColor: localEditingPreset.bgOpacity > 0 
                                  ? hexToRgba(localEditingPreset.bgColor, localEditingPreset.bgOpacity) 
                                  : 'transparent',
                              }}
                            >
                              <p 
                                className="font-bold tracking-wide break-all"
                                style={{
                                  fontFamily: `"${localEditingPreset.fontFamily}", sans-serif`,
                                  fontSize: `${Math.max(14, localEditingPreset.fontSize - 4)}px`,
                                  color: localEditingPreset.color,
                                  textShadow: localEditingPreset.effect === 'neon'
                                    ? `0 0 10px ${localEditingPreset.color}`
                                    : (localEditingPreset.outlineWidth > 0 
                                        ? `-1px -1px 0 ${localEditingPreset.outlineColor}, 1px -1px 0 ${localEditingPreset.outlineColor}, -1px 1px 0 ${localEditingPreset.outlineColor}, 1px 1px 0 ${localEditingPreset.outlineColor}`
                                        : 'none'),
                                  textAlign: 'center',
                                  wordBreak: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {(() => {
                                  const mode = localEditingPreset.subtitleHighlightMode;
                                  const previewText = "Demo Subtitle: Customize your unique text style and elegant effects on video";
                                  if (!mode || mode === 'none') {
                                    return previewText;
                                  }
                                  const words = previewText.split(' ');
                                  return words.map((word, wIdx) => {
                                    let wColor = localEditingPreset.color;
                                    const hColor = localEditingPreset.subtitleHighlightColor || '#EAB308';
                                    if (mode === 'alternating') {
                                      wColor = (wIdx % 2 === 0) ? wColor : hColor;
                                    } else if (mode === 'pair') {
                                      wColor = (Math.floor(wIdx / 2) % 2 === 0) ? wColor : hColor;
                                    } else if (mode === 'random_pair') {
                                      if (wIdx === 2 || wIdx === 3) {
                                        wColor = hColor;
                                      }
                                    }
                                    return (
                                      <span key={wIdx} style={{ color: wColor }}>
                                        {word}{wIdx < words.length - 1 ? ' ' : ''}
                                      </span>
                                    );
                                  });
                                })()}
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* Interactive 16:9 Canvas Simulator focused on Subtitle Preset style and Y Position */
                          <div 
                            ref={stylePresetCanvasRef}
                            onPointerDown={handleStylePresetPointerDown}
                            onPointerMove={handleStylePresetPointerMove}
                            onPointerUp={handleStylePresetPointerUp}
                            onPointerLeave={handleStylePresetPointerUp}
                            className="bg-[#030303] border-x border-b border-white/10 rounded-b-xl aspect-video w-full overflow-hidden relative cursor-ns-resize shadow-md select-none"
                            style={{ 
                              touchAction: 'none',
                              backgroundImage: simBgImage ? `url(${simBgImage})` : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat'
                            }}
                          >
                            {/* Overlay */}
                            {simBgImage && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}

                            {/* HUD Coordinates Info */}
                            <div className="absolute top-2 left-2 bg-black/85 border border-white/15 rounded-lg px-2 py-1 pointer-events-none text-[8px] font-mono text-white/50 tracking-wider select-none flex items-center gap-1.5 z-30">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              BẢN XEM THỬ CANVAS: KÉO CHUỘT / TRƯỢT LÊN XUỐNG ĐỂ CHỈNH TRỤC Y ({localEditingPreset.presetY !== undefined ? localEditingPreset.presetY : 85}%)
                            </div>

                            {/* Center Align guideline */}
                            <div className="absolute inset-y-0 left-1/2 border-l border-white/[0.04] border-dashed pointer-events-none" />

                            {/* Dynamic Text positioned relative to presetY */}
                            <div 
                              className="absolute w-[90%] left-1/2 pointer-events-none z-20 flex items-center justify-center text-center"
                              style={{
                                bottom: 'auto',
                                top: `${localEditingPreset.presetY !== undefined ? localEditingPreset.presetY : 85}%`,
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: localEditingPreset.bgOpacity > 0 
                                  ? hexToRgba(localEditingPreset.bgColor, localEditingPreset.bgOpacity) 
                                  : 'transparent',
                              }}
                            >
                              <p 
                                className="font-bold tracking-wide w-full break-all"
                                style={{
                                  fontFamily: `"${localEditingPreset.fontFamily}", sans-serif`,
                                  fontSize: `${Math.max(10, (localEditingPreset.fontSize || 24) * 0.65)}px`, // scale down to fit simulated space
                                  color: localEditingPreset.color,
                                  textShadow: localEditingPreset.effect === 'neon'
                                    ? `0 0 10px ${localEditingPreset.color}`
                                    : (localEditingPreset.outlineWidth > 0 
                                        ? `-1px -1px 0 ${localEditingPreset.outlineColor}, 1px -1px 0 ${localEditingPreset.outlineColor}, -1px 1px 0 ${localEditingPreset.outlineColor}, 1px 1px 0 ${localEditingPreset.outlineColor}`
                                        : 'none'),
                                  textAlign: 'center',
                                  wordBreak: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {(() => {
                                  const mode = localEditingPreset.subtitleHighlightMode;
                                  const previewText = "Phụ đề mẫu: Kéo kéo để dịch chuyển vị trí đứng của chữ";
                                  if (!mode || mode === 'none') {
                                    return previewText;
                                  }
                                  const words = previewText.split(' ');
                                  return words.map((word, wIdx) => {
                                    let wColor = localEditingPreset.color;
                                    const hColor = localEditingPreset.subtitleHighlightColor || '#EAB308';
                                    if (mode === 'alternating') {
                                      wColor = (wIdx % 2 === 0) ? wColor : hColor;
                                    } else if (mode === 'pair') {
                                      wColor = (Math.floor(wIdx / 2) % 2 === 0) ? wColor : hColor;
                                    } else if (mode === 'random_pair') {
                                      if (wIdx === 2 || wIdx === 3) {
                                        wColor = hColor;
                                      }
                                    }
                                    return (
                                      <span key={wIdx} style={{ color: wColor }}>
                                        {word}{wIdx < words.length - 1 ? ' ' : ''}
                                      </span>
                                    );
                                  });
                                })()}
                              </p>
                            </div>
                          </div>
                        )}

                      </>
                    )}

                  </div>
                );
              })()}
            </div>
              ) : (
                /* SECTION 2: HIỆU ỨNG CHỮ + NỀN MỜ + SIMULATOR */
                <div className="space-y-6 animate-in fade-in duration-200">
                  {selectedEffectMẫu === null ? (
                    <div className="space-y-4">
                      <div className="bg-[#121215] border border-white/5 rounded-2xl p-5 text-center">
                        <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight uppercase block leading-tight">
                          ✨ Hiệu Ứng Phong Phú Ngẫu Nhiên
                        </span>
                        <p className="text-white/50 text-[11px] mt-1.5 max-w-lg mx-auto leading-relaxed">
                          Mỗi video khi kết xuất sẽ tự động chọn ngẫu nhiên một Phong Cách Chữ (Font, Màu chữ) cùng một mẫu hiệu ứng ngẫu nhiên từ <b>MẪU CHỮ A, B, C, D</b>. Hãy lựa chọn mẫu chữ bên dưới để cài đặt toạ độ, nền mờ và hiệu ứng riêng biệt cho mẫu đó.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                          const count = savedEffects.filter(eff => (eff.group || 'A') === letter).length;
                          let desc = '';
                          let iconBg = '';
                          if (letter === 'A') {
                            desc = 'Giao diện dưới, chuyển động bounce nhẹ';
                            iconBg = 'from-emerald-500 to-teal-500 shadow-emerald-500/20';
                          } else if (letter === 'B') {
                            desc = 'Đoạn cận trên, chuyển động lướt lướt cinematic';
                            iconBg = 'from-blue-500 to-cyan-500 shadow-blue-500/20';
                          } else if (letter === 'C') {
                            desc = 'Chính giữa màn hình, khung nền sương mờ';
                            iconBg = 'from-violet-500 to-fuchsia-500 shadow-violet-500/20';
                          } else {
                            desc = 'Chữ gõ đập cơ đặc biệt, bo tròn mờ';
                            iconBg = 'from-amber-500 to-orange-500 shadow-amber-500/20';
                          }
                          return (
                            <button
                              key={letter}
                              type="button"
                              onClick={() => setSelectedEffectMẫu(letter)}
                              className="bg-[#0b0b0d] border border-white/5 hover:border-blue-500/40 text-left rounded-2xl p-5 hover:bg-white/[0.02] hover:bg-opacity-30 transition-all cursor-pointer group flex items-start gap-4 active:scale-[0.98]"
                            >
                              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl font-black text-white shadow-lg shrink-0 ${iconBg}`}>
                                {letter}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-black text-sm group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                                  MẪU CHỮ {letter}
                                </h4>
                                <p className="text-[11px] text-white/40 font-medium mt-1 leading-normal line-clamp-2">
                                  {desc}
                                </p>
                                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono text-[9.5px] font-bold border border-blue-500/20">
                                  {count} hiệu ứng đã lưu
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Sub-header with switcher and go back */}
                      <div className="flex items-center justify-between bg-[#121215] border border-white/5 rounded-2xl p-4 gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedEffectMẫu(null)}
                          className="flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                        >
                          <ChevronLeft size={14} /> Quay lại danh sách mẫu
                        </button>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/50 font-bold uppercase tracking-wider">Cài đặt Mẫu Chữ khác:</span>
                          <div className="flex bg-[#0b0b0d] rounded-xl p-1 gap-1 border border-white/5">
                            {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                              <button
                                key={letter}
                                type="button"
                                onClick={() => setSelectedEffectMẫu(letter)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all cursor-pointer ${
                                  selectedEffectMẫu === letter
                                    ? 'bg-blue-600 text-white shadow shadow-blue-600/30 scale-105'
                                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                                }`}
                              >
                                {letter}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Visual Drag and drop Canvas Simulator */}
                      <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider block">
                          Giả lập căn chỉnh toạ độ (Interactive Preview)
                        </span>
                        {images && images.length > 0 && (
                          <button
                            type="button"
                            onClick={randomizeSimulatorBg}
                            title="Đổi hình nền giả lập ngẫu nhiên"
                            className="p-1 px-2 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 rounded-md transition-all active:scale-95 flex items-center gap-1 text-[10px] font-bold border border-blue-500/20 cursor-pointer"
                          >
                            <RefreshCw size={10} className="animate-spin-slow" /> Đổi hình nền mẫu
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {isSimPlaying ? (
                          <div className="bg-amber-950/80 border border-amber-500/30 rounded-lg px-2.5 py-1 text-[9px] font-mono font-bold text-amber-400 select-none flex items-center gap-1.5 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" /> ĐANG PHÁT HIỆU ỨNG
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsSimPlaying(true);
                            }}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/20 text-white rounded-lg px-2.5 py-1 text-[9px] font-bold select-none cursor-pointer flex items-center gap-1 shadow-md hover:shadow-blue-500/10 transition-all active:scale-95"
                          >
                            <Play size={10} /> Chạy thử hiệu ứng
                          </button>
                        )}


                        {/* Coordinates display info */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/45 font-mono">
                          <span>X: <b className="text-blue-400">{config.subtitleX !== undefined ? config.subtitleX : 50}%</b></span>
                          •
                          <span>Y: <b className="text-blue-400">{config.subtitleY !== undefined ? config.subtitleY : 85}%</b></span>
                          <button
                            type="button"
                            onClick={() => {
                              updateConfig('subtitleX', 50);
                              updateConfig('subtitleY', 85);
                              updateConfig('blurBgX', 50);
                              updateConfig('blurBgY', 85);
                            }}
                            className="bg-zinc-850 hover:bg-zinc-750 text-white hover:text-white text-[9px] font-bold px-1.5 py-0.5 rounded transition-all active:scale-95 cursor-pointer ml-1"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    <div 
                      ref={containerRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      className="relative aspect-video w-full bg-[#030303] border border-white/15 rounded-xl overflow-hidden cursor-crosshair select-none flex flex-col justify-between p-3"
                      style={{ 
                        touchAction: 'none',
                        backgroundImage: simBgImage ? `url(${simBgImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      {/* Dark overlay to increase text legibility onto random image background */}
                      {simBgImage && (
                        <div className="absolute inset-0 bg-black/35 pointer-events-none" />
                      )}

                      {/* Grid overlay */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-[0.05] pointer-events-none">
                        {[...Array(9)].map((_, i) => (
                           <div key={i} className="border border-white" />
                        ))}
                      </div>

                      {/* HUD Overlay Labels */}
                      <div className="absolute top-2 left-2 bg-black/80 border border-white/10 rounded px-2 py-1 pointer-events-none text-[8px] font-mono text-white/45 tracking-wider select-none flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        KÉO THẢ DI CHUYỂN KHỐI PHỤ ĐỀ TRÊN MÀN HÌNH GIẢ LẬP
                      </div>

                      {/* Translucent blurred strip mockup and text overlay - USING SYNCHRONIZED SCALING DESIGN */}
                      {(() => {
                        let isSimDateActive = false;
                        let matchedSimDate = '';
                        if (config.enableHighlightDate) {
                          const matched = getHighlightCustomText(simText, config);
                          if (matched) {
                            isSimDateActive = true;
                            matchedSimDate = matched;
                          }
                        }

                        const activeSimTextValue = isSimDateActive ? matchedSimDate : simText;

                        let simFontSize = isSimDateActive ? (config.highlightTextFontSize || 150) * 0.32 : simFontSizeBase * 0.45;
                        let simHeightPercent = ((config.blurBgHeight || 285) / 720) * 100;
                        let simWidthPercent = config.blurBgWidth || 100;

                        const activeBoxW = 400 * (simWidthPercent / 100);
                        const activeBoxH = 400 * (9/16) * (simHeightPercent / 100);
                        
                        let charWidthEst = simFontSize * 0.55;
                        let allowedCharsPerLine = Math.max(10, Math.floor((activeBoxW - 12) / charWidthEst));
                        let estimatedLines = Math.ceil(activeSimTextValue.length / allowedCharsPerLine);
                        let estimatedHeight = estimatedLines * simFontSize * 1.35;
                        
                        while (simFontSize > 4.5 && (estimatedHeight > activeBoxH - 4)) {
                          simFontSize -= 0.25;
                          charWidthEst = simFontSize * 0.55;
                          allowedCharsPerLine = Math.max(10, Math.floor((activeBoxW - 12) / charWidthEst));
                          estimatedLines = Math.ceil(activeSimTextValue.length / allowedCharsPerLine);
                          estimatedHeight = estimatedLines * simFontSize * 1.35;
                        }

                        const textLeft = isSimDateActive ? 50 : (config.blurBgX !== undefined ? config.blurBgX : 50);
                        const textTop = isSimDateActive ? 50 : ((firstPreset && firstPreset.presetY !== undefined) ? firstPreset.presetY : (config.blurBgY !== undefined ? config.blurBgY : 85));
                        const domWidth = isSimDateActive ? '90%' : `${Math.max(10, simWidthPercent - 5)}%`;

                        const displayFontFamily = isSimDateActive ? (config.highlightDateFontFamily || simFontFamily) : simFontFamily;
                        const displayColor = isSimDateActive ? (config.highlightDateColor || '#FFFFFF') : simColor;

                        const renderDateBgOpacity = config.highlightDateBgOpacity !== undefined ? config.highlightDateBgOpacity : 85;
                        const decimalBgOpacity = renderDateBgOpacity / 100;
                        const bgHexVal = config.highlightDateBgColor || '#EAB308';
                        // Convert hex background with alpha
                        const hexToRgba = (hex: string, alpha: number) => {
                          const cleanHex = hex.replace('#', '');
                          const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
                          const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
                          const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
                          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                        };

                        return (
                          <>
                            {/* Blur Backdrop Mockup */}
                            {config.enableBlurBg && !isSimDateActive && (
                              <div 
                                className={`absolute backdrop-blur-md pointer-events-none ${isDragSimActive ? '' : 'transition-all duration-200'} ${
                                  config.blurBgShape === 'circle' ? 'rounded-full' :
                                  config.blurBgShape === 'pill' ? 'rounded-[100px]' :
                                  config.blurBgShape === 'rounded' ? 'rounded-xl' : 'rounded-none'
                                }`}
                                style={{
                                  border: config.blurBgBorderColorHex && config.blurBgBorderColorHex !== 'none' 
                                    ? `1.5px solid ${config.blurBgBorderColorHex}` 
                                    : 'none',
                                  height: config.blurBgShape === 'circle' 
                                    ? `${simWidthPercent * 1.5}px`
                                    : `${simHeightPercent}%`,
                                  width: `${simWidthPercent}%`,
                                  left: `${config.blurBgX !== undefined ? config.blurBgX : (config.subtitleX !== undefined ? config.subtitleX : 50)}%`,
                                  top: `${(firstPreset && firstPreset.presetY !== undefined) ? firstPreset.presetY : (config.blurBgY !== undefined ? config.blurBgY : (config.subtitleY !== undefined ? config.subtitleY : 85))}%`,
                                  opacity: simBgProgress * (config.blurBgOpacity !== undefined ? config.blurBgOpacity : 0.5),
                                  backgroundColor: config.blurBgColorHex || '#000000',
                                  transform: `translate(-50%, -50%) translate(${simBgOffsetX}px, ${simBgOffsetY}px)`,
                                }}
                              />
                            )}

                            {/* Subtitle Text Element */}
                            <div
                              className={`absolute select-none pointer-events-none font-bold px-4 ${isDragSimActive ? '' : 'transition-all duration-200'}`}
                              style={{
                                left: `${textLeft}%`,
                                top: `${textTop}%`,
                                transform: `translate(-50%, -50%) translate(${simOffsetX}px, ${simOffsetY}px) scale(${simScaleX}, ${simScaleY}) rotate(${simRotate}deg)`,
                                opacity: simOpacity,
                                color: displayColor,
                                fontFamily: displayFontFamily,
                                fontSize: `${simFontSize}px`,
                                width: domWidth,
                                maxWidth: domWidth,
                                textAlign: 'center',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap',
                                backgroundColor: 'transparent',
                                padding: '',
                                borderRadius: '',
                                textShadow: !isSimDateActive && simOutlineWidthBase > 0 
                                  ? `-1px -1px 0 ${simOutlineColorBase}, 1px -1px 0 ${simOutlineColorBase}, -1px 1px 0 ${simOutlineColorBase}, 1px 1px 0 ${simOutlineColorBase}`
                                  : 'none'
                              }}
                            >
                              {(() => {
                                if (isSimDateActive) {
                                  return activeSimTextValue;
                                }
                                const mode = config.subtitleHighlightMode;
                                const showEffect = config.subtitleShowEffect || 'none';
                                const isHighlightTwo = showEffect === 'highlight_two_words';
                                const isKaraoke = showEffect === 'karaoke';

                                const words = simText.split(' ');
                                const totalWordsCount = words.length;

                                const isHighlightTwoActive = isHighlightTwo && totalWordsCount > 5;

                                if ((!mode || mode === 'none') && !isHighlightTwoActive && !isKaraoke) {
                                  return simText;
                                }

                                let highlightStartIndex = -1;
                                if (mode === 'random_pair' && words.length > 0) {
                                  let hash = 0;
                                  for (let h = 0; h < simText.length; h++) {
                                    hash = (hash << 5) - hash + simText.charCodeAt(h);
                                    hash |= 0;
                                  }
                                  highlightStartIndex = Math.abs(hash) % words.length;
                                  if (words.length > 1 && highlightStartIndex === words.length - 1) {
                                    highlightStartIndex = words.length - 2;
                                  }
                                }

                                // Selection of 2 deterministic words for bôi vàng avoiding styling highlights
                                let highlightFirstIdx = -1;
                                let highlightSecondIdx = -1;
                                let highlightedWordIndices: number[] = [];
                                if (isHighlightTwoActive && totalWordsCount > 0) {
                                  let hash = 42; // constant seed for simulation block
                                  const isStyleHighlightInSim = (wordIdx: number) => {
                                    if (mode === 'alternating') {
                                      return wordIdx % 2 !== 0;
                                    }
                                    if (mode === 'pair') {
                                      return Math.floor(wordIdx / 2) % 2 !== 0;
                                    }
                                    if (mode === 'random_pair') {
                                      return highlightStartIndex !== -1 && (wordIdx === highlightStartIndex || wordIdx === highlightStartIndex + 1);
                                    }
                                    return false;
                                  };
                                  
                                  let baseIdx = Math.abs(hash * 17 + 3) % (totalWordsCount - 1);
                                  let chosenIdx = -1;
                                  const isFirstOrLast = (idx: number) => {
                                    if (totalWordsCount >= 4) {
                                      return idx === 0 || idx === totalWordsCount - 2;
                                    }
                                    return false;
                                  };

                                  // First try: style constraint AND avoiding first/last words
                                  for (let offset = 0; offset < totalWordsCount - 1; offset++) {
                                    const idx = (baseIdx + offset) % (totalWordsCount - 1);
                                    if (!isFirstOrLast(idx) && !isStyleHighlightInSim(idx) && !isStyleHighlightInSim(idx + 1)) {
                                      chosenIdx = idx;
                                      break;
                                    }
                                  }
                                  // Second try: style constraint only
                                  if (chosenIdx === -1) {
                                    for (let offset = 0; offset < totalWordsCount - 1; offset++) {
                                      const idx = (baseIdx + offset) % (totalWordsCount - 1);
                                      if (!isStyleHighlightInSim(idx) && !isStyleHighlightInSim(idx + 1)) {
                                        chosenIdx = idx;
                                        break;
                                      }
                                    }
                                  }
                                  // Third try: first/last constraint only
                                  if (chosenIdx === -1) {
                                    for (let offset = 0; offset < totalWordsCount - 1; offset++) {
                                      const idx = (baseIdx + offset) % (totalWordsCount - 1);
                                      if (!isFirstOrLast(idx) && !isStyleHighlightInSim(idx)) {
                                        chosenIdx = idx;
                                        break;
                                      }
                                    }
                                  }
                                  // Fourth try: relax everything
                                  if (chosenIdx === -1) {
                                    for (let offset = 0; offset < totalWordsCount - 1; offset++) {
                                      const idx = (baseIdx + offset) % (totalWordsCount - 1);
                                      if (!isStyleHighlightInSim(idx)) {
                                        chosenIdx = idx;
                                        break;
                                      }
                                    }
                                  }
                                  if (chosenIdx === -1) {
                                    chosenIdx = baseIdx;
                                  }
                                  
                                  highlightFirstIdx = chosenIdx;
                                  highlightSecondIdx = highlightFirstIdx + 1;
                                  highlightedWordIndices = [highlightFirstIdx, highlightSecondIdx];
                                }
                                return words.map((word, wIdx) => {
                                  if (isHighlightTwoActive && wIdx === highlightSecondIdx) {
                                    return null;
                                  }

                                  let wordColor = simColor;
                                  const highlightColor = (firstPreset && config.syncHighlightTextColor !== false)
                                    ? (config.subtitleHighlightBgColor || config.subtitleHighlightColor || '#EAB308')
                                    : ((firstPreset && firstPreset.subtitleHighlightColor) || config.subtitleHighlightColor || '#EAB308');
                                  const boxHighlightColor = config.subtitleHighlightBgColor || highlightColor;
                                  const enableHighlightContrastText = true;
                                  
                                  const isHighlighted = highlightedWordIndices.includes(wIdx);
                                  
                                  // Calculate progressive sweeping progress for simulator
                                  const blockDuration = 3.8;
                                  const sweepStart = blockDuration * (highlightFirstIdx / totalWordsCount);
                                  const sweepDuration = 0.3; // Snappy speed, twice as fast as before!

                                  let totalSweepP = 0;
                                  if (activeSimTime > sweepStart) {
                                    totalSweepP = Math.min(1.0, (activeSimTime - sweepStart) / sweepDuration);
                                  }

                                  let wordP = 0;
                                  if (isHighlighted) {
                                    if (wIdx === highlightFirstIdx) {
                                      wordP = Math.min(1.0, Math.max(0.0, totalSweepP / 0.5));
                                    } else if (wIdx === highlightSecondIdx) {
                                      wordP = Math.min(1.0, Math.max(0.0, (totalSweepP - 0.5) / 0.5));
                                    }
                                  }

                                  if (isHighlightTwoActive && wIdx === highlightFirstIdx) {
                                    const combinedText = word + " " + (words[wIdx + 1] || '');
                                    const bgGradient = `linear-gradient(90deg, ${boxHighlightColor} ${totalSweepP * 100}%, transparent ${totalSweepP * 100}%)`;
                                    const chars = combinedText.split('');

                                    return (
                                      <span 
                                        key={wIdx} 
                                        className="px-1.5 py-0.5 rounded-sm mx-0.5"
                                        style={{ 
                                          background: bgGradient,
                                          textShadow: 'none', 
                                          display: 'inline-block',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        {chars.map((char, cIdx) => {
                                          const isCovered = totalSweepP >= (cIdx / chars.length);
                                          return (
                                            <span 
                                              key={cIdx} 
                                              style={{ 
                                                color: (isCovered && enableHighlightContrastText) ? getContrastColor(boxHighlightColor) : simColor,
                                                whiteSpace: 'pre',
                                                transition: 'color 0.05s ease'
                                              }}
                                            >
                                              {char}
                                            </span>
                                          );
                                        })}
                                      </span>
                                    );
                                  }

                                  if (isHighlighted && wordP > 0) {
                                    const bgGradient = `linear-gradient(90deg, ${boxHighlightColor} ${wordP * 100}%, transparent ${wordP * 100}%)`;
                                    const chars = word.split('');

                                    return (
                                      <span 
                                        key={wIdx} 
                                        className="px-1 rounded-sm mx-0.5"
                                        style={{ 
                                          background: bgGradient,
                                          textShadow: 'none', 
                                          display: 'inline-block',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        {chars.map((char, cIdx) => {
                                          const isCovered = wordP >= (cIdx / chars.length);
                                          return (
                                            <span 
                                              key={cIdx} 
                                              style={{ 
                                                color: (isCovered && enableHighlightContrastText) ? getContrastColor(boxHighlightColor) : simColor,
                                                transition: 'color 0.05s ease'
                                              }}
                                            >
                                              {char}
                                            </span>
                                          );
                                        })}
                                      </span>
                                    );
                                  }

                                  if (isKaraoke) {
                                    const wordProgressIdx = (activeSimTime / 3.8) * totalWordsCount;
                                    const activeWordIdx = Math.floor(wordProgressIdx);
                                    
                                    if (wIdx === activeWordIdx) {
                                      return (
                                        <span 
                                          key={wIdx} 
                                          className="px-1 rounded-sm mx-0.5 animate-pulse"
                                          style={{ 
                                            backgroundColor: boxHighlightColor,
                                            color: enableHighlightContrastText ? getContrastColor(boxHighlightColor) : simColor,
                                            textShadow: 'none', 
                                            display: 'inline-block',
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          {word}
                                        </span>
                                      );
                                    } else if (wIdx < activeWordIdx) {
                                      wordColor = '#F2F2F7';
                                    } else {
                                      wordColor = 'rgba(255, 255, 255, 0.45)';
                                    }
                                  } else if (mode === 'alternating') {
                                    wordColor = (wIdx % 2 === 0) ? wordColor : highlightColor;
                                  } else if (mode === 'pair') {
                                    wordColor = (Math.floor(wIdx / 2) % 2 === 0) ? wordColor : highlightColor;
                                  } else if (mode === 'random_pair') {
                                    if (highlightStartIndex !== -1 && (wIdx === highlightStartIndex || wIdx === highlightStartIndex + 1)) {
                                      wordColor = highlightColor;
                                    } else {
                                      wordColor = simColor;
                                    }
                                  }
                                  return (
                                    <span key={wIdx} style={{ color: wordColor }}>
                                      {word}{wIdx < words.length - 1 ? ' ' : ''}
                                    </span>
                                  );
                                });
                              })()}
                            </div>
                          </>
                        );
                      })()}

                      {/* Brand Logo preview mockup if uploaded */}
                      {config.logoUrl && (
                        <img
                          src={config.logoUrl}
                          className="absolute pointer-events-none object-contain select-none"
                          style={{
                            left: `${config.logoX !== undefined ? config.logoX : 85}%`,
                            top: `${config.logoY !== undefined ? config.logoY : 15}%`,
                            width: `${(config.logoSize || 80) * 0.45}px`,
                            height: `${(config.logoSize || 80) * 0.45}px`,
                            opacity: config.logoOpacity !== undefined ? config.logoOpacity : 0.9,
                            transform: 'translate(-50%, -50%)',
                          }}
                          alt="Watermark logo"
                        />
                      )}

                      {/* Safety bounding lines */}
                      {isDragSimActive && (
                        <div className="absolute inset-0 border border-blue-500/30 bg-blue-500/[0.01] pointer-events-none transition-all">
                          <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-blue-500/20" />
                          <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-blue-500/20" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-white/40 italic text-center mt-1">
                      * Giữ chuột trên màn hình và kéo thả để tinh chỉnh toạ độ phụ đề cực kì trực quan.
                    </p>

                    {/* Highly visible text alignment control placed "outside" right where editing is happening! */}
                    <div className="bg-[#121217] border border-white/5 rounded-xl p-3.5 mt-3">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <AlignLeft size={13} className="text-blue-400" /> CĂN LỀ CHỮ PHỤ ĐỀ (ALIGNMENT)
                        </span>
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 font-bold font-mono px-2 py-0.5 rounded">
                          {(config.subtitleAlign || 'center').toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'left', name: 'Căn Trái', lines: ['w-6', 'w-4', 'w-5', 'w-3'] },
                          { id: 'center', name: 'Căn Giữa', lines: ['w-5 mx-auto', 'w-3 mx-auto', 'w-6 mx-auto', 'w-2 mx-auto'] },
                          { id: 'right', name: 'Căn Phải', lines: ['w-6 ml-auto', 'w-4 ml-auto', 'w-5 ml-auto', 'w-3 ml-auto'] },
                          { id: 'justify', name: 'Căn Đều (Justify)', lines: ['w-full', 'w-full', 'w-full', 'w-full'] }
                        ].map((item) => {
                          const active = (config.subtitleAlign || 'center') === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => updateConfig('subtitleAlign', item.id as any)}
                              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all text-[11px] font-bold ${
                                active
                                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                  : 'bg-[#030303] border-white/10 text-white/60 hover:text-white hover:border-white/20'
                              }`}
                            >
                              <div className="w-8 h-5 flex flex-col justify-between p-1 bg-black/40 border border-white/5 rounded">
                                {item.lines.map((lineWidth, index) => (
                                  <div key={index} className={`h-0.5 rounded-full ${lineWidth} ${active ? 'bg-blue-400' : 'bg-white/40'}`} />
                                ))}
                              </div>
                              <span>{item.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Entrance and Exit settings */}
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Hiệu ứng Hiển thị & Biến mất (Motion Animations)
                    </span>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-white/50 block mb-1.5 font-medium">Hiệu ứng chữ VÀO (Entrance):</label>
                        <select
                          value={config.subtitleEffectIn || 'zoom_fade'}
                          onChange={(e) => updateConfig('subtitleEffectIn', e.target.value as any)}
                          className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="zoom_fade">Thu phóng mờ dần (Zoom & Fade)</option>
                          <option value="bounce">Đàn hồi nảy nổ (Elastic Bounce)</option>
                          <option value="bounce_in">Nảy bóng bật cực phiêu (Bounce In)</option>
                          <option value="slide_up">Trượt bay từ dưới lên (Slide Up)</option>
                          <option value="slide_down">Ghi hình trượt từ trên xuống (Slide Down)</option>
                          <option value="slide_left">Vụn trượt từ góc phải qua (Slide Left)</option>
                          <option value="slide_right">Lốc trượt từ góc trái qua (Slide Right)</option>
                          <option value="zoom_in">Bùng phát từ tâm điểm nhỏ (Zoom In)</option>
                          <option value="zoom_out">Thu nhỏ từ kích thước lớn (Zoom Out)</option>
                          <option value="flip_in">Lật 3D lấp lánh (3D Flip Reveal)</option>
                          <option value="stretch_in">Kéo dãn dẻo nảy (Elastic Stretch)</option>
                          <option value="fade_in">Smooth xuất hiện mờ (Fade In)</option>
                          <option value="typewriter">Đánh chữ gõ chạy từ trái (Typewriter)</option>
                          <option value="none">Hiện ngay tức khắc (None)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-white/50 block mb-1.5 font-medium">Hiệu ứng chữ RA (Exit/Out):</label>
                        <select
                          value={config.subtitleEffectOut || 'fade'}
                          onChange={(e) => updateConfig('subtitleEffectOut', e.target.value as any)}
                          className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="fade">Mờ dần biến hẳn (Smooth Fade Out)</option>
                          <option value="slide_down">Trượt rơi xuống dưới (Slide Down)</option>
                          <option value="slide_up">Bay vọt lên trời cao (Slide Up Out)</option>
                          <option value="slide_left">Lướt bay dạt sang trái (Slide Left Out)</option>
                          <option value="slide_right">Lướt bay dạt sang phải (Slide Right Out)</option>
                          <option value="zoom_in">Bùng nổ vụt lớn biến mất (Zoom In Burst)</option>
                          <option value="zoom_out">Thu nhỏ biến mất (Zoom Out)</option>
                          <option value="flip_out">Lật 3D gập giấu chữ (3D Flip Hide)</option>
                          <option value="stretch_out">Co dãn dẻo biến mất (Stretch Out)</option>
                          <option value="none">Ẩn ngay tức khắc (None)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 space-y-4">
                      <div>
                        <label className="text-[11px] text-sky-400 block mb-1.5 font-bold uppercase tracking-wider">
                          🎬 Hiệu ứng chữ sống động & TikTok (Active Show Effect):
                        </label>
                        <select
                          value={config.subtitleShowEffect || 'none'}
                          onChange={(e) => updateConfig('subtitleShowEffect', e.target.value as any)}
                          className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                        >
                          <option value="none">✨ Không có (Chữ tĩnh đứng yên)</option>
                          <option value="typewriter">⌨️ Hiệu ứng gõ phím cơ (Chữ cái, xong trước 2/3 thời gian)</option>
                          {(config.enableTextHighlight || config.subtitleShowEffect === 'highlight_two_words') && (
                            <option value="highlight_two_words">🖊️ Bôi chữ ngẫu nhiên 2 từ dứt khoát (Highlight Two Words)</option>
                          )}
                          <option value="karaoke">🎤 Chữ chạy Karaoke (Đậm dần từng từ theo nhịp âm)</option>
                          <option value="tiktok_glow">🎵 Rung Neon Glow TikTok (Cyan/Magenta Glitch-Glow)</option>
                          <option value="pulse_grow">💓 Nhịp thở phập phồng (Breathing Grow & Pulse)</option>
                          <option value="bounce_loop">🎈 Bay bổng dập dềnh liên tục (Smooth Float Bounce)</option>
                          <option value="flicker_warm">🕯️ Ánh nến ấm lung linh nhấp nháy (Flickering Candle Glow)</option>
                          <option value="slide_up_down">↕️ Trượt lên xuống nhẹ nhàng (Gently Slide Up & Down)</option>
                          <option value="slide_left_right">↔️ Trượt trái phải đu đưa (Gently Slide Left & Right)</option>
                          <option value="wave_text">🌊 Sóng lượn tròng trành (Continuous Text Wave Wobble)</option>
                          <option value="shake_vibe">⚡ Rung lắc giật hành động nhạc mạnh (Action Shaking Vibe)</option>
                          <option value="rainbow_flow">🌈 Sắc màu vồng cầu dải ngân hà (Rainbow Spectrum Color Flow)</option>
                          <option value="glitch_cyber">👾 Nhiễu sóng Cyberpunk (Random Cyber Glitch Offset)</option>
                        </select>
                        <p className="text-[10px] text-white/40 mt-1">
                          Áp dụng chuyển động và hiệu ứng màu sắc dập dềnh liên tục lên câu phụ đề trong suốt thời gian hiển thị.
                        </p>
                      </div>

                      {/* BÔI CHỮ (Highlight Text) Dedicated Section */}
                      <div className="pt-3 border-t border-white/5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] text-sky-400 block font-bold uppercase tracking-wider">
                            🖊️ Tùy chọn BÔI CHỮ (Highlight text):
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const newValue = !(config.enableTextHighlight || config.subtitleShowEffect === 'highlight_two_words');
                              updateConfig('enableTextHighlight', newValue);
                              if (newValue) {
                                updateConfig('subtitleShowEffect', 'highlight_two_words');
                              } else if (config.subtitleShowEffect === 'highlight_two_words') {
                                updateConfig('subtitleShowEffect', 'none');
                              }
                            }}
                            className={`text-[10px] px-2.5 py-1 rounded-md border transition-all font-semibold ${
                              (config.enableTextHighlight || config.subtitleShowEffect === 'highlight_two_words')
                                ? 'bg-sky-500/10 text-sky-300 border-sky-400/30'
                                : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {(config.enableTextHighlight || config.subtitleShowEffect === 'highlight_two_words') ? 'ĐANG BẬT (ON)' : 'ĐANG TẮT (OFF)'}
                          </button>
                        </div>

{(config.enableTextHighlight || config.subtitleShowEffect === 'highlight_two_words') && (
                          <div className="bg-[#0b0b0f] border border-white/5 rounded-lg p-3 space-y-3.5 animate-in slide-in-from-top-1 duration-150">
                            <div>
                              <span className="text-[10px] text-white/50 block mb-1.5 font-medium">Chọn màu bôi chữ nền:</span>
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {[
                                  { name: 'Đen', color: '#000000' },
                                  { name: 'Trắng', color: '#FFFFFF' },
                                  { name: 'Vàng', color: '#EAB308' },
                                  { name: 'Xanh dương', color: '#3182CE' },
                                  { name: 'Xanh lá', color: '#38A169' },
                                  { name: 'Xám', color: '#718096' },
                                  { name: 'Cam', color: '#DD6B20' }
                                ].map((presetColor) => {
                                  const isActive = (config.subtitleHighlightBgColor || config.subtitleHighlightColor || '#EAB308').toLowerCase() === presetColor.color.toLowerCase();
                                  return (
                                    <button
                                      key={presetColor.color}
                                      type="button"
                                      onClick={() => {
                                        updateConfig('subtitleHighlightBgColor', presetColor.color);
                                        if (config.syncHighlightTextColor !== false) {
                                          updateConfig('subtitleHighlightColor', presetColor.color);
                                          syncHighlightColorToPresets(presetColor.color);
                                        }
                                      }}
                                      className={`px-1.5 py-0.5 text-[10px] rounded border flex items-center gap-1 transition-all ${
                                        isActive
                                          ? 'border-sky-400 bg-sky-400/10 text-white font-semibold'
                                          : 'border-white/5 bg-[#121117]/60 text-white/60 hover:border-white/10 hover:text-white'
                                      }`}
                                    >
                                      <span
                                        className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block"
                                        style={{ backgroundColor: presetColor.color }}
                                      />
                                      {presetColor.name}
                                    </button>
                                  );
                                })}

                                {/* Custom color input inside template */}
                                <div className="flex items-center gap-1 border border-white/5 rounded-md px-1.5 py-0.5 bg-white/5">
                                  <label htmlFor="custom-highlight-picker-widget" className="text-[9px] text-white/40 cursor-pointer">Bảng màu:</label>
                                  <input
                                    id="custom-highlight-picker-widget"
                                    type="color"
                                    value={config.subtitleHighlightBgColor || config.subtitleHighlightColor || '#EAB308'}
                                    onChange={(e) => {
                                      const newColor = e.target.value;
                                      updateConfig('subtitleHighlightBgColor', newColor);
                                      if (config.syncHighlightTextColor !== false) {
                                        updateConfig('subtitleHighlightColor', newColor);
                                        syncHighlightColorToPresets(newColor);
                                      }
                                    }}
                                    className="w-4 h-4 bg-transparent border-0 cursor-pointer p-0"
                                  />
                                  <span className="font-mono text-[9px] text-white/50">
                                    {(config.subtitleHighlightBgColor || config.subtitleHighlightColor || '#EAB308').toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Additional Checkboxes for bôi chữ */}
                            <div className="pt-2.5 border-t border-white/5 space-y-2">
                              {/* Styling Sync Option */}
                              <div className="flex items-center gap-2">
                                <input
                                  id="syncHighlightTextColor"
                                  type="checkbox"
                                  checked={config.syncHighlightTextColor !== false}
                                  onChange={(e) => {
                                    updateConfig('syncHighlightTextColor', e.target.checked);
                                  }}
                                  className="w-3.5 h-3.5 rounded bg-[#121117] border border-white/10 text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                />
                                <label htmlFor="syncHighlightTextColor" className="text-[10px] text-white/70 cursor-pointer select-none font-bold">
                                  SỬ DỤNG MÀU BÔI NÀY CHO HIGHLIGHT PHONG CÁCH GỐC
                                </label>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Translucent Background Settings */}
                  <div className="bg-[#121217] border border-white/10 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Palette size={13} className="text-sky-400" /> Tùy chọn cấu hình nền mờ (Blur Glass)
                        </h4>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          Chữ mặc định luôn khóa chặt vào tâm khối nền & tự co giãn cỡ chữ để nằm gọn gàng bên trong dải nền mờ.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 animate-in slide-in-from-top duration-200">


                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between text-[11px] text-white/50 mb-1.5">
                              <span>Chiều cao nền mờ (px):</span>
                              <span className="font-mono text-sky-400 font-bold">{config.blurBgHeight || 285}px</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="1080"
                              value={config.blurBgHeight || 285}
                              onChange={(e) => updateConfig('blurBgHeight', parseInt(e.target.value))}
                              className="w-full accent-sky-500 bg-[#050505] h-1.5 rounded cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[11px] text-white/50 mb-1.5">
                              <span>Chiều rộng dải mờ (%):</span>
                              <span className="font-mono text-sky-400 font-bold">{config.blurBgWidth || 100}%</span>
                            </div>
                            <input
                              type="range"
                              min="20"
                              max="150"
                              value={config.blurBgWidth || 100}
                              onChange={(e) => updateConfig('blurBgWidth', parseInt(e.target.value))}
                              className="w-full accent-sky-500 bg-[#050505] h-1.5 rounded cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Shape picker */}
                          <div>
                            <label className="text-[11px] text-white/50 block mb-1.5 font-medium">Hình dạng dải mờ (Shape):</label>
                            <select
                              value={config.blurBgShape || 'rectangle'}
                              onChange={(e) => updateConfig('blurBgShape', e.target.value as any)}
                              className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-500 font-medium"
                            >
                              <option value="rectangle">Hình chữ nhật (Rectangle)</option>
                              <option value="rounded">Góc thu tròn (Rounded Rect)</option>
                              <option value="pill">Hình hạt đậu (Pill Capsule)</option>
                              <option value="circle">Hình tròn (Circle / Avatar)</option>
                            </select>
                          </div>

                          {/* Color picker */}
                          <div>
                            <span className="text-[11px] text-white/50 block mb-1.5 font-medium">Màu sắc khối mờ (Color / Opacity):</span>
                            <div className="flex items-center gap-2 bg-[#050505] p-1 border border-white/10 rounded-lg h-[34px]">
                              <input
                                type="color"
                                value={config.blurBgColorHex || '#000000'}
                                onChange={(e) => updateConfig('blurBgColorHex', e.target.value)}
                                className="w-6 h-6 rounded border border-white/10 bg-transparent cursor-pointer"
                              />
                              <span className="text-[10px] font-mono text-white/80">{(config.blurBgColorHex || '#000000').toUpperCase()}</span>
                              
                              {/* Color quick presets */}
                              <div className="flex gap-1 ml-auto">
                                <button
                                  type="button"
                                  onClick={() => updateConfig('blurBgColorHex', '#000000')}
                                  title="Đen mờ"
                                  className="w-4 h-4 rounded-full bg-black border border-white/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateConfig('blurBgColorHex', '#ffffff')}
                                  title="Trắng mờ"
                                  className="w-4 h-4 rounded-full bg-white border border-white/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateConfig('blurBgColorHex', '#1e3a8a')}
                                  title="Xanh mờ"
                                  className="w-4 h-4 rounded-full bg-blue-900 border border-white/20"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Border color picker */}
                          <div>
                            <span className="text-[11px] text-white/50 block mb-1.5 font-medium">Màu viền khối mờ (Border Color):</span>
                            <div className="flex items-center gap-2 bg-[#050505] p-1 border border-white/10 rounded-lg h-[34px]">
                              <input
                                type="checkbox"
                                checked={!!config.blurBgBorderColorHex && config.blurBgBorderColorHex !== 'none'}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    updateConfig('blurBgBorderColorHex', '#ffffff');
                                  } else {
                                    updateConfig('blurBgBorderColorHex', 'none');
                                  }
                                }}
                                className="w-4 h-4 accent-sky-500 rounded cursor-pointer ml-1"
                                title="Kích hoạt viền"
                              />
                              <input
                                type="color"
                                disabled={!config.blurBgBorderColorHex || config.blurBgBorderColorHex === 'none'}
                                value={config.blurBgBorderColorHex && config.blurBgBorderColorHex !== 'none' ? config.blurBgBorderColorHex : '#ffffff'}
                                onChange={(e) => updateConfig('blurBgBorderColorHex', e.target.value)}
                                className="w-6 h-6 rounded border border-white/10 bg-transparent cursor-pointer disabled:opacity-40"
                              />
                              <span className="text-[10px] font-mono text-white/80 disabled:opacity-40">
                                {config.blurBgBorderColorHex && config.blurBgBorderColorHex !== 'none' ? config.blurBgBorderColorHex.toUpperCase() : 'KHÔNG CÓ'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-3">
                          {/* Blur intensity strength selector */}
                          <div>
                            <div className="flex justify-between text-[11px] text-white/50 mb-1">
                              <span>Độ dày nhám mờ thực tế:</span>
                              <span className="font-mono text-sky-400 font-bold">{config.blurBgBlurAmount !== undefined ? config.blurBgBlurAmount : 18}px</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="40"
                              value={config.blurBgBlurAmount !== undefined ? config.blurBgBlurAmount : 18}
                              onChange={(e) => updateConfig('blurBgBlurAmount', parseInt(e.target.value))}
                              className="w-full accent-sky-500 bg-[#050505] h-1.5 rounded cursor-pointer"
                            />
                          </div>

                          {/* Blur opacity opacity selector slider */}
                          <div>
                            <div className="flex justify-between text-[11px] text-white/50 mb-1">
                              <span>Độ mờ dải che nền:</span>
                              <span className="font-mono text-sky-400 font-bold">{Math.round((config.blurBgOpacity !== undefined ? config.blurBgOpacity : 0.5) * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={config.blurBgOpacity !== undefined ? config.blurBgOpacity : 0.5}
                              onChange={(e) => updateConfig('blurBgOpacity', parseFloat(e.target.value))}
                              className="w-full accent-sky-500 bg-[#050505] h-1.5 rounded cursor-pointer"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] text-white/50 block mb-1.5">Hướng In-Out dải mờ:</label>
                            <select
                              value={config.blurBgInOutEffect || 'bottom-to-top'}
                              onChange={(e) => updateConfig('blurBgInOutEffect', e.target.value as any)}
                              className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-500"
                            >
                              <option value="bottom-to-top">Từ dưới lên trên ↑</option>
                              <option value="top-to-bottom">Từ trên xuống dưới ↓</option>
                              <option value="left-to-right">Từ trái qua phải →</option>
                              <option value="right-to-left">Từ phải qua trái ←</option>
                              <option value="random">🎲 Ngẫu nhiên hướng</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 🔄 PHÂN PHỐI HIỆU ỨNG VÀ XOAY VÒNG PHONG CÁCH (STYLE ROTATION AND EFFECT DISTRIBUTION) */}
                    <div className="bg-[#121217] border border-white/10 rounded-xl p-4 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu size={13} className="text-blue-400" /> Tốc độ xoay vòng & Kiểu hiển thị chính
                        </h4>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          Điều chỉnh khoảng cách giãn cách ngẫu nhiên và mức độ ưu tiên giữa cách hiển thị Truyền thống và Hiệu ứng nền mờ.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Dominant style setting */}
                        <div>
                          <label className="text-[11px] text-white/50 block mb-1.5 font-medium">Kiểu hiển thị chính (Dominant Mode):</label>
                          <select
                            value={config.primaryRenderMode || 'alternate'}
                            onChange={(e) => updateConfig('primaryRenderMode', e.target.value as any)}
                            className="w-full text-xs bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500 font-bold"
                          >
                            <option value="alternate">Luân phiên xen kẽ đều (50 - 50)</option>
                            <option value="traditional_dominant">Ưu tiên Truyền thống (75% Truyền thống, 25% Hiệu ứng)</option>
                            <option value="effects_dominant">Ưu tiên Hiệu ứng mờ (75% Hiệu ứng, 25% Truyền thống)</option>
                            <option value="always_traditional">Chỉ dùng hiển thị Truyền thống (100% Traditional)</option>
                            <option value="always_effects">Chỉ dùng hiển thị Hiệu ứng & Nền mờ (100% Effects)</option>
                          </select>
                        </div>

                        {/* Switch gap intervals */}
                        <div>
                          <label className="text-[11px] text-white/50 block mb-1.5 font-medium">Giãn cách thay đổi kiểu hiển thị (Khoảng số đoạn):</label>
                          <div className="flex items-center gap-2.5 bg-[#050505] border border-white/10 rounded-lg px-3 py-1.5">
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-[10px] text-white/45">Từ</span>
                              <input
                                type="number"
                                min="1"
                                max="20"
                                value={config.substyleSwitchMin !== undefined ? config.substyleSwitchMin : 2}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  updateConfig('substyleSwitchMin', val);
                                  if (val > (config.substyleSwitchMax || 4)) {
                                    updateConfig('substyleSwitchMax', val);
                                  }
                                }}
                                className="w-10 bg-black border border-white/5 rounded text-center text-xs py-0.5 text-white focus:outline-none font-bold"
                              />
                            </div>
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-[10px] text-white/45">đến</span>
                              <input
                                type="number"
                                min="1"
                                max="20"
                                value={config.substyleSwitchMax !== undefined ? config.substyleSwitchMax : 4}
                                onChange={(e) => {
                                  let val = Math.max(1, parseInt(e.target.value) || 1);
                                  if (val < (config.substyleSwitchMin || 2)) {
                                    val = config.substyleSwitchMin || 2;
                                  }
                                  updateConfig('substyleSwitchMax', val);
                                }}
                                className="w-10 bg-black border border-white/5 rounded text-center text-xs py-0.5 text-white focus:outline-none font-bold"
                              />
                              <span className="text-[10px] text-white/45">đoạn</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  {/* SAVE / EXPORTS TEXT EFFECTS TEMPLATES SECTION */}
                  <div className="bg-[#121215] border border-white/10 rounded-xl p-4 space-y-4">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Lưu Thiết Lập Nhanh Vào MẪU CHỮ {selectedEffectMẫu}
                    </span>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newEffectTemplateName}
                        onChange={(e) => setNewEffectTemplateName(e.target.value)}
                        placeholder="Đặt tên hiệu ứng (Ví dụ: Chữ Bay, Nhấp Nháy)..."
                        className="flex-1 text-xs bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newEffectTemplateName.trim()) return;
                          const newTpl = {
                            id: `effect_${Date.now()}`,
                            name: newEffectTemplateName,
                            group: selectedEffectMẫu || 'A',
                            subtitleX: config.subtitleX !== undefined ? config.subtitleX : 50,
                            subtitleY: config.subtitleY !== undefined ? config.subtitleY : 85,
                            subtitleAlign: config.subtitleAlign || 'center',
                            subtitleEffectIn: config.subtitleEffectIn || 'zoom_fade',
                            subtitleEffectOut: config.subtitleEffectOut || 'fade',
                            enableBlurBg: !!config.enableBlurBg,
                            blurBgHeight: config.blurBgHeight || 285,
                            blurBgWidth: config.blurBgWidth || 100,
                            blurBgOpacity: config.blurBgOpacity !== undefined ? config.blurBgOpacity : 0.5,
                            blurBgInOutEffect: config.blurBgInOutEffect || 'bottom-to-top',
                            blurBgX: config.blurBgX !== undefined ? config.blurBgX : (config.subtitleX !== undefined ? config.subtitleX : 50),
                            blurBgY: config.blurBgY !== undefined ? config.blurBgY : (config.subtitleY !== undefined ? config.subtitleY : 85),
                            blurBgShape: config.blurBgShape || 'rectangle',
                            blurBgColorHex: config.blurBgColorHex || '#000000',
                            blurBgBorderColorHex: config.blurBgBorderColorHex || 'none',
                            blurBgBlurAmount: config.blurBgBlurAmount !== undefined ? config.blurBgBlurAmount : 18,
                            lockTextInBlur: !!config.lockTextInBlur,
                          };
                          setSavedEffects(prev => [...prev, newTpl]);
                          setNewEffectTemplateName('');
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-all"
                      >
                        <Plus size={11} /> Lưu thiết lập
                      </button>
                    </div>

                    {/* Saved templates collection lists */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">
                        Các thiết kế đã lưu của NHÓM {selectedEffectMẫu} ({savedEffects.filter(eff => (eff.group || 'A') === selectedEffectMẫu).length})
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {savedEffects.filter(eff => (eff.group || 'A') === selectedEffectMẫu).map((eff) => (
                          <div 
                            key={eff.id}
                            className="bg-[#050505] border border-white/10 rounded-lg p-2.5 flex items-center justify-between gap-1 transition-all group"
                          >
                            <div className="flex-1 text-left min-w-0">
                              <h5 className="text-[11px] font-bold text-white/95 truncate">{eff.name}</h5>
                              <p className="text-[9px] text-white/40 mt-0.5 truncate font-mono">
                                Pos: ({eff.subtitleX}%, {eff.subtitleY}%) • Blur: {eff.enableBlurBg ? 'bật' : 'tắt'}
                              </p>
                            </div>
                            {eff.id !== 'effect_default' && eff.id !== 'effect_cinematic' && (
                              <button
                                type="button"
                                onClick={() => setSavedEffects(prev => prev.filter(p => p.id !== eff.id))}
                                className="text-white/30 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-all"
                                title="Xóa mẫu"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* Tab 3: Intro & Outro configuration */}
          {activeTab === 'intro-outro' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Intro section card */}
              <div className="bg-[#050505]/40 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    📹 Cấu hình đoạn Intro (Mở đầu)
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div className="pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="video/mp4"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            const tempVideo = document.createElement('video');
                            tempVideo.preload = 'auto';
                            
                            let resolved = false;
                            const getDuration = () => {
                              if (resolved) return;
                              const dur = tempVideo.duration;
                              if (typeof dur === 'number' && isFinite(dur) && dur > 0) {
                                resolved = true;
                                updateConfig('introDuration', dur);
                                updateConfig('introVideoUrl', url);
                                if (onVideoConfigUploaded) {
                                  onVideoConfigUploaded('intro', file, dur);
                                }
                              }
                            };

                            tempVideo.onloadedmetadata = getDuration;
                            tempVideo.ondurationchange = getDuration;
                            tempVideo.onloadeddata = getDuration;

                            setTimeout(() => {
                              if (!resolved) {
                                resolved = true;
                                const lastCheck = tempVideo.duration;
                                const finalDur = (typeof lastCheck === 'number' && isFinite(lastCheck) && lastCheck > 0) ? lastCheck : 5;
                                updateConfig('introDuration', finalDur);
                                updateConfig('introVideoUrl', url);
                                if (onVideoConfigUploaded) {
                                  onVideoConfigUploaded('intro', file, finalDur);
                                }
                              }
                            }, 1000);

                            tempVideo.src = url;
                            tempVideo.load();
                          }
                        }}
                        className="hidden"
                        id="intro-video-upload-input"
                      />
                      {config.introVideoUrl ? (
                        <div className="flex items-center justify-between w-full bg-[#050505] p-3 rounded-lg border border-sky-500/30">
                          <span className="text-[11px] text-sky-400 font-mono truncate max-w-[220px] flex items-center gap-1.5 align-middle">
                            📹 Video Intro đã nạp ({config.introDuration.toFixed(1)}s)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateConfig('introVideoUrl', undefined);
                              updateConfig('introDuration', 0);
                              if (onVideoConfigRemoved) {
                                onVideoConfigRemoved('intro');
                              }
                            }}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-bold px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20"
                          >
                            Xóa Video
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('intro-video-upload-input');
                            if (el) el.click();
                          }}
                          className="w-full py-3 hover:bg-slate-950 border border-white/10 rounded-lg text-xs font-bold text-sky-400 flex items-center justify-center gap-2 bg-[#050505] hover:border-sky-500/30 transition-all"
                        >
                          <Upload size={13} /> Nạp Video MP4 làm Intro
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Outro section card */}
              <div className="bg-[#050505]/40 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    📹 Cấu hình đoạn Outro (Kết thúc)
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div className="pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="video/mp4"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            const tempVideo = document.createElement('video');
                            tempVideo.preload = 'auto';
                            
                            let resolved = false;
                            const getDuration = () => {
                              if (resolved) return;
                              const dur = tempVideo.duration;
                              if (typeof dur === 'number' && isFinite(dur) && dur > 0) {
                                resolved = true;
                                updateConfig('outroDuration', dur);
                                updateConfig('outroVideoUrl', url);
                                if (onVideoConfigUploaded) {
                                  onVideoConfigUploaded('outro', file, dur);
                                }
                              }
                            };

                            tempVideo.onloadedmetadata = getDuration;
                            tempVideo.ondurationchange = getDuration;
                            tempVideo.onloadeddata = getDuration;

                            setTimeout(() => {
                              if (!resolved) {
                                resolved = true;
                                const lastCheck = tempVideo.duration;
                                const finalDur = (typeof lastCheck === 'number' && isFinite(lastCheck) && lastCheck > 0) ? lastCheck : 5;
                                updateConfig('outroDuration', finalDur);
                                updateConfig('outroVideoUrl', url);
                                if (onVideoConfigUploaded) {
                                  onVideoConfigUploaded('outro', file, finalDur);
                                }
                              }
                            }, 1000);

                            tempVideo.src = url;
                            tempVideo.load();
                          }
                        }}
                        className="hidden"
                        id="outro-video-upload-input"
                      />
                      {config.outroVideoUrl ? (
                        <div className="flex items-center justify-between w-full bg-[#050505] p-3 rounded-lg border border-emerald-500/30">
                          <span className="text-[11px] text-emerald-400 font-mono truncate max-w-[220px] flex items-center gap-1.5 align-middle">
                            📹 Video Outro đã nạp ({config.outroDuration.toFixed(1)}s)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateConfig('outroVideoUrl', undefined);
                              updateConfig('outroDuration', 0);
                              if (onVideoConfigRemoved) {
                                onVideoConfigRemoved('outro');
                              }
                            }}
                            className="text-[10px] text-rose-450 hover:text-rose-350 font-bold px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20"
                          >
                            Xóa Video
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('outro-video-upload-input');
                            if (el) el.click();
                          }}
                          className="w-full py-3 hover:bg-slate-950 border border-white/10 rounded-lg text-xs font-bold text-emerald-400 flex items-center justify-center gap-2 bg-[#050505] hover:border-emerald-500/30 transition-all"
                        >
                          <Upload size={13} /> Nạp Video MP4 làm Outro
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Logo Watermark Overlay card */}
              <div className="bg-[#050505]/40 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={12} /> Logo & Watermark Thương hiệu
                  </span>
                  
                  {config.logoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        updateConfig('logoUrl', undefined);
                      }}
                      className="text-[9px] text-rose-400 hover:text-rose-300 font-bold px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 transition-all"
                    >
                      Xóa Logo
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-white/50 block mb-1.5">Tải lên Logo (.png, .jpg, .webp):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            updateConfig('logoUrl', url);
                          }
                        }}
                        className="hidden"
                        id="brand-logo-file-picker"
                      />
                      
                      {config.logoUrl ? (
                        <div className="flex items-center gap-3 w-full bg-[#050505] p-2.5 rounded-lg border border-amber-500/20">
                          <img src={config.logoUrl} alt="Logo preview icon" className="w-8 h-8 rounded object-contain bg-white/5 border border-white/15" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] text-amber-400 font-mono block truncate">
                              ✓ Đang sử dụng Logo
                            </span>
                            <span className="text-[9px] text-white/40 block">
                              (Có thể kéo chuột trực tiếp trên khung giả lập dưới đây)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('brand-logo-file-picker');
                            if (el) el.click();
                          }}
                          className="w-full py-2.5 hover:bg-slate-950 border border-white/10 rounded-lg text-[10px] font-bold text-amber-400 flex items-center justify-center gap-1.5 bg-[#050505]"
                        >
                          <Upload size={11} /> Nạp ảnh PNG/JPG Logo Thương hiệu
                        </button>
                      )}
                    </div>
                  </div>

                  {config.logoUrl && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* Logo Drag-and-Drop Canvas Simulator */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-white/40 block uppercase tracking-wider">
                          Khung giả lập căn vị trí Logo (Kéo thả trực tiếp):
                        </span>
                        
                        <div 
                          ref={logoContainerRef}
                          onPointerDown={handleLogoPointerDown}
                          onPointerMove={handleLogoPointerMove}
                          onPointerUp={handleLogoPointerUp}
                          onPointerLeave={handleLogoPointerUp}
                          className="relative aspect-video w-full bg-[#030303] border border-white/15 rounded-xl overflow-hidden cursor-crosshair select-none flex flex-col justify-between p-3"
                          style={{
                            touchAction: 'none',
                            backgroundImage: simBgImage ? `url(${simBgImage})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                          }}
                        >
                          {simBgImage && (
                            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                          )}
                          
                          {/* Grid lines */}
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-[0.05] pointer-events-none">
                            {[...Array(9)].map((_, i) => (
                              <div key={i} className="border border-white" />
                            ))}
                          </div>

                          <div className="absolute top-2 left-2 bg-black/85 border border-white/10 rounded px-1.5 py-0.5 pointer-events-none text-[7px] font-mono text-white/50 tracking-wider">
                            LOGO MONITOR • NHẤP KÉO LOGO TRÊN KHUNG NÀY
                          </div>

                          <div className="absolute bottom-2 left-2 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 pointer-events-none text-[7px] font-mono text-amber-400">
                            X: {config.logoX !== undefined ? config.logoX : 85}% • Y: {config.logoY !== undefined ? config.logoY : 15}%
                          </div>

                          {/* Simulating Logo */}
                          <img
                            src={config.logoUrl}
                            className="absolute pointer-events-none object-contain select-none shadow-md"
                            style={{
                              left: `${config.logoX !== undefined ? config.logoX : 85}%`,
                              top: `${config.logoY !== undefined ? config.logoY : 15}%`,
                              width: `${(config.logoSize || 80) * 0.45}px`,
                              height: `${(config.logoSize || 80) * 0.45}px`,
                              opacity: config.logoOpacity !== undefined ? config.logoOpacity : 0.9,
                              transform: 'translate(-50%, -50%)',
                            }}
                            alt="Drag preview overlay"
                          />

                          {/* guidborder */}
                          {isDraggingLogo && (
                            <div className="absolute inset-0 border border-amber-500/20 bg-amber-500/[0.01] pointer-events-none" />
                          )}
                        </div>
                      </div>

                      {/* Sliders */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#050505]/40 border border-white/5 p-3 rounded-lg">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-white/50">Kích thước Logo:</span>
                            <span className="text-[10px] font-mono text-white/80 font-bold">{config.logoSize || 80}px</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="250"
                            step="5"
                            value={config.logoSize || 80}
                            onChange={(e) => updateConfig('logoSize', parseInt(e.target.value))}
                            className="w-full accent-amber-500 bg-[#050505]/40 h-1 rounded-sm cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-white/50">Độ mờ (Opacity):</span>
                            <span className="text-[10px] font-mono text-white/80 font-bold">{Math.round((config.logoOpacity !== undefined ? config.logoOpacity : 0.9) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={config.logoOpacity !== undefined ? config.logoOpacity : 0.9}
                            onChange={(e) => updateConfig('logoOpacity', parseFloat(e.target.value))}
                            className="w-full accent-amber-500 bg-[#050505]/40 h-1 rounded-sm cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-white/50">Toạ độ X (%):</span>
                            <span className="text-[10px] font-mono text-white/80 font-bold">{config.logoX !== undefined ? config.logoX : 85}%</span>
                          </div>
                          <input
                            type="range"
                            min="2"
                            max="98"
                            step="0.5"
                            value={config.logoX !== undefined ? config.logoX : 85}
                            onChange={(e) => updateConfig('logoX', parseFloat(e.target.value))}
                            className="w-full accent-amber-500 bg-[#050505]/40 h-1 rounded-sm cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-white/50">Toạ độ Y (%):</span>
                            <span className="text-[10px] font-mono text-white/80 font-bold">{config.logoY !== undefined ? config.logoY : 15}%</span>
                          </div>
                          <input
                            type="range"
                            min="2"
                            max="98"
                            step="0.5"
                            value={config.logoY !== undefined ? config.logoY : 15}
                            onChange={(e) => updateConfig('logoY', parseFloat(e.target.value))}
                            className="w-full accent-amber-500 bg-[#050505]/40 h-1 rounded-sm cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Tab 4: Background Music configuration */}
          {activeTab === 'bg-music' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-[#050505]/40 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Music size={13} /> Chèn và Quản lý Nhạc Nền Video
                  </h3>
                  <p className="text-[10.5px] text-white/40 mt-1">
                    Nhạc nền này sẽ tự động lặp lại (loop) liên tục suốt chặng video. Nếu nạp nhiều bài, hệ thống sẽ tự động chọn <strong>Ngẫu nhiên</strong> 1 bài mỗi lần chạy hoặc xuất video.
                  </p>
                </div>

                {/* Main Audio Volume Control */}
                <div className="bg-gradient-to-r from-amber-500/5 to-amber-600/5 border border-amber-500/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-bold text-xs flex items-center gap-1.5 leading-tight">
                        <Volume2 size={13} className="text-amber-400" />
                        Âm lượng Tệp âm thanh gốc (Audio):
                      </h4>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        Tăng giảm biên độ giọng nói của tệp âm thanh thuyết minh (Audio chính) từ 50% đến 400%.
                      </p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {config.mainAudioVolume !== undefined ? config.mainAudioVolume : 200}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-white/30 font-medium">50%</span>
                    <input
                      type="range"
                      min="50"
                      max="400"
                      step="5"
                      value={config.mainAudioVolume !== undefined ? config.mainAudioVolume : 200}
                      onChange={(e) => updateConfig('mainAudioVolume', parseInt(e.target.value))}
                      className="flex-1 accent-amber-500 bg-[#050505]/40 h-1 rounded-sm cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-white/30 font-medium">400%</span>
                  </div>
                </div>

                {/* ADVANCED ANTI-YOUTUBE RADAR CHAOTIC NOISE WAVE BLOCK */}
                <div className="bg-gradient-to-br from-[#121225] via-[#0b0b14] to-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/15 shrink-0 mt-0.5">
                      <ShieldAlert size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-bold text-xs flex items-center gap-1.5 leading-tight">
                        Chống Quét Giọng Robot <span className="px-1.5 py-0.5 text-[8.5px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-black rounded uppercase">YouTube Audio Shield v2</span>
                      </h4>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-1">
                        Sóng âm ổn định của giọng nói Robot thường rất dễ để thuật toán AI của YouTube/TikTok nhận diện trùng lặp bản quyền hoặc đánh spam lặp lại. Đoạn <b>Tạp âm hỗn loạn (2 Phút)</b> được biên dịch ngẫu nhiên từ dải tần số nhiễu trắng (White), nhiễu nâu trầm (Brown rumbles) xen kẽ tần số quét (Sweep oscillators) để làm loạn thuật toán radar của YouTube mà không gây chói tai cho người xem.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-black/40 border border-white/5 p-2.5 rounded-lg flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setIsGeneratingNoise(true);
                        setTimeout(() => {
                          try {
                            const blob = generateChaoticNoiseWav();
                            const file = new File([blob], "TapAm_ChongQuetGiong_Robot_2M.wav", { type: "audio/wav" });
                            onAddBgMusic([file]);
                            setIsGeneratingNoise(false);
                          } catch (err) {
                            console.error("Lỗi tạo tạp âm:", err);
                            setIsGeneratingNoise(false);
                          }
                        }, 800);
                      }}
                      disabled={isGeneratingNoise}
                      className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-white/5 disabled:to-white/10 disabled:text-white/40 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-900/10 shrink-0"
                    >
                      {isGeneratingNoise ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Đang tính toán dải tần...</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={13} />
                          <span>Tạo 2 Phút Tạp Âm lộn xộn</span>
                        </>
                      )}
                    </button>

                    <div className="text-[10px] text-white/40 flex-1 min-w-[200px]">
                      Hệ thống tự động biên soạn và chèn thành một bài nhạc nền đặc thù có thể <b>nghe thử</b> và <b>chỉnh âm lượng</b> tùy ý bên dưới. Khuyên dùng đặt ở mức <b>15% - 30%</b> để vừa chống quét sóng âm vừa dễ chịu.
                    </div>
                  </div>
                </div>

                {/* Upload Button */}
                <div className="space-y-2">
                  <input
                    type="file"
                    multiple
                    accept="audio/mp3,audio/wav,audio/m4a,audio/ogg"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []) as File[];
                      if (files.length > 0) {
                        onAddBgMusic(files);
                      }
                    }}
                    className="hidden"
                    id="bg-music-upload-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('bg-music-upload-input');
                      if (el) el.click();
                    }}
                    className="w-full py-3.5 hover:bg-slate-950 border border-dashed border-white/20 rounded-xl text-xs font-bold text-indigo-400 bg-[#050505]/60 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-1.5 transition-all"
                  >
                    <Upload size={16} />
                    <span>Nạp tệp nhạc nền từ máy tính (.mp3, .wav, .m4a)</span>
                  </button>
                </div>

                {/* Music list */}
                {bgMusicFiles.length > 0 ? (
                  <div className="space-y-2 border-t border-white/5 pt-4">
                    <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Danh sách nhạc nền đã chèn ({bgMusicFiles.length})</span>
                    <div className="max-h-[180px] overflow-y-auto space-y-2.5 pr-1">
                      {bgMusicFiles.map((bg, idx) => (
                        <div
                          key={bg.id}
                          className="flex flex-col p-2.5 bg-[#050505] border border-white/5 rounded-lg group hover:border-indigo-500/30 transition-all text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 truncate flex-1">
                              <span className="text-white/30 font-mono text-[10px] w-4 text-right shrink-0">{(idx + 1).toString().padStart(2, '0')}</span>
                              <Music size={12} className="text-white/40 shrink-0" />
                              <span className="text-white/80 font-medium truncate" title={bg.name}>{bg.name}</span>
                              {bg.name && bg.name.toLowerCase().includes('tapam') && (
                                <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
                                  Shield 🛡️
                                </span>
                              )}
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                handleAuditionStop();
                                onDeleteBgMusic(bg.id);
                              }}
                              className="p-1 rounded text-white/55 hover:text-white hover:bg-rose-600 transition-all"
                              title="Xóa nhạc nền này"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Individual Slider and Volume value */}
                          <div className="flex items-center gap-2 pl-6 pt-1 border-t border-white/5">
                            <span className="text-[10px] text-white/40 shrink-0">Âm lượng nhạc nền:</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={bg.volume !== undefined ? bg.volume : 100}
                              onChange={(e) => {
                                const vol = parseInt(e.target.value) || 0;
                                onUpdateBgMusicVolume?.(bg.id, vol);
                              }}
                              className="h-1 bg-white/10 rounded appearance-none cursor-pointer accent-indigo-500 flex-1"
                            />
                            <span className="text-[10px] font-mono font-medium text-indigo-400 min-w-[32px] text-right">
                              {bg.volume !== undefined ? bg.volume : 100}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-white/30 italic">
                    Chưa có bài nhạc nền nào được tải lên.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 5: Human-like Behavior Configuration */}
          {activeTab === 'behavior' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-[#050505]/40 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={13} /> Hành vi giả lập con người (Human Behaviors)
                  </h3>
                  <p className="text-[10.5px] text-white/40 mt-1">
                    Cấu hình các hành vi ngẫu nhiên và hiệu ứng đặc biệt giúp video trông chân thực, sinh động và có tính tương tác cao như do con người tự biên soạn.
                  </p>
                </div>

                {/* Accordion List */}
                <BehaviorSettings
                  config={config}
                  updateConfig={updateConfig}
                  activeAccordion={activeBehaviorAccordion}
                  setActiveAccordion={setActiveBehaviorAccordion}
                />
                <div className="hidden">
                  
                  {/* Choice 1: Red Arrow & Circle */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 1 ? null : 1)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10 text-red-500 font-bold text-xs">1</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">Mũi tên đỏ & Vòng tròn chỉ định</span>
                          <span className="text-[10px] text-white/40">Tập trung sự chú ý bằng mũi tên bay vào khoanh vùng mục tiêu</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 1 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 1 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <label htmlFor="enableHumanArrow" className="text-[11px] text-white/80 font-medium cursor-pointer">
                            Kích hoạt hiệu ứng hành vi này
                          </label>
                          <input
                            type="checkbox"
                            id="enableHumanArrow"
                            checked={!!config.enableHumanArrow}
                            onChange={(e) => updateConfig('enableHumanArrow', e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 text-red-500 focus:ring-red-500/20 bg-black"
                          />
                        </div>

                        {config.enableHumanArrow && (
                          <div className="space-y-1.5 animate-in fade-in duration-200">
                            <label htmlFor="humanArrowBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                              Danh sách số thứ tự các đoạn xuất hiện
                            </label>
                            <input
                              type="text"
                              id="humanArrowBlocks"
                              placeholder="Ví dụ: 1, 3, 5"
                              value={config.humanArrowBlocks || ''}
                              onChange={(e) => updateConfig('humanArrowBlocks', e.target.value)}
                              className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                            />
                            <p className="text-[9.5px] text-white/45 leading-relaxed">
                              Nhập thứ tự các đoạn phụ đề trong dự án (ví dụ: 1, 3, 5), cách nhau bằng dấu phẩy. Tại các đoạn này, hệ thống sẽ tự động vẽ một vòng tròn mục tiêu màu đỏ tại điểm ngẫu nhiên, và bắn một mũi tên đỏ từ ngoài bay vào chỉ thẳng vào đó.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Choice 2: Typewriter Overlay text typing */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 2 ? null : 2)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 font-bold text-xs">2</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Gõ Chữ & Màn Mờ Đầy Bản</span>
                          <span className="text-[10px] text-white/40">Giả lập người thật đang trực tiếp gõ phụ đề kí tự trên phông nền mờ</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 2 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 2 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <label htmlFor="enableHumanTypewriter" className="text-[11px] text-white/80 font-medium cursor-pointer">
                            Kích hoạt hiệu ứng gõ chữ
                          </label>
                          <input
                            type="checkbox"
                            id="enableHumanTypewriter"
                            checked={!!config.enableHumanTypewriter}
                            onChange={(e) => updateConfig('enableHumanTypewriter', e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 text-amber-500 focus:ring-amber-500/20 bg-black"
                          />
                        </div>

                        {config.enableHumanTypewriter && (
                          <div className="space-y-4 animate-in fade-in duration-200">
                            <div className="space-y-1.5">
                              <label htmlFor="humanTypewriterBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                                Danh sách số thứ tự các đoạn xuất hiện
                              </label>
                              <input
                                type="text"
                                id="humanTypewriterBlocks"
                                placeholder="Ví dụ: 2, 4, 6"
                                value={config.humanTypewriterBlocks || ''}
                                onChange={(e) => updateConfig('humanTypewriterBlocks', e.target.value)}
                                className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                              />
                            </div>

                            <div className="space-y-2.5">
                              <span className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">Màu sắc màn mờ nền (Chọn 1 trong 10 màu)</span>
                              <div className="flex flex-wrap items-center gap-2">
                                {([
                                  { value: '#000000', label: 'Đen' },
                                  { value: '#ffffff', label: 'Trắng' },
                                  { value: '#1e3a8a', label: 'Xanh dương' },
                                  { value: '#064e3b', label: 'Xanh lá' },
                                  { value: '#7c3aed', label: 'Tím' },
                                  { value: '#811a1a', label: 'Đỏ' },
                                  { value: '#78350f', label: 'Vàng thổ' },
                                  { value: '#4b5563', label: 'Xám' },
                                  { value: '#be185d', label: 'Hồng đào' },
                                  { value: '#115e59', label: 'Lam ngọc' }
                                ]).map((presetColor) => {
                                  const colorActive = (config.humanTypewriterColor || '#000000').toLowerCase() === presetColor.value.toLowerCase();
                                  return (
                                    <button
                                      key={presetColor.value}
                                      type="button"
                                      disabled={!!config.randomTypewriterColor}
                                      onClick={() => updateConfig('humanTypewriterColor', presetColor.value)}
                                      className={`py-1 px-2.5 rounded text-[10.5px] font-bold border transition-all ${
                                        config.randomTypewriterColor
                                          ? 'bg-[#121217]/50 border-white/5 text-white/20 cursor-not-allowed'
                                          : colorActive
                                            ? 'bg-amber-600 border-amber-500 text-white shadow'
                                            : 'bg-[#121217] border-white/10 text-white/50 hover:bg-white/5 cursor-pointer'
                                      }`}
                                    >
                                      {presetColor.label}
                                    </button>
                                  );
                                })}

                                {/* Custom Color picker input (disabled if random checked) */}
                                <div className="flex items-center gap-1.5 ml-auto pl-2 border-l border-white/10">
                                  <label htmlFor="customTypewriterColor" className={`text-[10px] font-medium ${config.randomTypewriterColor ? 'text-white/20' : 'text-white/50'}`}>Tự chọn:</label>
                                  <input
                                    type="color"
                                    id="customTypewriterColor"
                                    disabled={!!config.randomTypewriterColor}
                                    value={config.humanTypewriterColor && config.humanTypewriterColor.startsWith('#') ? config.humanTypewriterColor : '#000000'}
                                    onChange={(e) => updateConfig('humanTypewriterColor', e.target.value)}
                                    className={`w-6 h-6 rounded cursor-pointer bg-transparent border-0 ${config.randomTypewriterColor ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    title="Chọn màu bất kỳ"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 bg-[#121217] border border-white/5 rounded-xl p-3">
                              <input
                                type="checkbox"
                                id="randomTypewriterColor"
                                checked={!!config.randomTypewriterColor}
                                onChange={(e) => updateConfig('randomTypewriterColor', e.target.checked)}
                                className="w-4 h-4 rounded border-white/10 text-amber-500 focus:ring-amber-500/20 bg-black cursor-pointer"
                              />
                              <label htmlFor="randomTypewriterColor" className="text-[11px] text-white/70 select-none cursor-pointer font-medium leading-tight">
                                🎲 Tự động chọn ngẫu nhiên 1 trong 10 màu sắc trên cho mỗi phân đoạn gõ chữ
                              </label>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">Độ mờ màn nền (Opacity)</span>
                                <span className="text-xs font-mono text-amber-400 font-bold">
                                  {config.humanTypewriterOpacity !== undefined ? config.humanTypewriterOpacity : 85}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={config.humanTypewriterOpacity !== undefined ? config.humanTypewriterOpacity : 85}
                                onChange={(e) => updateConfig('humanTypewriterOpacity', parseInt(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded appearance-none cursor-pointer accent-amber-500"
                              />
                            </div>

                            {/* Typewriter Volume Control & Preview click */}
                            <div className="space-y-2 pt-2.5 border-t border-white/5">
                              <div className="flex items-center justify-between">
                                <span className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">Âm lượng tiếng gõ phím (Typewriter)</span>
                                <span className="text-xs font-mono text-amber-400 font-bold">
                                  {config.typewriterVolume !== undefined ? config.typewriterVolume : 30}%
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min="0"
                                  max="200"
                                  step="10"
                                  value={config.typewriterVolume !== undefined ? config.typewriterVolume : 30}
                                  onChange={(e) => updateConfig('typewriterVolume', parseInt(e.target.value))}
                                  className="flex-1 h-1 bg-white/10 rounded appearance-none cursor-pointer accent-amber-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                                      if (AudioContextClass) {
                                        const tempCtx = new AudioContextClass();
                                        playTypewriterClick(tempCtx, undefined, config.typewriterVolume !== undefined ? config.typewriterVolume : 30);
                                        setTimeout(() => {
                                          tempCtx.close().catch(() => {});
                                        }, 400);
                                      }
                                    } catch (err) {
                                      console.warn("Could not test typewriter click:", err);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 hover:border-amber-500/40 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap active:scale-95 flex items-center gap-1.5"
                                >
                                  ▶ Thử tiếng gõ
                                </button>
                              </div>
                            </div>

                            <p className="text-[9.5px] text-white/45 leading-relaxed">
                              Nhập thứ tự đoạn phụ đề (ví dụ: 2, 4, 6). Tại các phân đoạn này, một lớp phủ màu sắc mờ tùy chọn với độ mờ tùy chỉnh sẽ che trọn màn hình, và phụ đề được hiển thị bằng hiệu ứng gõ đập cơ giả lập hoàn thành gõ trước khi kết thúc đoạn <strong>2/3 thời lượng</strong> (đáp ứng đúng 100% cảm quan người làm thật và tự động xuống dòng khi chữ quá dài).
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Choice 3: Smart Stickers */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 3 ? null : 3)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-xs">3</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">Sticker Thông Minh Khớp Từ Khóa</span>
                          <span className="text-[10px] text-white/40">Tự động kích hoạt sticker theo văn cảnh nội dung từ khóa của đoạn phụ đề</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 3 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 3 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="enableHumanStickers"
                              checked={!!config.enableHumanStickers}
                              onChange={(e) => updateConfig('enableHumanStickers', e.target.checked)}
                              className="w-4 h-4 rounded border-white/10 text-emerald-500 focus:ring-emerald-500/20 bg-black cursor-pointer"
                            />
                            <label htmlFor="enableHumanStickers" className="text-[11.5px] text-white/95 font-bold cursor-pointer uppercase tracking-wider">
                              Kích hoạt Sticker Thông Minh
                            </label>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Bạn có chắc chắn muốn Reset toàn bộ sticker về mặc định của hệ thống? Tất cả thay đổi, thêm hoặc xóa sticker trước đây sẽ bị khôi phục lại mỗi nhóm có 5 sticker mặc định cực kỳ đẹp mắt.')) {
                                updateConfig('humanStickerGroups', populateDefaultStickers(JSON.parse(JSON.stringify(DEFAULT_STICKER_GROUPS))));
                              }
                            }}
                            className="py-1 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded text-[9.5px] text-amber-400 font-bold uppercase tracking-wider transition-all duration-150 flex items-center gap-1 active:scale-95"
                          >
                            <RefreshCw size={10} className="animate-spin duration-1000" style={{ animationIterationCount: 1 }} /> RESET sticker
                          </button>
                        </div>

                        {config.enableHumanStickers && (
                          <div className="space-y-4 animate-in fade-in duration-200">
                            
                            {/* Smart Sticker groups list */}
                            <div className="space-y-3.5">
                              {((config.humanStickerGroups || []) as Array<any>).map((group, gIdx) => (
                                <div key={group.id} className="p-3 bg-[#111116] border border-white/5 rounded-lg space-y-3 relative">
                                  <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-emerald-400 font-bold">#{gIdx + 1}</span>
                                      <input
                                        type="text"
                                        placeholder="Tên nhóm (ví dụ: SAD)"
                                        value={group.name}
                                        onChange={(e) => {
                                          const nextGroups = [...(config.humanStickerGroups || [])];
                                          nextGroups[gIdx] = { ...group, name: e.target.value };
                                          updateConfig('humanStickerGroups', nextGroups);
                                        }}
                                        className="bg-[#181822] border border-white/10 rounded px-2 py-0.5 text-xs text-white uppercase font-bold focus:outline-none"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextGroups = (config.humanStickerGroups || []).filter((_, idx) => idx !== gIdx);
                                        updateConfig('humanStickerGroups', nextGroups);
                                      }}
                                      className="text-[10px] text-rose-400 hover:underline font-bold"
                                    >
                                      Xóa nhóm
                                    </button>
                                  </div>

                                  {/* Keywords selection */}
                                  <div className="space-y-1">
                                    <span className="block text-[9.5px] uppercase text-white/40 font-bold font-mono">Từ khóa kích hoạt (cách nhau bằng dấu phẩy)</span>
                                    <input
                                      type="text"
                                      placeholder="sad, cry, crying, tears, depressed..."
                                      value={group.keywords}
                                      onChange={(e) => {
                                        const nextGroups = [...(config.humanStickerGroups || [])];
                                        nextGroups[gIdx] = { ...group, keywords: e.target.value };
                                        updateConfig('humanStickerGroups', nextGroups);
                                      }}
                                      className="w-full bg-[#050505] border border-white/5 rounded px-2.5 py-1.5 text-xs text-white"
                                    />
                                  </div>

                                  {/* Sticker dimensions size */}
                                  <div className="flex items-center gap-4 py-1">
                                    <span className="text-[10px] text-white/50 shrink-0">Kích thước sticker:</span>
                                    <input
                                      type="range"
                                      min="120"
                                      max="550"
                                      step="10"
                                      value={group.size || 280}
                                      onChange={(e) => {
                                        const nextGroups = [...(config.humanStickerGroups || [])];
                                        nextGroups[gIdx] = { ...group, size: parseInt(e.target.value) };
                                        updateConfig('humanStickerGroups', nextGroups);
                                      }}
                                      className="h-1 bg-white/10 rounded appearance-none cursor-pointer accent-emerald-500 flex-1"
                                    />
                                    <span className="text-[10.5px] font-mono text-emerald-400 font-bold min-w-[34px] text-right">
                                      {group.size || 280}px
                                    </span>
                                  </div>

                                  {/* Upload images for this sticker group */}
                                  <div className="space-y-1.5 pt-1">
                                    <span className="block text-[9.5px] uppercase text-white/40 font-bold font-mono">Ảnh sticker ({group.images?.length || 0})</span>
                                    <input
                                      type="file"
                                      multiple
                                      accept="image/png,image/jpeg,image/webp"
                                      id={`sticker-upload-${group.id}`}
                                      className="hidden"
                                      onChange={(e) => {
                                        const files = Array.from(e.target.files || []) as File[];
                                        if (files.length === 0) return;

                                        // Convert images to base64
                                        const promises = files.map((file: File) => {
                                          return new Promise<{ id: string, name: string, base64: string }>((resolve) => {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                              resolve({
                                                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                                name: file.name,
                                                base64: event.target?.result as string
                                              });
                                            };
                                            reader.readAsDataURL(file);
                                          });
                                        });

                                        Promise.all(promises).then((newImgs) => {
                                          const nextGroups = [...(config.humanStickerGroups || [])];
                                          nextGroups[gIdx] = {
                                            ...group,
                                            images: [...(group.images || []), ...newImgs]
                                          };
                                          updateConfig('humanStickerGroups', nextGroups);
                                        });
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => document.getElementById(`sticker-upload-${group.id}`)?.click()}
                                      className="py-1 px-3 bg-[#181822] hover:bg-[#20202d] border border-white/5 rounded text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                      <Upload size={10} /> Thêm ảnh sticker mới
                                    </button>

                                    {/* Small Thumbnails grid */}
                                    {group.images && group.images.length > 0 && (
                                      <div className="grid grid-cols-4 gap-2 pt-2">
                                        {group.images.map((img: any, iIdx: number) => (
                                          <div key={img.id} className="relative group bg-black/40 border border-white/5 p-1 rounded flex flex-col items-center">
                                            <img
                                              src={img.base64}
                                              alt={img.name}
                                              className="w-10 h-10 object-contain rounded"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const nextGroups = [...(config.humanStickerGroups || [])];
                                                nextGroups[gIdx] = {
                                                  ...group,
                                                  images: group.images.filter((x: any) => x.id !== img.id)
                                                };
                                                updateConfig('humanStickerGroups', nextGroups);
                                              }}
                                              className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                                              title="Xóa sticker này"
                                            >
                                              <X size={10} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Button input to add new group */}
                            <button
                              type="button"
                              onClick={() => {
                                const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                                const nextGroups = [
                                  ...(config.humanStickerGroups || []),
                                  {
                                    id: newId,
                                    name: 'SAD',
                                    keywords: 'sad, cry, crying',
                                    size: 280,
                                    images: []
                                  }
                                ];
                                updateConfig('humanStickerGroups', nextGroups);
                              }}
                              className="w-full py-2 bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 text-emerald-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Plus size={13} /> Thêm Nhóm Sticker Từ Khóa Mới
                            </button>

                            <p className="text-[9.5px] text-white/45 leading-relaxed">
                              Đăng ký nhóm sticker theo cảm xúc (ví dụ: SAD, HAPPY, LAUGH). Điền các từ khóa cách nhau bằng dấu phẩy. Khi trong câu phụ đề chứa bất kỳ từ khóa nào đó, <strong>hai (2) sticker</strong> có kích thước to rõ rệt thuộc nhóm đó sẽ tự động đồng loạt bay từ hai rìa trái phải của màn hình vào vị trí ngẫu nhiên và lắc lư chuyển động vô cùng chân thực và tự nhiên (ảnh sticker được chọn ngẫu nhiên độc lập nếu nhóm có nhiều ảnh).
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Choice 4: Highlight Custom Text */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 4 ? null : 4)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs">4</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">NỔI BẬT CHỮ</span>
                          <span className="text-[10px] text-white/40">Tự động nhận dạng các mốc ngày tháng năm hoặc chữ viết hoa để hiển thị nổi bật ở trung tâm</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 4 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 4 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <label htmlFor="enableHighlightDate" className="text-[11.5px] text-white/95 font-bold cursor-pointer uppercase tracking-wider">
                            Kích hoạt nổi bật chữ
                          </label>
                          <input
                            type="checkbox"
                            id="enableHighlightDate"
                            checked={!!config.enableHighlightDate}
                            onChange={(e) => updateConfig('enableHighlightDate', e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 text-blue-500 focus:ring-blue-500/20 bg-black cursor-pointer"
                          />
                        </div>

                        {config.enableHighlightDate && (
                          <div className="space-y-4 animate-in fade-in duration-200 pt-2 border-t border-white/5">
                            {/* Only Caplock mode remains as per user requested */}
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                              <div className="flex items-center justify-between">
                                <label htmlFor="highlightTextModeCaps" className="text-[11px] text-white/80 cursor-pointer flex flex-col">
                                  <span className="font-bold flex items-center gap-1.5 text-blue-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                    Nổi bật chữ caplock (Chuyển tiếp tự động)
                                  </span>
                                  <span className="text-[10px] text-white/45 mt-0.5">Nhận diện và thu phóng các từ được viết hoàn toàn bằng chữ in hoa (Ví dụ: KATIE, HELLO,...) ở trung tâm màn hình.</span>
                                </label>
                                <input
                                  type="checkbox"
                                  id="highlightTextModeCaps"
                                  checked={config.highlightTextModeCaps !== false}
                                  onChange={(e) => updateConfig('highlightTextModeCaps', e.target.checked)}
                                  className="w-4 h-4 rounded border-white/10 text-blue-500 focus:ring-blue-500/20 bg-black cursor-pointer"
                                />
                              </div>
                            </div>

                            {/* Test Canvas & Font Size Config */}
                            <div className="grid grid-cols-2 gap-4">
                              {/* Font Size slider */}
                              <div className="space-y-1.5 col-span-2">
                                <div className="flex items-center justify-between">
                                  <span className="block text-[10px] text-white/50 uppercase tracking-wider font-bold">Cỡ chữ (Font Size):</span>
                                  <span className="text-xs font-mono text-blue-400 font-bold">
                                    {config.highlightTextFontSize || 150}px
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="24"
                                  max="250"
                                  step="5"
                                  value={config.highlightTextFontSize || 150}
                                  onChange={(e) => updateConfig('highlightTextFontSize', parseInt(e.target.value))}
                                  className="w-full h-1 bg-white/10 rounded appearance-none cursor-pointer accent-blue-500"
                                />
                              </div>
                            </div>

                            {/* Font Family selector */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] text-white/50 uppercase tracking-wider font-bold">Font chữ phong cách:</label>
                              <select
                                value={config.highlightDateFontFamily || 'Josefin Sans'}
                                onChange={(e) => updateConfig('highlightDateFontFamily', e.target.value)}
                                className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                              >
                                {SUBTITLE_FONTS.map((f) => (
                                  <option key={f} value={f}>{f}</option>
                                ))}
                              </select>
                            </div>

                            {/* Colors adjustment */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] text-white/50 uppercase tracking-wider font-bold">Màu chữ:</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={config.highlightDateColor || '#FFFFFF'}
                                  onChange={(e) => updateConfig('highlightDateColor', e.target.value)}
                                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                                />
                                <input
                                  type="text"
                                  value={config.highlightDateColor || '#FFFFFF'}
                                  onChange={(e) => updateConfig('highlightDateColor', e.target.value)}
                                  className="flex-1 bg-[#121217] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none font-mono text-center uppercase"
                                />
                              </div>
                            </div>

                            <p className="text-[9.5px] text-white/45 leading-relaxed">
                              Khi kích hoạt bôi nổi bật chữ, khi phân đoạn có ngày/tháng/năm hoặc các từ viết hoa hoàn toàn (KATIE, COLD,...), hệ thống sẽ <strong>chỉ bôi hiển thị từ khóa nổi bật đó</strong> phóng to ở giữa màn hình bằng hiệu ứng gõ chữ từng chữ cái cực kỳ chuẩn xác và hoàn thành trước 2/3 thời gian của đoạn.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Choice 5: Background Noise */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 5 ? null : 5)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/10 text-violet-400 font-bold text-xs">5</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">Thêm Tạp Âm Giả Lập Môi Trường</span>
                          <span className="text-[10px] text-white/40">Kích hoạt tạp âm đời thực rải rác để vượt qua cơ chế quét AI của YouTube</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 5 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 5 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <label htmlFor="enableBackgroundNoise" className="text-[11.5px] text-white/95 font-bold cursor-pointer uppercase tracking-wider">
                            Kích hoạt Thêm Tạp Âm
                          </label>
                          <input
                            type="checkbox"
                            id="enableBackgroundNoise"
                            checked={!!config.enableBackgroundNoise}
                            onChange={(e) => updateConfig('enableBackgroundNoise', e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 text-violet-500 focus:ring-violet-500/20 bg-black cursor-pointer"
                          />
                        </div>

                        {config.enableBackgroundNoise && (
                          <div className="space-y-4 animate-in fade-in duration-200 pt-3 border-t border-white/5">
                            <p className="text-[10px] text-white/50 leading-relaxed">
                              Độ dài video tính theo từng phân đoạn phụ đề (đoạn 1, đoạn 2,...). Hãy nhập các số thứ tự đoạn xuất hiện (ví dụ: <strong className="text-violet-400">1, 3</strong>) bên cạnh từng loại tiếng để hệ thống tự động bồi đắp dải âm sinh hoạt sống động khi xuất video.
                            </p>

                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                              {([
                                { id: 'dog_bark', name: '🐶 Tiếng chó sủa', description: 'Hai tiếng chó sủa gâu gâu tự nhiên vọng từ xa' },
                                { id: 'door_close', name: '🚪 Tiếng đóng cửa', description: 'Đóng sập cửa phòng dứt khoát kèm âm cơ học ổ khóa' },
                                { id: 'wind', name: '💨 Tiếng gió rít', description: 'Gió thổi rít qua khe cửa u u dồn dập rồi vơi dần' },
                                { id: 'car_horn', name: '🚗 Tiếng còi xe', description: 'Còi xe hơi bíp bíp kép dội lại từ xa bên ngoài đường' },
                                { id: 'people_talk', name: '🗣️ Tiếng người nói', description: 'Tiếng đám người nói tiếng xì xào râm ran trong phòng' },
                                { id: 'mouse_click', name: '🖱️ Tiếng click chuột', description: 'Bấm chuột tách tách dứt khoát nhanh của dân văn phòng' },
                                { id: 'keyboard', name: '⌨️ Tiếng gõ phím', description: 'Tiếng gõ lách cách lách cách bàn phím cơ 3 nhịp liền' },
                                { id: 'page_turn', name: '📄 Tiếng lật trang giấy', description: 'Tiếng xột xoạt sột soạt lật nhanh trang giấy tập vở' },
                                { id: 'cough', name: '😷 Tiếng ho khan', description: 'Đằng hắng ho khan hai nhịp nhẹ nhõm chân thực' },
                                { id: 'phone_ring', name: '📞 Tiếng điện thoại reng', description: 'Chuông điện thoại tít tít lặp lại dứt khoát hiện đại' },
                                { id: 'applause', name: '👏 Tiếng vỗ tay hoan hô', description: 'Đám đông vỗ tay hoan nghênh reo hò rào rào dồn dập' }
                              ]).map((item) => {
                                const activeNoiseConfig = (config.backgroundNoises || []).find((n: any) => n.id === item.id) || {
                                  id: item.id,
                                  name: item.name,
                                  segments: '',
                                  volume: 50
                                };

                                const handleNoiseConfigChange = (key: string, value: any) => {
                                  const currentList = [...(config.backgroundNoises || [])];
                                  const existingIdx = currentList.findIndex((n: any) => n.id === item.id);
                                  const updatedItem = { ...activeNoiseConfig, [key]: value };
                                  
                                  if (existingIdx >= 0) {
                                    currentList[existingIdx] = updatedItem;
                                  } else {
                                    currentList.push(updatedItem);
                                  }
                                  updateConfig('backgroundNoises', currentList);
                                };

                                return (
                                  <div key={item.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-lg space-y-2.5 transition-all hover:bg-white/[0.04]">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-1.5">
                                      <div>
                                        <span className="text-[11.5px] font-bold text-violet-300 block">{item.name}</span>
                                        <span className="text-[9.5px] text-white/35 italic block leading-snug">{item.description}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            try {
                                              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                                              if (AudioContextClass) {
                                                const tempCtx = new AudioContextClass();
                                                playBackgroundNoise(item.id, tempCtx, undefined, activeNoiseConfig.volume);
                                                setTimeout(() => {
                                                  tempCtx.close().catch(() => {});
                                                }, 2500);
                                              }
                                            } catch (err) {
                                              console.warn("Could not test sound noise:", err);
                                            }
                                          }}
                                          className="px-2.5 py-1 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 hover:border-violet-500/40 rounded-md text-[9.5px] font-bold transition-all whitespace-nowrap active:scale-95"
                                        >
                                          🔊 Nghe thử
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                      <div className="space-y-1">
                                        <label className="block text-[9.5px] text-white/50 uppercase font-bold tracking-wider">Đoạn phụ đề kích hoạt:</label>
                                        <input
                                          type="text"
                                          placeholder="Ví dụ: 1, 3, 5"
                                          value={activeNoiseConfig.segments || ''}
                                          onChange={(e) => handleNoiseConfigChange('segments', e.target.value)}
                                          className="w-full bg-[#121217] border border-white/5 rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9.5px] text-white/50 uppercase font-bold tracking-wider">Âm lượng (Volume):</span>
                                          <span className="text-[10px] font-mono text-violet-400 font-bold">{activeNoiseConfig.volume}%</span>
                                        </div>
                                        <input
                                          type="range"
                                          min="0"
                                          max="100"
                                          step="5"
                                          value={activeNoiseConfig.volume}
                                          onChange={(e) => handleNoiseConfigChange('volume', parseInt(e.target.value))}
                                          className="w-full h-1 bg-white/5 rounded appearance-none cursor-pointer accent-violet-500"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <p className="text-[9px] text-violet-400/70 italic leading-normal">
                              * Các tạp âm này được thiết kế dựa trên thuật toán dao động sóng âm tự nhiên (Programmatic Synthesis) – giúp cho video biến đổi phổ âm tần cực kỳ phong phú và qua mặt 100% các bộ lọc nhận dạng của YouTube một cách an toàn nhất!
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Choice 6: Fake News Effect */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 6 ? null : 6)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs">6</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Báo chí "FAKE NEWS"</span>
                          <span className="text-[10px] text-white/40">Thay thế bằng trang báo in thực tế, bôi nhòe dải tin phụ và bôi vàng 2 từ tâm điểm</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 6 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 6 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <label htmlFor="enableFakeNews" className="text-[11.5px] text-white/95 font-bold cursor-pointer uppercase tracking-wider">
                            Kích hoạt hiệu ứng FAKE NEWS
                          </label>
                          <input
                            type="checkbox"
                            id="enableFakeNews"
                            checked={!!config.enableFakeNews}
                            onChange={(e) => updateConfig('enableFakeNews', e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 text-emerald-500 focus:ring-emerald-500/20 bg-black cursor-pointer"
                          />
                        </div>

                        {config.enableFakeNews && (
                          <div className="space-y-4 animate-in fade-in duration-200 pt-3 border-t border-white/5">
                            <div className="space-y-1.5">
                              <label htmlFor="fakeNewsBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                                Danh sách số thứ tự các đoạn xuất hiện
                              </label>
                              <input
                                type="text"
                                id="fakeNewsBlocks"
                                placeholder="Ví dụ: 2, 4"
                                value={config.fakeNewsBlocks || ''}
                                onChange={(e) => updateConfig('fakeNewsBlocks', e.target.value)}
                                className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                              />
                              <p className="text-[9.5px] text-white/45 leading-relaxed">
                                Nhập thứ tự của các đoạn phụ đề cách nhau bởi dấu phẩy (ví dụ: <strong className="text-emerald-400">2, 4, 7</strong>). Trình chiếu sẽ tự động chuyển đổi nền sang trang báo in sang trọng, làm mờ dải tin xung quanh một cách mượt mà và làm nổi bật dải thuyết minh bằng phong cách vẽ bút dạ bôi vàng (Highlighter Marker) cực kỳ nghệ thuật!
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Choice 7: Handwriting Effect */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 7 ? null : 7)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-xs">7</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Bút viết "BÚT VIẾT CHỮ"</span>
                          <span className="text-[10px] text-white/40">Thay thế bằng trang giấy học sinh có dòng kẻ, hiển thị hiệu ứng bút vẽ từng ký tự mượt mà</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 7 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 7 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <label htmlFor="enableHandWrite" className="text-[11.5px] text-white/95 font-bold cursor-pointer uppercase tracking-wider">
                            Kích hoạt hiệu ứng BÚT VIẾT CHỮ
                          </label>
                          <input
                            type="checkbox"
                            id="enableHandWrite"
                            checked={!!config.enableHandWrite}
                            onChange={(e) => updateConfig('enableHandWrite', e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 text-indigo-500 focus:ring-indigo-500/20 bg-black cursor-pointer"
                          />
                        </div>

                        {config.enableHandWrite && (
                          <div className="space-y-4 animate-in fade-in duration-200 pt-3 border-t border-white/5">
                            <div className="space-y-1.5">
                              <label htmlFor="handWriteBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                                Danh sách số thứ tự các đoạn xuất hiện
                              </label>
                              <input
                                type="text"
                                id="handWriteBlocks"
                                placeholder="Ví dụ: 3, 5"
                                value={config.handWriteBlocks || ''}
                                onChange={(e) => updateConfig('handWriteBlocks', e.target.value)}
                                className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                              <p className="text-[9.5px] text-white/45 leading-relaxed">
                                Nhập thứ tự của các đoạn phụ đề cách nhau bởi dấu phẩy (ví dụ: <strong className="text-indigo-400">3, 5, 8</strong>). Trình chiếu sẽ tự động chuyển đổi nền sang trang giấy học sinh cổ điển mộc mạc và hiển thị một chiếc bút viết mượt mà từng chữ cái theo thời gian khớp chuẩn xác với nhịp đọc!
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Choice 8: Fake Comment Effect */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 8 ? null : 8)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs">8</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Bình luận "FAKE COMMENT"</span>
                          <span className="text-[10px] text-white/40">Giao diện bình luận với hiệu ứng cuộn, sử dụng con trỏ chuột bôi đen 2 từ nổi bật</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 8 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 8 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <label htmlFor="enableFakeComment" className="text-[11.5px] text-white/95 font-bold cursor-pointer uppercase tracking-wider">
                            Kích hoạt hiệu ứng FAKE COMMENT
                          </label>
                          <input
                            type="checkbox"
                            id="enableFakeComment"
                            checked={!!config.enableFakeComment}
                            onChange={(e) => updateConfig('enableFakeComment', e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 text-blue-500 focus:ring-blue-500/20 bg-black cursor-pointer"
                          />
                        </div>

                        {config.enableFakeComment && (
                          <div className="space-y-4 animate-in fade-in duration-200 pt-3 border-t border-white/5">
                            <div className="space-y-1.5">
                              <label htmlFor="fakeCommentBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                                Danh sách số thứ tự các đoạn xuất hiện
                              </label>
                              <input
                                type="text"
                                id="fakeCommentBlocks"
                                placeholder="Ví dụ: 1, 4"
                                value={config.fakeCommentBlocks || ''}
                                onChange={(e) => updateConfig('fakeCommentBlocks', e.target.value)}
                                className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                              />
                              <p className="text-[9.5px] text-white/45 leading-relaxed">
                                Nhập thứ tự của các đoạn phụ đề cách nhau bởi dấu phẩy (ví dụ: <strong className="text-blue-400">1, 4, 6</strong>). Trình chiếu sẽ tự động chuyển sang giao diện danh sách bình luận (Comment feed) hiện đại, cuộn mượt xuống và dừng lại tại bình luận target (chứa nội dung sub). Sau đó, một con trỏ chuột thực tế sẽ di chuyển và bôi chọn (highlight bôi đen) hai từ tâm điểm một cách uyển chuyển như người dùng thật đang đọc!
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 9 ? null : 9)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs">9</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Trang báo "FAKE WEBSITE"</span>
                          <span className="text-[10px] text-white/40">Giao diện trang báo tin tức với các đoạn văn, ảnh quảng cáo được làm mờ dập khuôn, làm nổi bật và bôi đen 2 từ đoạn sub chuẩn</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 9 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 9 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <label htmlFor="enableFakeWebsite" className="text-[11.5px] text-white/95 font-bold cursor-pointer uppercase tracking-wider">
                            Kích hoạt hiệu ứng FAKE WEBSITE
                          </label>
                          <input
                            type="checkbox"
                            id="enableFakeWebsite"
                            checked={!!config.enableFakeWebsite}
                            onChange={(e) => updateConfig('enableFakeWebsite', e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 text-blue-500 focus:ring-blue-500/20 bg-black cursor-pointer"
                          />
                        </div>

                        {config.enableFakeWebsite && (
                          <div className="space-y-4 animate-in fade-in duration-200 pt-3 border-t border-white/5">
                            <div className="space-y-1.5">
                              <label htmlFor="fakeWebsiteBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                                Danh sách số thứ tự các đoạn xuất hiện
                              </label>
                              <input
                                type="text"
                                id="fakeWebsiteBlocks"
                                placeholder="Ví dụ: 2, 5"
                                value={config.fakeWebsiteBlocks || ''}
                                onChange={(e) => updateConfig('fakeWebsiteBlocks', e.target.value)}
                                className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                              />
                              <p className="text-[9.5px] text-white/45 leading-relaxed">
                                Nhập thứ tự của các đoạn phụ đề cách nhau bởi dấu phẩy (ví dụ: <strong className="text-blue-400">2, 5</strong>). Khi trình chiếu trúng các đoạn này, hệ thống sẽ dựng một trang báo tin tức giống hệt thật với đa dạng đoạn văn chi chít chữ và các biểu ngữ quảng cáo sống động xung quanh. Toàn bộ trang báo sẽ bị làm mờ bí ẩn để loại trừ sự phân tâm, giữ lại duy nhất đoạn phụ đề trung tâm hiển thị vô cùng sắc nét và chân thực. Sau đó, một con trỏ chuột mô phỏng sẽ trượt mượt xuống, tự động bôi đen hai từ tâm điểm ở phần giữa hoặc sau của câu!
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 10 ? null : 10)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-xs">10</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Dựng phim "FAKE EDIT VIDEO"</span>
                          <span className="text-[10px] text-white/40">Giao diện một phần mềm edit video chuyên nghiệp với đầy đủ timeline, track tiếng/hình và một con chuột drag-and-drop kéo dãn tiến trình cực kỳ tinh xảo</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 10 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 10 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="space-y-1.5">
                            <label htmlFor="fakeVideoEditorBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                              Danh sách số thứ tự các đoạn xuất hiện
                            </label>
                            <input
                              type="text"
                              id="fakeVideoEditorBlocks"
                              placeholder="Ví dụ: 3, 6"
                              value={config.fakeVideoEditorBlocks || ''}
                              onChange={(e) => updateConfig('fakeVideoEditorBlocks', e.target.value)}
                              className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                            />
                            <p className="text-[9.5px] text-white/45 leading-relaxed">
                              Nhập thứ tự của các đoạn phụ đề cách nhau bởi dấu phẩy (ví dụ: <strong className="text-indigo-400">3, 6</strong>). Khi video chiếu trúng các đoạn này, canvas sẽ chuyển thành giao diện của một ứng dụng biên tập video chuyên dụng (như Adobe Premiere hay CapCut). Ảnh gốc của đoạn phim sẽ nằm trong khung hình Preview trung tâm cùng các vạch sóng âm, vạch thời gian, menu chức năng. Bên dưới là các track âm thanh, clip hình và một track phụ đề màu vàng. Con trỏ chuột mô phỏng sẽ tự động di chuyển đến timeline, nhấp giữ và kéo co dãn block phụ đề để tinh chỉnh độ dài, đồng thời di chuyển mượt mà lên màn hình để chọn bôi đen các từ cực kỳ chân thực, đem lại cảm giác tự nhiên như có người đang ngồi tương tác trực tiếp!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Choice 11: LỊCH NGÀY THÁNG NĂM (Calendar) */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 11 ? null : 11)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs">11</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">LỊCH NGÀY THÁNG NĂM</span>
                          <span className="text-[10px] text-white/40">Tự động vẽ Lịch thiết lập 3D mỗi khi phát hiện ngày tháng năm trong phụ đề</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 11 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 11 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <label htmlFor="enableFakeCalendar" className="text-[11.5px] text-white/95 font-bold cursor-pointer uppercase tracking-wider">
                            Kích hoạt hành vi LỊCH NGÀY THÁNG NĂM
                          </label>
                          <input
                            type="checkbox"
                            id="enableFakeCalendar"
                            checked={!!config.enableFakeCalendar}
                            onChange={(e) => updateConfig('enableFakeCalendar', e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 text-emerald-500 focus:ring-emerald-500/20 bg-black cursor-pointer"
                          />
                        </div>

                        {config.enableFakeCalendar && (
                          <div className="space-y-2 pt-3 border-t border-white/5">
                            <p className="text-[10px] text-white/50 leading-relaxed">
                              Khi kích hoạt lựa chọn này, <strong className="text-emerald-400">bất kỳ đoạn phụ đề nào chứa thông tin ngày tháng năm</strong> (ví dụ: <code className="text-white/80">"June 8-12"</code>, <code className="text-white/80">"15/06"</code>, <code className="text-white/80">"June 1 to June 19"</code>,...) sẽ tự động kích hoạt chế độ Lịch 3D thông minh.
                            </p>
                            <p className="text-[10px] text-white/50 leading-relaxed">
                              Lịch cực kỳ thông minh: tự động phân tích dải ngày trong câu để <strong className="text-emerald-400">bôi đen toàn bộ khoảng ngày</strong>, ngẫu nhiên chọn một trong <strong className="text-emerald-400">10 phong cách thiết kế đặc trưng đầy sắc sảo</strong>, và tự động quyết định giữa hiển thị <strong className="text-emerald-400">Full màn hình hay Thu nhỏ đặt trên mặt bàn</strong> để mang đến hiệu ứng thị giác tuyệt đỉnh sinh động!
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Choice 12: GÕ CẢM ỨNG (Touch Typing) */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 12 ? null : 12)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs">12</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">GIẢ LẬP GÕ CẢM ỨNG IPAD</span>
                          <span className="text-[10px] text-white/40">Giao diện iPad ngang nhắn tin, bàn phím gõ chạm từng phím cực sinh động</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 12 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 12 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="space-y-1.5">
                            <label htmlFor="touchTypingBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                              Danh sách số thứ tự các đoạn xuất hiện
                            </label>
                            <input
                              type="text"
                              id="touchTypingBlocks"
                              placeholder="Ví dụ: 1, 3, 5"
                              value={config.touchTypingBlocks || ''}
                              onChange={(e) => updateConfig('touchTypingBlocks', e.target.value)}
                              className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                            />
                          </div>

                          <div className="pt-3 border-t border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                              <label htmlFor="enableTouchTypingSound" className="text-[10.5px] text-white/70 font-semibold uppercase tracking-wider cursor-pointer">
                                Giả lập âm thanh gõ phím cảm ứng
                              </label>
                              <input
                                type="checkbox"
                                id="enableTouchTypingSound"
                                checked={config.enableTouchTypingSound !== false}
                                onChange={(e) => updateConfig('enableTouchTypingSound', e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-white/10 text-blue-500 focus:ring-purple-500/20 bg-black cursor-pointer"
                              />
                            </div>

                            {config.enableTouchTypingSound !== false && (
                              <div className="space-y-2 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-white/45 font-medium uppercase">Âm lượng gõ phím</span>
                                  <span className="text-[10.5px] text-blue-400 font-mono font-bold">
                                    {config.touchTypingVolume !== undefined ? config.touchTypingVolume : 40}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    step="10"
                                    value={config.touchTypingVolume !== undefined ? config.touchTypingVolume : 40}
                                    onChange={(e) => updateConfig('touchTypingVolume', parseInt(e.target.value))}
                                    className="flex-1 h-1 bg-white/10 rounded appearance-none cursor-pointer accent-blue-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      try {
                                        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                                        if (AudioContextClass) {
                                          const tempCtx = new AudioContextClass();
                                          playTypewriterClick(tempCtx, undefined, config.touchTypingVolume !== undefined ? config.touchTypingVolume : 40);
                                          setTimeout(() => {
                                            tempCtx.close().catch(() => {});
                                          }, 400);
                                        }
                                      } catch (err) {
                                        console.warn("Could not test touch typing click:", err);
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/25 hover:border-blue-500/40 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap active:scale-95 flex items-center gap-1.5"
                                  >
                                    ▶ Thử tiếng gõ
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <p className="text-[10px] text-white/50 leading-relaxed">
                            Khi kích hoạt lựa chọn này, phân đoạn tương ứng sẽ hiển thị dưới dạng một màn hình iPad nhắn tin nằm ngang. Bạn sẽ thấy các tin nhắn trò chuyện màu xám/xanh ở phía trên, và một bàn phím cảm ứng iPad đầy sắc sảo ở phía dưới.
                          </p>
                          <p className="text-[10px] text-white/50 leading-relaxed">
                            Bàn phím sẽ tự động nhận diện và mô phỏng chính xác động tác gõ từng phím khớp với ký tự của phụ đề, có hiệu ứng nhảy chữ, phóng to phím gõ chạm cực kỳ chân thực, kèm âm thanh gõ phím cảm ứng rộn ràng sinh động!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Choice 13: VẼ VÒNG TRÒN BẰNG CHUỘT (Draw Circle Mouse) */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 13 ? null : 13)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10 text-red-400 font-bold text-xs">13</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">CON TRỎ CHUỘT</span>
                          <span className="text-[10px] text-white/40">Con trỏ chuột di chuyển lên ngẫu nhiên, vẽ ký hiệu chỉ điểm tự nhiên</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40">{activeBehaviorAccordion === 13 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 13 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="space-y-1.5">
                            <label htmlFor="drawCircleBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                              Danh sách bài phát vẽ TRÒN ĐỎ có mũi tên riêng
                            </label>
                            <input
                              type="text"
                              id="drawCircleBlocks"
                              placeholder="Ví dụ: 2, 4"
                              value={config.drawCircleBlocks || ''}
                              onChange={(e) => updateConfig('drawCircleBlocks', e.target.value)}
                              className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label htmlFor="drawXBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                              Danh sách bài phát vẽ CHỮ X ĐỎ tự nhiên riêng
                            </label>
                            <input
                              type="text"
                              id="drawXBlocks"
                              placeholder="Ví dụ: 3, 5"
                              value={config.drawXBlocks || ''}
                              onChange={(e) => updateConfig('drawXBlocks', e.target.value)}
                              className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                            />
                          </div>

                          <p className="text-[10px] text-white/50 leading-relaxed">
                            Khi kích hoạt hành vi này, con trỏ chuột mô phỏng sẽ xuất hiện từ góc dưới bên phải màn hình, di chuyển tự nhiên mượt mà đến vị trí bất kỳ trên màn hình (được tự động cách xa các lề canvas).
                          </p>
                          <p className="text-[10px] text-white/50 leading-relaxed">
                            Sau đó, chuột sẽ thao tác phác họa nét vòng tròn đỏ chỉ điểm kèm theo mũi tên, hoặc phác họa chữ X đỏ vô cùng chân thực và sinh động!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Choice 14 -> 11: FAKE BÌNH CHỌN (Fake Poll - NEW) */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 14 ? null : 14)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-xs font-mono">11</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Bình chọn "FAKE POLL"</span>
                          <span className="text-[10px] text-white/40">Giao diện bình chọn cộng đồng tiếng Anh chuyên nghiệp với 10 phong cách tuyệt đẹp</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40 font-mono">{activeBehaviorAccordion === 14 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 14 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="space-y-1.5">
                            <label htmlFor="fakePollBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                              Danh sách số thứ tự các đoạn xuất hiện
                            </label>
                            <input
                              type="text"
                              id="fakePollBlocks"
                              placeholder="Ví dụ: 1, 3 hoặc #2"
                              value={config.fakePollBlocks || ''}
                              onChange={(e) => updateConfig('fakePollBlocks', e.target.value)}
                              className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                            />
                            <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                              💡 Mẹo: Nhập #2 để tự động chọn ngẫu nhiên hành vi bình chọn này xuất hiện đúng 2 lần trong suốt video.
                            </p>
                            <p className="text-[9.5px] text-white/45 leading-relaxed">
                              Trình chiếu sẽ tự động chuyển sang giao diện cuộc bình chọn (Poll) cộng đồng chuẩn tiếng Anh. Phụ đề thuyết minh chính sẽ biến thành 1 trong 4 phương án lựa chọn (có font chữ cực lớn, rõ nét), con trỏ chuột sẽ di chuyển đến bôi đen ngẫu nhiên 2 từ sau đó nhấp chọn bình chọn chính xác phương án đó. Biểu đồ phần trăm phiếu bầu sẽ liên tục tăng và dao động chuyển động vô cùng chân thực!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Choice 15 -> 12: SCREENSHOT COMMENT */}
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
                    <button
                      type="button"
                      onClick={() => setActiveBehaviorAccordion(activeBehaviorAccordion === 15 ? null : 15)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">12</span>
                        <div>
                          <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Chụp màn hình Comment "SCREENSHOT COMMENT"</span>
                          <span className="text-[10px] text-white/40">Giả lập chụp comment ấn tượng từ MXH tiếng Anh với nút bấm chuyên nghiệp, thả tim ghim hoặc bôi đen chữ</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40 font-mono">{activeBehaviorAccordion === 15 ? '▲' : '▼'}</span>
                    </button>

                    {activeBehaviorAccordion === 15 && (
                      <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="space-y-1.5">
                            <label htmlFor="screenshotCommentBlocks_modal" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                              Danh sách số thứ tự các đoạn xuất hiện
                            </label>
                            <input
                              type="text"
                              id="screenshotCommentBlocks_modal"
                              placeholder="Ví dụ: 2, 4 hoặc #3"
                              value={config.screenshotCommentBlocks || ''}
                              onChange={(e) => updateConfig('screenshotCommentBlocks', e.target.value)}
                              className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                            />
                            <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                              💡 Mẹo: Nhập #3 để tự động chọn ngẫu nhiên hành vi chụp ảnh comment này xuất hiện đúng 3 lần trong suốt video.
                            </p>
                            <p className="text-[9.5px] text-white/45 leading-relaxed">
                              Chương trình sẽ tự động đưa ra một hộp thoại comment chụp màn hình mạng xã hội tiếng Anh (bóng mờ ảo 4 phía cực kỳ sâu nét) tại vị trí ngẫu nhiên không tràn màn hình. Nội dung bình luận chính là phụ đề của đoạn đó.
                            </p>
                            <p className="text-[9.5px] text-white/45 leading-relaxed">
                              💡 <strong>Hành vi tương tác chi tiết:</strong> Hệ thống chia đều thành 20 phong cách (phát ngẫu nhiên):
                              <br />- <strong>10 phong cách đầu (1-10):</strong> Con trỏ chuột xuất hiện di chuyển đến nút Like để nhân đôi lượt tương tác, sau đó hover bấm nút Ghim (Pin) comment.
                              <br />- <strong>10 phong cách tiếp theo (11-20):</strong> Con trỏ chuột xuất hiện bôi đen từng chữ một trong đoạn phụ đề từ đầu đến cuối một cách mượt mà chân thực.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                </div>

              </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#131317] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all text-white font-bold text-xs"
          >
            Đồng ý cấu hình
          </button>
        </div>

      </div>

      {popupEditingEffect && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#181a1d] border border-white/10 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#24292d]">
              <div className="flex items-center gap-2">
                <Sparkles className="text-blue-400 animate-pulse" size={16} />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Studio thiết kế: <span className="text-blue-400 font-extrabold normal-case font-mono">{popupEditingEffect.name} ({popupEditingEffect.group || 'A'})</span>
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setPopupEditingEffect(null)}
                className="text-white/45 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-1.5 rounded-lg active:scale-95 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content body Widescreen Dual Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden flex-1 leading-normal">
              
              {/* LEFT COLUMN: LIVE STUDIO PREVIEW & CHARACTER OVERRIDES */}
              <div className="lg:col-span-6 p-5 border-r border-white/5 overflow-y-auto space-y-4 flex flex-col bg-[#202528]">
                
                {/* 16:9 Canvas Simulator Preview Card */}
                <div className="space-y-2">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">Trình giả lập kết quả (Standard 16:9 Canvas)</span>
                  <div className="relative aspect-video w-full bg-[#030303] rounded-xl overflow-hidden border border-white/10 group flex flex-col justify-between shadow-2xl">
                    <canvas id="popup-preview-canvas" width="600" height="338" className="absolute inset-0 w-full h-full object-cover" />
                    
                    {/* Time progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-sky-400" 
                        style={{ width: `${(simPopupTime / 3.0) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Subtitle simulation players */}
                <div className="bg-[#131518] p-3 rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSimPopupPlaying(!simPopupPlaying)}
                        className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          simPopupPlaying ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        {simPopupPlaying ? (
                          <>
                            <Pause size={12} /> <span>Tạm dừng</span>
                          </>
                        ) : (
                          <>
                            <Play size={12} /> <span>Chạy hoạt ảnh</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimPopupTime(0)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                        title="Chạy lại từ đầu"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </div>

                    <div className="text-[10px] text-white/40 font-mono">
                      Thời gian: <span className="text-blue-400 font-bold">{simPopupTime.toFixed(2)}s</span> / 3.00s
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9.5px] text-white/50 block font-semibold uppercase tracking-wide">Nhập văn bản hiển thị thử nghiệm:</label>
                    <input
                      type="text"
                      value={simPopupText}
                      onChange={(e) => setSimPopupText(e.target.value)}
                      placeholder="Gõ đoạn phụ đề để kiểm tra cách bôi chữ..."
                      className="w-full text-[11px] bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-white/90 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Character overrides section */}
                <div className="bg-[#0f0f18] p-4 rounded-xl border border-white/5 space-y-4">
                  <span className="text-[11px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-400 block uppercase tracking-wider border-b border-white/5 pb-1.5">Cấu hình Ghi đè Font & Màu sắc chuyên biệt</span>

                  {/* Font Family selection */}
                  <div>
                    <label className="text-[10.5px] text-white/50 block mb-1 font-semibold">1. Kiểu chữ mẫu thiết kế (Font Family):</label>
                    <select
                      value={popupEditingEffect.fontFamily || ''}
                      onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, fontFamily: e.target.value || undefined }))}
                      className="w-full text-xs bg-[#030303] border border-white/10 rounded-lg px-2.5 py-1.5 text-white/90 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                    >
                      <option value="">-- Mặc định (Lấy từ Preset Phong Cách #1) --</option>
                      {SUBTITLE_FONTS.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>

                  {/* Font Size override */}
                  <div>
                    <div className="flex justify-between text-[10.5px] text-white/50 mb-1">
                      <span className="font-semibold">2. Cỡ chữ riêng biệt (Size):</span>
                      <span className="font-mono text-blue-400 font-bold">
                        {popupEditingEffect.fontSize !== undefined ? `${popupEditingEffect.fontSize}px` : 'Kế thừa từ phong cách #1'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={popupEditingEffect.fontSize !== undefined}
                        onChange={(e) => setPopupEditingEffect((prev: any) => ({
                          ...prev,
                          fontSize: e.target.checked ? 40 : undefined
                        }))}
                        className="w-3.5 h-3.5 accent-blue-500 rounded cursor-pointer"
                        title="Tự định cấu cỡ chữ"
                      />
                      <input
                        type="range"
                        min="15"
                        max="120"
                        disabled={popupEditingEffect.fontSize === undefined}
                        value={popupEditingEffect.fontSize !== undefined ? popupEditingEffect.fontSize : 40}
                        onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                        className="flex-1 accent-blue-500 bg-[#030303] h-1 rounded cursor-pointer disabled:opacity-30"
                      />
                    </div>
                  </div>

                  {/* Colors Override block */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <span className="text-[10.5px] text-white/50 block mb-1 font-semibold">Màu chữ gốc (TextColor):</span>
                      <div className="flex items-center gap-2 bg-[#030303] p-1.5 border border-white/10 rounded-lg h-[36px]">
                        <input
                          type="checkbox"
                          checked={popupEditingEffect.color !== undefined}
                          onChange={(e) => setPopupEditingEffect((prev: any) => ({
                            ...prev,
                            color: e.target.checked ? '#FFFFFF' : undefined
                          }))}
                          className="w-3.5 h-3.5 accent-blue-500 rounded cursor-pointer"
                        />
                        <input
                          type="color"
                          disabled={popupEditingEffect.color === undefined}
                          value={popupEditingEffect.color || '#FFFFFF'}
                          onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, color: e.target.value }))}
                          className="w-6 h-6 rounded border border-white/10 bg-transparent cursor-pointer disabled:opacity-30"
                        />
                        <span className="text-[9.5px] font-mono text-white/70 truncate">
                          {popupEditingEffect.color ? popupEditingEffect.color.toUpperCase() : 'Mặc định'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10.5px] text-white/50 block mb-1 font-semibold font-mono">Bôi màu Highlight (Yên vị vàng):</span>
                      <div className="flex items-center gap-2 bg-[#030303] p-1.5 border border-white/10 rounded-lg h-[36px]">
                        <input
                          type="color"
                          value={popupEditingEffect.subtitleHighlightColor || '#EAB308'}
                          onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, subtitleHighlightColor: e.target.value }))}
                          className="w-6 h-6 rounded border border-white/10 bg-transparent cursor-pointer"
                        />
                        <span className="text-[9.5px] font-mono text-white/70">
                          {(popupEditingEffect.subtitleHighlightColor || '#EAB308').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Shadow Border outline override */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <span className="text-[10.5px] text-white/50 block mb-1 font-semibold">Màu viền chữ phụ đề:</span>
                      <div className="flex items-center gap-2 bg-[#030303] p-1.5 border border-white/10 rounded-lg h-[36px]">
                        <input
                          type="checkbox"
                          checked={popupEditingEffect.outlineColor !== undefined}
                          onChange={(e) => setPopupEditingEffect((prev: any) => ({
                            ...prev,
                            outlineColor: e.target.checked ? '#000000' : undefined
                          }))}
                          className="w-3.5 h-3.5 accent-blue-500 rounded cursor-pointer"
                        />
                        <input
                          type="color"
                          disabled={popupEditingEffect.outlineColor === undefined}
                          value={popupEditingEffect.outlineColor || '#000000'}
                          onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, outlineColor: e.target.value }))}
                          className="w-6 h-6 rounded border border-white/10 bg-transparent cursor-pointer disabled:opacity-30"
                        />
                        <span className="text-[9.5px] font-mono text-white/70 truncate">
                          {popupEditingEffect.outlineColor ? popupEditingEffect.outlineColor.toUpperCase() : 'Mặc định'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10.5px] text-white/50 mb-1">
                        <span className="font-semibold">Độ rộng nét viền:</span>
                        <span className="font-mono text-blue-400 font-bold">
                          {popupEditingEffect.outlineWidth !== undefined ? `${popupEditingEffect.outlineWidth}px` : 'Mặc định'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={popupEditingEffect.outlineWidth !== undefined}
                          onChange={(e) => setPopupEditingEffect((prev: any) => ({
                            ...prev,
                            outlineWidth: e.target.checked ? 1.5 : undefined
                          }))}
                          className="w-3.5 h-3.5 accent-blue-500 rounded cursor-pointer"
                        />
                        <input
                          type="range"
                          min="0.5"
                          max="8"
                          step="0.5"
                          disabled={popupEditingEffect.outlineWidth === undefined}
                          value={popupEditingEffect.outlineWidth !== undefined ? popupEditingEffect.outlineWidth : 1.5}
                          onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, outlineWidth: parseFloat(e.target.value) }))}
                          className="flex-1 accent-blue-500 bg-[#030303] h-1 rounded cursor-pointer disabled:opacity-30"
                        />
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* RIGHT COLUMN: CORE SETTINGS (ANIMATIONS, POSITIONS, BLURS) */}
              <div className="lg:col-span-6 p-5 overflow-y-auto space-y-4 flex flex-col bg-[#0b0b14]">
                
                {/* Meta details */}
                <div className="bg-[#12121f] rounded-xl border border-white/5 p-4 space-y-4">
                  <span className="text-[11px] font-bold text-blue-400 block uppercase tracking-wider">Thông Tin Định Danh</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-white/50 block mb-1 font-bold uppercase tracking-wider">Tên nhãn thiết kế:</label>
                      <input
                        type="text"
                        value={popupEditingEffect.name}
                        onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, name: e.target.value }))}
                        className="w-full text-xs bg-[#030303] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/50 block mb-1 font-bold uppercase tracking-wider">Mẫu Nhóm Chữ (A,B,C,D):</label>
                      <select
                        value={popupEditingEffect.group || 'A'}
                        onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, group: e.target.value }))}
                        className="w-full text-xs bg-[#030303] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                      >
                        <option value="A">MẪU CHỮ A (Dưới, bounce)</option>
                        <option value="B">MẪU CHỮ B (Cận trên, cinematic)</option>
                        <option value="C">MẪU CHỮ C (Chính giữa, sương mờ)</option>
                        <option value="D">MẪU CHỮ D (Gõ đập cơ đặc biệt)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Transitions animations */}
                <div className="bg-[#12121f]/50 border border-white/10 rounded-xl p-4 space-y-3.5">
                  <span className="text-[11px] font-bold text-sky-400 block uppercase tracking-wider">Quy luật Chuyển Động Chữ</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-white/50 block mb-1 font-bold uppercase tracking-wide">Hiệu ứng vào (Entrance):</label>
                      <select
                        value={popupEditingEffect.subtitleEffectIn || 'zoom_fade'}
                        onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, subtitleEffectIn: e.target.value }))}
                        className="w-full text-xs bg-[#030303] border border-white/10 rounded-lg px-2.5 py-1.5 text-white/90 focus:outline-none focus:border-blue-500"
                      >
                        <option value="zoom_fade">Thu phóng mờ dần (Zoom & Fade)</option>
                        <option value="bounce">Đàn hồi nảy nổ (Elastic Bounce)</option>
                        <option value="bounce_in">Nảy bóng bật (Bounce In)</option>
                        <option value="slide_up">Trượt từ dưới lên (Slide Up)</option>
                        <option value="slide_down">Trượt từ trên xuống (Slide Down)</option>
                        <option value="slide_left">Trượt từ góc phải qua (Slide Left)</option>
                        <option value="slide_right">Trượt từ góc trái qua (Slide Right)</option>
                        <option value="zoom_in">Bùng phát từ tâm điểm (Zoom In)</option>
                        <option value="zoom_out">Thu nhỏ từ kích thước cực đại (Zoom Out)</option>
                        <option value="fade_in">Smooth xuất hiện mờ (Fade In)</option>
                        <option value="none">Hiện ngay tức khắc (None)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-white/50 block mb-1 font-bold uppercase tracking-wide">Hiệu ứng ra (Exit):</label>
                      <select
                        value={popupEditingEffect.subtitleEffectOut || 'fade'}
                        onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, subtitleEffectOut: e.target.value }))}
                        className="w-full text-xs bg-[#030303] border border-white/10 rounded-lg px-2.5 py-1.5 text-white/90 focus:outline-none focus:border-blue-500"
                      >
                        <option value="fade">Mờ dần biến hẳn (Smooth Fade Out)</option>
                        <option value="slide_down">Trượt rơi xuống dưới (Slide Down)</option>
                        <option value="slide_up">Bay vọt lên trời cao (Slide Up Out)</option>
                        <option value="slide_left">Lướt bay dạt sang trái (Slide Left Out)</option>
                        <option value="slide_right">Lướt bay dạt sang phải (Slide Right Out)</option>
                        <option value="zoom_out">Thu nhỏ biến hẳn (Zoom Out)</option>
                        <option value="none">Ẩn ngay tức khắc (None)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-sky-400 block mb-1 font-bold uppercase tracking-wider">Hiệu ứng chữ sống động (Active Show Effect):</label>
                    <select
                      value={popupEditingEffect.subtitleShowEffect || 'none'}
                      onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, subtitleShowEffect: e.target.value }))}
                      className="w-full text-xs bg-[#030303] border border-white/10 rounded-lg px-2.5 py-1.5 text-white/90 focus:outline-none focus:border-sky-500"
                    >
                      <option value="none">✨ Không có (Chữ tĩnh đứng yên)</option>
                      <option value="highlight_two_words">🖊️ Bôi vàng ngẫu nhiên 2 chữ dứt khoát</option>
                      <option value="tiktok_glow">🎵 Rung Neon Glow TikTok</option>
                      <option value="pulse_grow">💓 Nhịp thở phập phồng (Pulse)</option>
                      <option value="bounce_loop">🎈 Bay bổng dập dềnh liên tục (Bounce)</option>
                      <option value="flicker_warm">🕯️ Ánh nến ấm lung linh nhấp nháy</option>
                      <option value="slide_up_down">↕️ Trượt lên xuống nhẹ nhàng</option>
                      <option value="slide_left_right">↔️ Trượt trái phải đu đưa</option>
                      <option value="wave_text">🌊 Sóng lượn tròng trành</option>
                      <option value="shake_vibe">⚡ Rung lắc giật hành động mạnh</option>
                    </select>
                  </div>
                </div>

                {/* Subtitle Positioning coordinates */}
                <div className="bg-[#12121f]/50 border border-white/10 rounded-xl p-4 space-y-4">
                  <span className="text-[11px] font-bold text-blue-400 block uppercase tracking-wider">Tọa độ Vị trí & Căn lề chữ</span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-[10px] text-white/50 mb-1">
                        <span>Vị trí Ngang chữ (X):</span>
                        <span className="font-mono text-blue-400 font-bold">{popupEditingEffect.subtitleX !== undefined ? popupEditingEffect.subtitleX : 50}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={popupEditingEffect.subtitleX !== undefined ? popupEditingEffect.subtitleX : 50}
                        onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, subtitleX: parseInt(e.target.value) }))}
                        className="w-full accent-blue-500 bg-[#030303] h-1 rounded cursor-pointer"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-[10px] text-white/50 mb-1">
                        <span>Vị trí Dọc chữ (Y):</span>
                        <span className="font-mono text-blue-400 font-bold">{popupEditingEffect.subtitleY !== undefined ? popupEditingEffect.subtitleY : 85}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={popupEditingEffect.subtitleY !== undefined ? popupEditingEffect.subtitleY : 85}
                        onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, subtitleY: parseInt(e.target.value) }))}
                        className="w-full accent-blue-500 bg-[#030303] h-1 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-white/50 block mb-2 font-semibold">Căn biên nội dung:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'left', name: 'Trái' },
                        { id: 'center', name: 'Giữa' },
                        { id: 'right', name: 'Phải' },
                        { id: 'justify', name: 'Căn đều' }
                      ].map((item) => {
                        const active = (popupEditingEffect.subtitleAlign || 'center') === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPopupEditingEffect((prev: any) => ({ ...prev, subtitleAlign: item.id }))}
                            className={`py-1 rounded-lg border text-[10px] font-black transition-all ${
                              active
                                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                : 'bg-[#030303] border-white/5 text-white/60 hover:text-white'
                            }`}
                          >
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Independent background blurs */}
                <div className="bg-[#12121f]/50 border border-white/10 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-sky-400 block uppercase tracking-wider">Độc lập Nền Mờ (Blur Glass)</span>
                      <p className="text-[9px] text-white/40">Dải mờ độc lập tương tác tự do</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPopupEditingEffect((prev: any) => ({ ...prev, enableBlurBg: !prev.enableBlurBg }))}
                      className="text-white hover:text-sky-400 transition-colors cursor-pointer"
                    >
                      {popupEditingEffect.enableBlurBg ? (
                        <ToggleRight size={28} className="text-sky-500" />
                      ) : (
                        <ToggleLeft size={28} className="text-white/20" />
                      )}
                    </button>
                  </div>

                  {popupEditingEffect.enableBlurBg && (
                    <div className="space-y-4 animate-in slide-in-from-top duration-200">
                      
                      {/* Lock text in blur */}
                      <div className="flex items-center justify-between bg-sky-500/5 border border-sky-500/10 rounded-xl p-2.5">
                        <div className="text-left flex-1">
                          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide block">Gắn chữ bám trong dải mờ</span>
                          <span className="text-[8px] text-white/50 block mt-0.5">Tọa độ chữ tự động khớp bám theo tâm dải mờ hoàn hảo</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!popupEditingEffect.lockTextInBlur}
                          onChange={(e) => setPopupEditingEffect((prev: any) => {
                            const nextLock = e.target.checked;
                            if (nextLock) {
                              return {
                                ...prev,
                                lockTextInBlur: nextLock,
                                subtitleX: prev.blurBgX !== undefined ? prev.blurBgX : 50,
                                subtitleY: prev.blurBgY !== undefined ? prev.blurBgY : 85
                              };
                            }
                            return { ...prev, lockTextInBlur: nextLock };
                          })}
                          className="accent-sky-500 w-4 h-4 rounded cursor-pointer"
                        />
                      </div>

                      {/* Positions of blur */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-[10px] text-white/50 mb-1">
                            <span>Vị trí ngang mờ (X):</span>
                            <span className="font-mono text-sky-400 font-bold">{popupEditingEffect.blurBgX !== undefined ? popupEditingEffect.blurBgX : (popupEditingEffect.subtitleX || 50)}%</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="95"
                            value={popupEditingEffect.blurBgX !== undefined ? popupEditingEffect.blurBgX : (popupEditingEffect.subtitleX || 50)}
                            onChange={(e) => setPopupEditingEffect((prev: any) => {
                              const val = parseInt(e.target.value);
                              if (prev.lockTextInBlur) {
                                return { ...prev, blurBgX: val, subtitleX: val };
                              }
                              return { ...prev, blurBgX: val };
                            })}
                            className="w-full accent-sky-500 bg-[#030303] h-1 rounded cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] text-white/50 mb-1">
                            <span>Vị trí dọc mờ (Y):</span>
                            <span className="font-mono text-sky-400 font-bold">{popupEditingEffect.blurBgY !== undefined ? popupEditingEffect.blurBgY : (popupEditingEffect.subtitleY || 85)}%</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="95"
                            value={popupEditingEffect.blurBgY !== undefined ? popupEditingEffect.blurBgY : (popupEditingEffect.subtitleY || 85)}
                            onChange={(e) => setPopupEditingEffect((prev: any) => {
                              const val = parseInt(e.target.value);
                              if (prev.lockTextInBlur) {
                                return { ...prev, blurBgY: val, subtitleY: val };
                              }
                              return { ...prev, blurBgY: val };
                            })}
                            className="w-full accent-sky-500 bg-[#030303] h-1 rounded cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Sizes of blur */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-[10px] text-white/50 mb-1">
                            <span>Chiều cao mờ:</span>
                            <span className="font-mono text-sky-400 font-bold">{popupEditingEffect.blurBgHeight || 285}px</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="1080"
                            value={popupEditingEffect.blurBgHeight || 285}
                            onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, blurBgHeight: parseInt(e.target.value) }))}
                            className="w-full accent-sky-500 bg-[#030303] h-1 rounded cursor-pointer"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-white/50 mb-1">
                            <span>Chiều rộng ngang (%):</span>
                            <span className="font-mono text-sky-400 font-bold">{popupEditingEffect.blurBgWidth || 100}%</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="150"
                            value={popupEditingEffect.blurBgWidth || 100}
                            onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, blurBgWidth: parseInt(e.target.value) }))}
                            className="w-full accent-sky-500 bg-[#030303] h-1 rounded cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Aesthetic details shape/color */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 border-t border-white/5 pt-3">
                        <div>
                          <label className="text-[10px] text-white/50 block mb-1 font-semibold">Hình dáng dải mờ (Shape):</label>
                          <select
                            value={popupEditingEffect.blurBgShape || 'rectangle'}
                            onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, blurBgShape: e.target.value }))}
                            className="w-full text-xs bg-[#030303] border border-white/10 rounded-lg px-2 py-1.5 text-white/95 focus:outline-none focus:border-sky-500"
                          >
                            <option value="rectangle font-medium">Chữ nhật vuông</option>
                            <option value="rounded">Góc tròn dẻo (Rounded)</option>
                            <option value="pill">Khung hạt đậu (Pill)</option>
                            <option value="circle">Hình tròn (Circle)</option>
                          </select>
                        </div>

                        <div>
                          <span className="text-[10px] text-white/50 block mb-1 font-semibold">Màu sắc nền mờ:</span>
                          <div className="flex items-center gap-2 bg-[#030303] p-1 border border-white/10 rounded-lg h-[34px]">
                            <input
                              type="color"
                              value={popupEditingEffect.blurBgColorHex || '#000000'}
                              onChange={(e) => setPopupEditingEffect((prev: any) => ({ ...prev, blurBgColorHex: e.target.value }))}
                              className="w-6 h-6 rounded border border-white/10 bg-transparent cursor-pointer"
                            />
                            <span className="text-[9.5px] font-mono text-white/80 shrink-0">{(popupEditingEffect.blurBgColorHex || '#000000').toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

              </div>
              
            </div>

            {/* Footer Workspace Action Buttons */}
            <div className="p-4 border-t border-white/5 bg-[#12121e] flex items-center justify-between gap-3 font-semibold [z-index:100]">
              <div className="text-[10.5px] text-white/35 font-medium hidden sm:block">
                * Toàn bộ cài đặt được lưu trực tiếp vào ổ nhớ của nhóm, cho phép tái sử dụng mãi mãi!
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setPopupEditingEffect(null)}
                  className="px-4 py-2 border border-white/10 hover:border-white/20 hover:bg-white/5 rounded-lg text-xs font-bold text-white/70 hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setSavedEffects((prev: any[]) => prev.map(p => p.id === popupEditingEffect.id ? popupEditingEffect : p));
                    setPopupEditingEffect(null);
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-200 font-bold text-xs rounded-lg transition-all active:scale-95 border border-white/5 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={12} /> Chỉ thiết lập lại thiết kế
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Update design across local memory
                    setSavedEffects((prev: any[]) => prev.map(p => p.id === popupEditingEffect.id ? popupEditingEffect : p));
                    const eff = popupEditingEffect;
                    
                    // Direct overrides applied on the active rendering frame immediately
                    updateConfig('subtitleX', eff.subtitleX);
                    updateConfig('subtitleY', eff.subtitleY);
                    if (eff.subtitleAlign !== undefined) {
                      updateConfig('subtitleAlign', eff.subtitleAlign as any);
                    }
                    updateConfig('subtitleEffectIn', eff.subtitleEffectIn as any);
                    updateConfig('subtitleEffectOut', eff.subtitleEffectOut as any);
                    updateConfig('enableBlurBg', !!eff.enableBlurBg);
                    updateConfig('blurBgHeight', eff.blurBgHeight);
                    updateConfig('blurBgWidth', eff.blurBgWidth);
                    updateConfig('blurBgOpacity', eff.blurBgOpacity);
                    updateConfig('blurBgInOutEffect', eff.blurBgInOutEffect as any);
                    updateConfig('lockTextInBlur', !!eff.lockTextInBlur);
                    
                    if (eff.blurBgX !== undefined) updateConfig('blurBgX', eff.blurBgX);
                    if (eff.blurBgY !== undefined) updateConfig('blurBgY', eff.blurBgY);
                    if (eff.blurBgShape !== undefined) updateConfig('blurBgShape', eff.blurBgShape as any);
                    if (eff.blurBgColorHex !== undefined) updateConfig('blurBgColorHex', eff.blurBgColorHex);
                    if (eff.blurBgBorderColorHex !== undefined) updateConfig('blurBgBorderColorHex', eff.blurBgBorderColorHex);
                    if (eff.blurBgBlurAmount !== undefined) updateConfig('blurBgBlurAmount', eff.blurBgBlurAmount);
                    
                    setPopupEditingEffect(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-555 text-white font-extrabold text-xs rounded-lg shadow-lg shadow-blue-900/25 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={12} /> Áp dụng & Quay ra Ngoài
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
