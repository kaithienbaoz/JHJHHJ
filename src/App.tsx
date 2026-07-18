/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component } from 'react';
import { SubtitleBlock, CharacterImage, RenderConfig, DictionaryRule, SubtitlePreset } from './types';
import AudioLoader from './components/AudioLoader';
import SrtLoader from './components/SrtLoader';
import SubtitleMatcher from './components/SubtitleMatcher';
import VideoPreviewSection from './components/VideoPreviewSection';
import VideoExporter from './components/VideoExporter';
import SettingsModal from './components/SettingsModal';
import KhoAnhModal from './components/KhoAnhModal';
import MissingCharacterImagesModal from './components/MissingCharacterImagesModal';
import { 
  getAllImagesFromDB, 
  saveImagesToDB, 
  clearAllImagesFromDB, 
  deleteImageFromDB,
  saveBgMusicToDB,
  getAllBgMusicFromDB,
  saveConfigFileToDB,
  getConfigFileFromDB,
  deleteConfigFileFromDB
} from './utils/indexedDB';
import { safeLocalStorage } from './utils/safeLocalStorage';
import { 
  Sparkles, 
  Film, 
  ArrowRight, 
  Settings, 
  Info,
  Cpu,
  FolderLock,
  RefreshCw
} from 'lucide-react';

// List of common English and Vietnamese stop words to ignore when extracting keywords, highlighting, and matching
const STOP_WORDS = new Set([
  'at', 'of', 'and', 'the', 'with', 'or', 'in', 'to', 'on', 'by', 'for', 'an', 'is', 'it', 'about', 'from', 'as', 
  'this', 'that', 'these', 'those', 'then', 'here', 'there', 'who', 'whom', 'where', 'when', 'why', 'how', 'which',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'not', 'no', 'yes', 'so', 'if', 'your',
  'my', 'their', 'our', 'his', 'her', 'its', 'me', 'you', 'he', 'she', 'they', 'we', 'us', 'him', 'them',
  'cua', 'va', 'trong', 'cho', 'nhu', 'nhung', 'co', 'nay', 'do', 'kia', 'của', 'và', 'trong', 'cho', 'như', 'những', 'có', 'này', 'đó', 'kia',
  'a', 'an', 'gh', 'thì', 'là', 'mà', 'gì', 'nào', 'với', 'về', 'để', 'cũng', 'đã', 'đang', 'sẽ', 'được', 'từ', 'qua', 'bởi', 'tại', 'ra', 'vào', 'lên', 'xuống', 'lại', 'thêm'
]);

/**
 * Splits subtitle text into contiguous word chunks such that each chunk's length
 * is under maxChars and word counts are as balanced/equal as possible.
 */
function splitTextIntoBalancedChunks(text: string, maxChars: number): string[] {
  if (!text || text.length <= maxChars || maxChars <= 0) {
    return [text];
  }

  const words = text.trim().split(/\s+/);
  if (words.length <= 1) {
    return [text];
  }

  const totalLength = text.length;
  let estimatedN = Math.ceil(totalLength / maxChars);
  if (estimatedN < 2) estimatedN = 2;

  for (let n = estimatedN; n <= words.length; n++) {
    const chunks: string[][] = Array.from({ length: n }, () => []);
    let wordIndex = 0;
    let ok = true;
    for (let i = 0; i < n; i++) {
      const count = Math.floor(words.length / n) + (i < words.length % n ? 1 : 0);
      const chunkWords = words.slice(wordIndex, wordIndex + count);
      const chunkText = chunkWords.join(' ');
      if (chunkText.length > maxChars && n < words.length) {
        ok = false;
        break;
      }
      chunks[i] = chunkWords;
      wordIndex += count;
    }

    if (ok) {
      return chunks.map(c => c.join(' ')).filter(Boolean);
    }
  }

  const result: string[] = [];
  let currentWords: string[] = [];
  for (const word of words) {
    const candidate = [...currentWords, word].join(' ');
    if (candidate.length <= maxChars) {
      currentWords.push(word);
    } else {
      if (currentWords.length > 0) {
        result.push(currentWords.join(' '));
        currentWords = [word];
      } else {
        result.push(word);
        currentWords = [];
      }
    }
  }
  if (currentWords.length > 0) {
    result.push(currentWords.join(' '));
  }
  return result;
}

const DEFAULT_PRESETS: SubtitlePreset[] = [
  {
    id: 'preset_1',
    name: 'Phong cách #1',
    fontFamily: 'Josefin Sans',
    fontSize: 40,
    color: '#FFFFFF',
    outlineColor: '#000000',
    outlineWidth: 1.5,
    bgColor: '#000000',
    bgOpacity: 0.0,
    position: 'bottom-center',
    effect: 'cinematic',
    subtitleHighlightMode: 'random_pair',
    subtitleHighlightColor: '#EAB308',
    presetY: 85,
    enableTextHighlight: true,
    subtitleShowEffect: 'none'
  }
];

import { DEFAULT_STICKER_GROUPS, populateDefaultStickers } from './utils/stickerGenerator';

const DEFAULT_CONFIG: RenderConfig = {
  width: 1280,
  height: 720,
  fps: 30,
  transitionDuration: 0.5,
  transitionType: 'random_all',
  enableKenBurns: true,
  imageEffect: 'random',
  subtitleOffset: 15,
  subtitleFontSize: 40,
  subtitleColor: '#FFFFFF',
  subtitleOutlineColor: '#000000',
  subtitleOutlineWidth: 1.5,
  subtitleBgColor: '#000000',
  subtitleBgOpacity: 0.0,
  enableDynamicSubstyling: false,
  activePresetId: '',
  activeEffectGroup: '',
  singleKeywordMode: 'no_split',
  dividerStyle: 'none',
  bgEffect: 'lightning',
  bgEffectInterval: 10,
  bgEffectConsecutive: 1,
  
  // Custom drag positioning & animations
  subtitleX: 50,
  subtitleY: 85,
  subtitleAlign: 'center',
  subtitleEffectIn: 'zoom_fade',
  subtitleEffectOut: 'fade',
  subtitleShowEffect: 'none',
  
  // Custom translucent blur background defaults
  enableBlurBg: true,
  blurBgHeight: 285,
  blurBgWidth: 100,
  blurBgOpacity: 0.5,
  blurBgInOutEffect: 'bottom-to-top',
  blurBgX: 50,
  blurBgY: 85,
  blurBgShape: 'rectangle',
  blurBgColorHex: '#000000',
  blurBgBlurAmount: 18,
  lockTextInBlur: true,
  
  // Intro properties
  introDuration: 0,
  introTitle: 'GIỚI THIỆU VIDEO',
  introSubtitle: 'Sắp xếp nội dung hình ảnh khớp phụ đề tự động',
  introBgColor: '#09090B',
  introTextColor: '#3B82F6',
  introImageId: 'none',
  
  // Outro properties
  outroDuration: 0,
  outroTitle: 'CẢM ƠN ĐÃ THEO DÕI',
  outroSubtitle: 'Được tạo bởi NOT VIDEO V-Sync Engine NGUYỄN THÀNH NHÂN',
  outroBgColor: '#09090B',
  outroTextColor: '#10B981',
  outroImageId: 'none',

  // Brand Logo default values
  logoUrl: undefined,
  logoX: 85,
  logoY: 15,
  logoSize: 80,
  logoOpacity: 0.9,

  // Subtitle Highlight Settings
  subtitleHighlightMode: 'random_pair',
  subtitleHighlightColor: '#EAB308',
  enableTextHighlight: false,
  enableHighlightContrastText: true,
  subtitleHighlightBgColor: '#EAB308',
  syncHighlightTextColor: true,

  // Substyle phase alternation controls default values
  substyleSwitchMin: 2,
  substyleSwitchMax: 4,
  primaryRenderMode: 'alternate',

  // Audio volume controls
  mainAudioVolume: 200,
  typewriterVolume: 30,

  // Human-like Behavior default controls
  enableHumanArrow: true,
  humanArrowBlocks: '#3',
  enableHumanTypewriter: true,
  humanTypewriterBlocks: '#3',
  humanTypewriterColor: '#000000',
  humanTypewriterOpacity: 85,
  enableHumanStickers: true,
  humanStickerGroups: populateDefaultStickers(DEFAULT_STICKER_GROUPS),
  enableHighlightDate: true,
  highlightDateFontFamily: 'Josefin Sans',
  highlightDateColor: '#FFFFFF',
  highlightDateBgColor: '#EAB308',
  highlightDateBgOpacity: 85,
  highlightTextModeDate: false,
  highlightTextModeCaps: true,
  highlightTextFontSize: 150,
  testHighlightText: false,
  enableFakeWebsite: true,
  fakeWebsiteBlocks: '#3',
  enableFakeVideoEditor: true,
  fakeVideoEditorBlocks: '#3',
  enableDrawCircle: true,
  drawCircleBlocks: '#3',
  drawXBlocks: '#3',
  mouseDrawType: 'circle',
  enableFakeCalendar: true,
  enableTouchTyping: true,
  touchTypingBlocks: '#3',
  enableTouchTypingSound: true,
  touchTypingVolume: 40,
  enableFakePoll: true,
  fakePollBlocks: '#3',
  screenshotCommentBlocks: '#3',
  enableFakeNews: true,
  fakeNewsBlocks: '#3',
  enableFakeNewsPaper: true,
  fakeNewsPaperBlocks: '#3',
  enableHandWrite: true,
  handWriteBlocks: '#3',
  enableFakeComment: true,
  fakeCommentBlocks: '#3',
  enableBackgroundNoise: true,
  backgroundNoises: [
    { id: 'dog_bark', name: '🐶 Tiếng chó sủa', segments: '#3', volume: 50 },
    { id: 'door_close', name: '🚪 Tiếng đóng cửa', segments: '#3', volume: 50 },
    { id: 'wind', name: '💨 Tiếng gió rít', segments: '#3', volume: 50 },
    { id: 'car_horn', name: '🚗 Tiếng còi xe', segments: '#3', volume: 50 },
    { id: 'people_talk', name: '🗣️ Tiếng người nói', segments: '#3', volume: 50 },
    { id: 'mouse_click', name: '🖱️ Tiếng click chuột', segments: '#3', volume: 50 },
    { id: 'keyboard', name: '⌨️ Tiếng gõ phím', segments: '#3', volume: 50 },
    { id: 'page_turn', name: '📄 Tiếng lật trang giấy', segments: '#3', volume: 50 },
    { id: 'cough', name: '😷 Tiếng ho khan', segments: '#3', volume: 50 },
    { id: 'phone_ring', name: '📞 Tiếng điện thoại reng', segments: '#3', volume: 50 },
    { id: 'applause', name: '👏 Tiếng vỗ tay hoan hô', segments: '#3', volume: 50 }
  ],
  behaviorSeed: Math.floor(Math.random() * 1000000),
  videoPriorityBlocks: '',
  maxSubChars: 120,
  minSubChars: 40
};

// Helper for keyword matching with case-insensitive, standalone or bordered by special chars (word boundaries)
function isKeywordMatch(subtitleText: string, kw: string): boolean {
  if (!subtitleText || !kw) return false;
  const lowerText = subtitleText.toLowerCase();
  const lowerKw = kw.toLowerCase().trim();
  if (STOP_WORDS.has(lowerKw)) return false; // Absolutely ignore stop words!
  
  let index = lowerText.indexOf(lowerKw);
  while (index !== -1) {
    let leftOk = true;
    if (index > 0) {
      const leftChar = lowerText[index - 1];
      if (/[A-Za-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(leftChar)) {
        leftOk = false;
      }
    }
    
    let rightOk = true;
    const rightIndex = index + lowerKw.length;
    if (rightIndex < lowerText.length) {
      const rightChar = lowerText[rightIndex];
      if (/[A-Za-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(rightChar)) {
        rightOk = false;
      }
    }
    
    if (leftOk && rightOk) {
      return true;
    }
    index = lowerText.indexOf(lowerKw, index + 1);
  }
  return false;
}

// Fisher-Yates shuffle helper to ensure complete and robust randomness of local image arrays
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props!: ErrorBoundaryProps;
  state!: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    if (confirm("Bạn có chắc chắn muốn Đặt Lại Toàn Bộ Dữ Liệu (Reset)? Thao tác này sẽ xóa cấu hình trong localStorage và làm mới trang.")) {
      safeLocalStorage.clear();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#111315] text-[#e0e0e0] flex items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-[#1e2226] border border-red-500/20 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4 text-red-500">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <FolderLock size={32} />
              </div>
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wide">Đã xảy ra lỗi hệ thống</h1>
                <p className="text-xs text-white/50 mt-1">Hệ thống Render đã phát hiện lỗi không mong muốn và tự động ngăn chặn sự cố trắng màn hình.</p>
              </div>
            </div>
            
            <div className="p-4 bg-[#141618] rounded-xl border border-white/5 font-mono text-xs text-red-400 overflow-auto max-h-[250px] whitespace-pre-wrap leading-relaxed">
              {this.state.error?.stack || this.state.error?.toString() || "Unexpected crash"}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                Tải lại trang web (Reload)
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
              >
                Xóa cấu hình lỗi & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [images, setImages] = useState<CharacterImage[]>([]);
  const [videos, setVideos] = useState<CharacterImage[]>([]);
  const [backgroundNames, setBackgroundNames] = useState<string[]>(() => {
    try {
      const saved = safeLocalStorage.getItem('vsync_background_names');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      safeLocalStorage.setItem('vsync_background_names', JSON.stringify(backgroundNames));
    } catch (e) {
      console.warn("Lỗi lưu background_names vào safeLocalStorage:", e);
    }
  }, [backgroundNames]);

  const [dictionary, setDictionary] = useState<DictionaryRule[]>([]);

  const getNormalizedImages = useMemo(() => {
    const validNames = new Set<string>();
    dictionary.forEach(r => {
      if (r.characterName) validNames.add(r.characterName.trim());
    });
    backgroundNames.forEach(bg => {
      validNames.add(bg.trim());
    });
    const validNamesList = Array.from(validNames);

    return images.map(img => {
      if (!img.characterName) {
        return { ...img, characterName: 'Không có nhân vật' };
      }
      const trimmed = img.characterName.trim();
      const lower = trimmed.toLowerCase();
      if (!trimmed || lower === 'không có nhân vật' || lower === 'tất cả') {
        return { ...img, characterName: 'Không có nhân vật' };
      }
      const match = validNamesList.find(n => n.toLowerCase() === lower);
      return {
        ...img,
        characterName: match || 'Không có nhân vật'
      };
    });
  }, [images, dictionary, backgroundNames]);

  const [isDbLoading, setIsDbLoading] = useState(true);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [subtitles, setSubtitles] = useState<SubtitleBlock[]>([]);
  const [config, setConfig] = useState<RenderConfig>(DEFAULT_CONFIG);

  const mergedSubtitles = useMemo(() => {
    const usedImageIds = new Set<string>();

    const uniqueCharNames = Array.from(new Set([
      ...getNormalizedImages.map(img => img.characterName),
      ...(videos || []).map(v => v.characterName),
      ...dictionary.map(d => d.characterName)
    ].map(name => name?.trim()).filter(name => {
      if (!name) return false;
      const lower = name.toLowerCase();
      return lower !== 'không có nhân vật' && lower !== 'tất cả' && lower !== 'không có' && !STOP_WORDS.has(lower);
    }) as string[]));

    const isWordMatchIgnoreCase = (targetText: string, kw: string): boolean => {
      if (!targetText || !kw) return false;
      const lowerText = targetText.toLowerCase();
      const lowerKw = kw.toLowerCase().trim();
      if (STOP_WORDS.has(lowerKw)) return false;
      
      let index = lowerText.indexOf(lowerKw);
      while (index !== -1) {
        let leftOk = true;
        if (index > 0) {
          const leftChar = lowerText[index - 1];
          if (/[A-Za-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(leftChar)) {
            leftOk = false;
          }
        }
        
        let rightOk = true;
        const rightIndex = index + lowerKw.length;
        if (rightIndex < lowerText.length) {
          const rightChar = lowerText[rightIndex];
          if (/[A-Za-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(rightChar)) {
            rightOk = false;
          }
        }
        
        if (leftOk && rightOk) {
          return true;
        }
        index = lowerText.indexOf(lowerKw, index + 1);
      }
      return false;
    };

    const getCharsInItem = (item: CharacterImage): Set<string> => {
      const itemChars = new Set<string>();
      if (item.characterName) {
        const lowerChar = item.characterName.trim().toLowerCase();
        if (lowerChar && lowerChar !== 'không có nhân vật' && lowerChar !== 'tất cả' && lowerChar !== 'không có' && !STOP_WORDS.has(lowerChar)) {
          uniqueCharNames.forEach(char => {
            if (isWordMatchIgnoreCase(item.characterName || '', char)) {
              itemChars.add(char);
            }
          });
          itemChars.add(item.characterName.trim());
        }
      }
      if (item.name) {
        uniqueCharNames.forEach(char => {
          if (isWordMatchIgnoreCase(item.name || '', char)) {
            itemChars.add(char);
          }
        });
      }
      return itemChars;
    };

    const getDetectedCharactersForBlock = (text: string): Set<string> => {
      const detected = new Set<string>();
      uniqueCharNames.forEach(char => {
        if (isWordMatchIgnoreCase(text, char)) {
          detected.add(char);
        }
      });
      dictionary.forEach(entry => {
        if (entry.keyword && isWordMatchIgnoreCase(text, entry.keyword)) {
          if (entry.characterName) {
            const lower = entry.characterName.trim().toLowerCase();
            if (lower && lower !== 'không có nhân vật' && lower !== 'tất cả' && lower !== 'không có' && !STOP_WORDS.has(lower)) {
              detected.add(entry.characterName.trim());
            }
          }
        }
      });
      return detected;
    };
    // 1. First, merge short blocks under minSubChars
    let mergedBlocks: SubtitleBlock[] = [];
    const minChars = config.minSubChars !== undefined ? config.minSubChars : 40;
    
    if (minChars > 0 && subtitles.length > 0) {
      let i = 0;
      while (i < subtitles.length) {
        let currentBlock = { ...subtitles[i] };
        const constituentIds = [currentBlock.id];
        
        while (currentBlock.text.trim().length < minChars && i + 1 < subtitles.length) {
          i++;
          const nextBlock = subtitles[i];
          currentBlock.text = (currentBlock.text.trim() + " " + nextBlock.text.trim()).trim();
          currentBlock.endTime = nextBlock.endTime;
          constituentIds.push(nextBlock.id);
          
          // Merge matched keywords, images, etc.
          if (nextBlock.matchedKeywordsList) {
            currentBlock.matchedKeywordsList = Array.from(new Set([
              ...(currentBlock.matchedKeywordsList || []),
              ...nextBlock.matchedKeywordsList
            ])).slice(0, 4);
          }
          if (nextBlock.matchedImageIds) {
            currentBlock.matchedImageIds = Array.from(new Set([
              ...(currentBlock.matchedImageIds || []),
              ...nextBlock.matchedImageIds
            ]));
          }
          if (nextBlock.matchedLeftImageId && !currentBlock.matchedLeftImageId) {
            currentBlock.matchedLeftImageId = nextBlock.matchedLeftImageId;
          }
          if (nextBlock.matchedRightImageId && !currentBlock.matchedRightImageId) {
            currentBlock.matchedRightImageId = nextBlock.matchedRightImageId;
          }
          if (nextBlock.isManualMatch) {
            currentBlock.isManualMatch = true;
          }
        }
        
        // If it's still < minChars but we reached the end of the list, 
        // merge it back into the last block in mergedBlocks (if any)
        if (currentBlock.text.trim().length < minChars && mergedBlocks.length > 0) {
          const lastIdx = mergedBlocks.length - 1;
          mergedBlocks[lastIdx].text = (mergedBlocks[lastIdx].text.trim() + " " + currentBlock.text.trim()).trim();
          mergedBlocks[lastIdx].endTime = currentBlock.endTime;
          
          const lastBlock = mergedBlocks[lastIdx] as any;
          if (lastBlock.constituentIds) {
            lastBlock.constituentIds.push(...constituentIds);
          }
          
          if (currentBlock.matchedKeywordsList) {
            mergedBlocks[lastIdx].matchedKeywordsList = Array.from(new Set([
              ...(mergedBlocks[lastIdx].matchedKeywordsList || []),
              ...currentBlock.matchedKeywordsList
            ])).slice(0, 4);
          }
          if (currentBlock.matchedImageIds) {
            mergedBlocks[lastIdx].matchedImageIds = Array.from(new Set([
              ...(mergedBlocks[lastIdx].matchedImageIds || []),
              ...currentBlock.matchedImageIds
            ]));
          }
          if (currentBlock.isManualMatch) {
            mergedBlocks[lastIdx].isManualMatch = true;
          }
        } else {
          (currentBlock as any).constituentIds = constituentIds;
          mergedBlocks.push(currentBlock);
        }
        i++;
      }
    } else {
      mergedBlocks = subtitles.map(b => ({ ...b, constituentIds: [b.id] }));
    }

    const getDirectMatchedCharacterNames = (text: string): string[] => {
      const matchSet = new Set<string>();
      
      images.forEach(img => {
        if (img.characterName && img.characterName !== 'Không có nhân vật' && img.characterName !== 'Tất cả') {
          if (isKeywordMatch(text, img.characterName)) {
            matchSet.add(img.characterName);
          }
        }
      });

      (videos || []).forEach(vid => {
        if (vid.characterName && vid.characterName !== 'Không có nhân vật' && vid.characterName !== 'Tất cả') {
          if (isKeywordMatch(text, vid.characterName)) {
            matchSet.add(vid.characterName);
          }
        }
      });

      dictionary.forEach(entry => {
        const dictKw = entry.keyword;
        if (dictKw && isKeywordMatch(text, dictKw)) {
          const targetChar = entry.characterName;
          if (targetChar) {
            matchSet.add(targetChar);
          }
        }
      });

      return Array.from(matchSet);
    };

    const remapBlockUsingDirectCharsOnly = (b: SubtitleBlock, chars: string[]): SubtitleBlock => {
      chars.sort((a, bName) => {
        const getFirstPos = (name: string) => {
          let minIdx = 999999;
          const kws = [name];
          dictionary.forEach(entry => {
            if (entry.characterName === name && entry.keyword) {
              kws.push(entry.keyword);
            }
          });
          kws.forEach(kw => {
            const idx = b.text.toLowerCase().indexOf(kw.toLowerCase());
            if (idx !== -1 && idx < minIdx) minIdx = idx;
          });
          return minIdx;
        };
        return getFirstPos(a) - getFirstPos(bName);
      });

      const getImagesForKw = (kw: string) => {
        const matches: CharacterImage[] = [];
        dictionary.forEach(entry => {
          if (entry.keyword === kw && kw.length > 0) {
            const targetChar = entry.characterName;
            images.forEach(img => {
              if (img.characterName && img.characterName === targetChar) {
                if (!matches.some(m => m.id === img.id)) matches.push(img);
              }
            });
          }
        });
        images.forEach(img => {
          if (img.characterName && img.characterName === kw) {
            if (!matches.some(m => m.id === img.id)) matches.push(img);
          }
        });
        return matches;
      };

      const getVideosForKw = (kw: string): CharacterImage[] => {
        const matches: CharacterImage[] = [];
        dictionary.forEach(entry => {
          if (entry.keyword === kw && kw.length > 0) {
            const targetChar = entry.characterName;
            videos.forEach(vid => {
              if (vid.characterName && vid.characterName === targetChar) {
                if (!matches.some(m => m.id === vid.id)) matches.push(vid);
              }
            });
          }
        });
        videos.forEach(vid => {
          if (vid.characterName && vid.characterName === kw) {
            if (!matches.some(m => m.id === vid.id)) matches.push(vid);
          }
        });
        return matches;
      };

      const isPriorityBlock = config.videoPriorityBlocks && (() => {
        const digits = config.videoPriorityBlocks.split(',').map(s => s.trim()).filter(Boolean);
        const blockIdStr = String(b.id);
        return digits.some(digit => blockIdStr.endsWith(digit));
      })();
      const shouldPreferVideo = !!isPriorityBlock;

      const getDeterministicIndex = (seedStr: string, poolLength: number): number => {
        if (poolLength <= 1) return 0;
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) {
          hash = (hash << 5) - hash + seedStr.charCodeAt(i);
          hash |= 0;
        }
        return Math.abs(hash) % poolLength;
      };

      const resolveMediaForKw = (kw: string, preferVideo: boolean, excludeIds: Set<string> = new Set()): { id: string; keyword: string } | null => {
        const imgPool = getImagesForKw(kw);
        const videoPool = getVideosForKw(kw);

        const findBestInPool = (pool: Array<{ id: string }>) => {
          if (pool.length === 0) return null;
          let candidates = pool.filter(item => !excludeIds.has(item.id));
          if (candidates.length === 0) candidates = pool;

          let freshCandidates = candidates.filter(item => !usedImageIds.has(item.id));
          if (freshCandidates.length === 0) freshCandidates = candidates;

          const seedStr = `${b.text}_${b.startTime}_${kw}_${excludeIds.size}`;
          const index = getDeterministicIndex(seedStr, freshCandidates.length);
          const selected = freshCandidates[index];
          if (selected) {
            usedImageIds.add(selected.id);
          }
          return selected;
        };

        if (preferVideo) {
          const videoRes = findBestInPool(videoPool);
          if (videoRes) return { id: videoRes.id, keyword: kw };
          const imgRes = findBestInPool(imgPool);
          if (imgRes) return { id: imgRes.id, keyword: kw };
        } else {
          const imgRes = findBestInPool(imgPool);
          if (imgRes) return { id: imgRes.id, keyword: kw };
          const videoRes = findBestInPool(videoPool);
          if (videoRes) return { id: videoRes.id, keyword: kw };
        }
        return null;
      };

      const checkShouldPairForKw = (blk: SubtitleBlock): boolean => {
        const mode = config?.singleKeywordMode || 'pair';
        if (mode === 'no_split') return false;
        if (mode === 'pair') return true;
        if (mode === 'single') return false;
        const idStr = String(blk.id || '');
        const textStr = String(blk.text || '');
        const timeStr = String(blk.startTime || '');
        let hash = 0;
        const combined = `${idStr}|${textStr}|${timeStr}`;
        for (let i = 0; i < combined.length; i++) {
          hash = (hash << 5) - hash + combined.charCodeAt(i);
          hash |= 0;
        }
        const seed = Math.abs(hash) % 100;

        if (mode === 'percent_50_50') return seed < 50;
        if (mode === 'percent_25_75') return seed < 25;
        if (mode === 'percent_75_25') return seed < 75;
        return true;
      };

      let leftImgId: string | undefined = undefined;
      let rightImgId: string | undefined = undefined;
      let leftKw: string | undefined = undefined;
      let rightKw: string | undefined = undefined;
      let matchedImgIds: string[] | undefined = undefined;
      let matchedKwsList: string[] | undefined = undefined;

      const isNoSplit = config?.singleKeywordMode === 'no_split';

      if (chars.length >= 2 && isNoSplit) {
        const seedIndex = (b.id * 31 + 7) % chars.length;
        const kw = chars[seedIndex];
        const media = resolveMediaForKw(kw, shouldPreferVideo);
        if (media) {
          leftImgId = media.id;
          leftKw = kw;
          matchedImgIds = [media.id];
          matchedKwsList = [kw];
        }
      } else if (chars.length >= 2) {
        const selectedMedia: { id: string; keyword: string }[] = [];
        chars.forEach(kw => {
          const media = resolveMediaForKw(kw, shouldPreferVideo);
          if (media) selectedMedia.push(media);
        });

        if (selectedMedia.length >= 2) {
          const slicedMedia = selectedMedia.slice(0, 4);
          leftImgId = slicedMedia[0].id;
          rightImgId = slicedMedia[slicedMedia.length - 1].id;
          leftKw = slicedMedia[0].keyword;
          rightKw = slicedMedia[slicedMedia.length - 1].keyword;
          matchedImgIds = slicedMedia.map(m => m.id);
          matchedKwsList = slicedMedia.map(m => m.keyword);
        } else if (selectedMedia.length === 1) {
          const media1 = selectedMedia[0];
          leftImgId = media1.id;
          leftKw = media1.keyword;
          const shouldPair = checkShouldPairForKw(b);
          if (shouldPair) {
            const media2 = resolveMediaForKw(media1.keyword, shouldPreferVideo, new Set([media1.id])) || media1;
            rightImgId = media2.id;
            rightKw = media1.keyword;
            matchedImgIds = [media1.id, media2.id].slice(0, 2);
            matchedKwsList = [media1.keyword, media1.keyword].slice(0, 2);
          } else {
            matchedImgIds = [media1.id];
            matchedKwsList = [media1.keyword];
          }
        }
      } else {
        const kw = chars[0];
        const media1 = resolveMediaForKw(kw, shouldPreferVideo);
        if (media1) {
          leftImgId = media1.id;
          leftKw = kw;
          const shouldPair = checkShouldPairForKw(b);
          if (shouldPair) {
            const media2 = resolveMediaForKw(kw, shouldPreferVideo, new Set([media1.id])) || media1;
            rightImgId = media2.id;
            rightKw = kw;
            matchedImgIds = [media1.id, media2.id].slice(0, 2);
            matchedKwsList = [kw, kw].slice(0, 2);
          } else {
            matchedImgIds = [media1.id];
            matchedKwsList = [kw];
          }
        }
      }

      return {
        ...b,
        matchedLeftImageId: leftImgId,
        matchedRightImageId: undefined,
        matchedLeftKeyword: leftKw,
        matchedRightKeyword: undefined,
        matchedImageIds: leftImgId ? [leftImgId] : undefined,
        matchedKeywordsList: leftKw ? [leftKw] : undefined,
        inheritanceDistance: 0,
        isFallbackBlock: false
      };
    };

    return mergedBlocks.map((block, idx) => {
      const workingBlock = {
        ...block,
        id: idx + 1
      };
      if (workingBlock.isManualMatch) {
        return workingBlock;
      }
      // If we already have a matched image from the state (assigned via initial remap or manual/auto matching), do not override it!
      if (workingBlock.matchedLeftImageId || workingBlock.matchedRightImageId) {
        return workingBlock;
      }
      const directChars = getDirectMatchedCharacterNames(workingBlock.text);
      if (directChars.length > 0) {
        return remapBlockUsingDirectCharsOnly(workingBlock, directChars);
      }
      return workingBlock;
    });
  }, [subtitles, config.minSubChars, images, videos, dictionary, backgroundNames, config.singleKeywordMode, config.videoPriorityBlocks]);

  const displaySubtitles = useMemo(() => {
    // 2. Split long blocks under maxSubChars
    const maxChars = config.maxSubChars !== undefined ? config.maxSubChars : 120;
    if (maxChars <= 0) {
      return mergedSubtitles;
    }
    
    const splitBlocks: SubtitleBlock[] = [];
    
    for (const block of mergedSubtitles) {
      if (block.text.length <= maxChars) {
        splitBlocks.push({
          ...block,
          id: block.id
        });
        continue;
      }
      
      const textChunks = splitTextIntoBalancedChunks(block.text, maxChars);
      if (textChunks.length <= 1) {
        splitBlocks.push({
          ...block,
          id: block.id
        });
        continue;
      }
      
      const duration = block.endTime - block.startTime;
      const words = block.text.trim().split(/\s+/);
      const totalWords = words.length;
      const secPerWord = totalWords > 0 ? duration / totalWords : 0;
      
      let currentWordIndex = 0;
      for (let c = 0; c < textChunks.length; c++) {
        const chunkText = textChunks[c];
        const chunkWords = chunkText.trim().split(/\s+/);
        const chunkWordCount = chunkWords.length;
        
        const chunkStartOffset = currentWordIndex * secPerWord;
        const chunkDuration = chunkWordCount * secPerWord;
        
        const chunkStartTime = block.startTime + chunkStartOffset;
        const chunkEndTime = (c === textChunks.length - 1) 
          ? block.endTime 
          : (chunkStartTime + chunkDuration);
        
        splitBlocks.push({
          ...block,
          id: block.id,
          text: chunkText,
          startTime: Number(chunkStartTime.toFixed(3)),
          endTime: Number(chunkEndTime.toFixed(3)),
        });
        
        currentWordIndex += chunkWordCount;
      }
    }
    
    return splitBlocks;
  }, [mergedSubtitles, config.maxSubChars]);
  const [presets, setPresets] = useState<SubtitlePreset[]>(() => {
    let saved = null;
    try {
      saved = safeLocalStorage.getItem('vsync_sub_presets');
    } catch (e) {
      console.warn("Lỗi đọc sub_presets từ safeLocalStorage:", e);
    }
    const defaultPreset = DEFAULT_PRESETS[0];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Clean out legacy or news style presets that start with preset_news_ or have specific ids
          let filtered = parsed.filter(p => p.id !== 'preset_white_yellow_highlight' && !p.id.startsWith('preset_news_'));

          if (!filtered.some(p => p.id === 'preset_1')) {
            return [defaultPreset, ...filtered];
          }
          return filtered;
        }
      } catch (e) {
        console.error("Lỗi parse subtitle presets:", e);
      }
    }
    return DEFAULT_PRESETS;
  });

  // Backup subtitle style presets to localStorage for permanent storage across reboots
  useEffect(() => {
    try {
      safeLocalStorage.setItem('vsync_sub_presets', JSON.stringify(presets));
    } catch (e) {
      console.warn("Lỗi lưu sub_presets vào safeLocalStorage:", e);
    }
  }, [presets]);

  // Re-match automatic subtitle blocks when layout rules or video priorities change in config
  useEffect(() => {
    if (subtitles.length > 0 && getNormalizedImages.length > 0) {
      remapSubtitles(subtitles, getNormalizedImages);
    }
  }, [config.singleKeywordMode, config.videoPriorityBlocks, getNormalizedImages]);

  const [previewTime, setPreviewTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'create' | 'guide'>('create');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isKhoAnhOpen, setIsKhoAnhOpen] = useState(false);
  const [showMissingImagesModal, setShowMissingImagesModal] = useState(false);
  const [missingCharacters, setMissingCharacters] = useState<Array<{ characterName: string; matchedKeywords: string[] }>>([]);
  const [bypassMissingCheck, setBypassMissingCheck] = useState(false);

  // States for checking audio & srt file duration mismatch
  const [showMismatchWarning, setShowMismatchWarning] = useState(false);
  const [hasShownMismatchWarning, setHasShownMismatchWarning] = useState(false);

  // Reset mismatch warning when either file changes completely
  useEffect(() => {
    setHasShownMismatchWarning(false);
  }, [audioFile, srtFile]);

  // Compare duration difference and prompt if delta > 10 seconds
  useEffect(() => {
    if (audioDuration > 0 && subtitles.length > 0 && !hasShownMismatchWarning) {
      const lastSubBlock = subtitles[subtitles.length - 1];
      if (lastSubBlock) {
        const subDuration = lastSubBlock.endTime;
        const delta = Math.abs(audioDuration - subDuration);
        if (delta > 10) {
          setShowMismatchWarning(true);
        }
      }
    }
  }, [audioDuration, subtitles, hasShownMismatchWarning]);

  const formatMismatchDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) {
      return `${secs} giây`;
    }
    if (secs === 0) {
      return `${mins} phút`;
    }
    return `${mins} phút ${secs} giây`;
  };
  
  // Stepped-flow UI coordinators
  const [hasProcessed, setHasProcessed] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [bgMusicFiles, setBgMusicFiles] = useState<Array<{ id: string; name: string; url: string; file: File; volume?: number }>>([]);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  // Background music management hooks
  const handleAddBgMusic = async (files: File[]) => {
    const newItems = files.map(file => {
      const isNoise = file.name.toLowerCase().includes('tapam');
      return {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        url: URL.createObjectURL(file),
        file,
        volume: isNoise ? 15 : 100 // Default 100% volume, except 15% for noise shield
      };
    });
    
    setBgMusicFiles(prev => {
      const updated = [...prev, ...newItems];
      saveBgMusicToDB(updated).catch(err => console.error("Lỗi lưu nhạc nền vào IndexedDB:", err));
      return updated;
    });
  };

  const handleUpdateBgMusicVolume = async (id: string, volume: number) => {
    setBgMusicFiles(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          return { ...item, volume };
        }
        return item;
      });
      saveBgMusicToDB(updated).catch(err => console.error("Lỗi cập nhật âm lượng nhạc nền:", err));
      return updated;
    });
  };

  const handleDeleteBgMusic = async (id: string) => {
    setBgMusicFiles(prev => {
      const target = prev.find(item => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      const updated = prev.filter(item => item.id !== id);
      saveBgMusicToDB(updated).catch(err => console.error("Lỗi đồng bộ nhạc nền sau khi xóa:", err));
      return updated;
    });
  };

  // Delete all images and videos of an entire character group
  const handleDeleteCharacter = async (charName: string) => {
    // Delete images of this group from IndexedDB
    const targets = images.filter(img => img.characterName === charName);
    for (const img of targets) {
      try {
        await deleteImageFromDB(img.id);
        URL.revokeObjectURL(img.url);
      } catch (err) {
        console.error("Lỗi khi xóa ảnh của nhân vật:", img.name, err);
      }
    }

    // Clean up dictionary rules mapping to this character
    const updatedDict = dictionary.filter(r => r.characterName !== charName);
    setDictionary(updatedDict);

    // Clean up backgroundNames if it was a background
    setBackgroundNames(prev => prev.filter(b => b !== charName));

    // Update images state and remap subtitles
    setImages(prev => {
      const updated = prev.filter(img => img.characterName !== charName);
      if (subtitles.length > 0) {
        remapSubtitles(subtitles, updated, updatedDict);
      }
      return updated;
    });
  };

  // Delete only the images (and/or videos) of a character/background group, preserving the empty group folder itself
  const handleDeleteAllImagesOfCharacter = async (charName: string) => {
    const targets = images.filter(img => {
      if (charName === 'Không có nhân vật') return !img.characterName || img.characterName === 'Không có nhân vật';
      return img.characterName === charName;
    });
    for (const img of targets) {
      try {
        await deleteImageFromDB(img.id);
        URL.revokeObjectURL(img.url);
      } catch (err) {
        console.error("Lỗi khi xóa ảnh của nhân vật/bối cảnh:", img.name, err);
      }
    }
    setImages(prev => {
      const updated = prev.filter(img => {
        if (charName === 'Không có nhân vật') return img.characterName && img.characterName !== 'Không có nhân vật';
        return img.characterName !== charName;
      });
      if (subtitles.length > 0) {
        remapSubtitles(subtitles, updated);
      }
      return updated;
    });
  };

  const handleCustomBgUploaded = (type: 'intro' | 'outro', file: File) => {
    const url = URL.createObjectURL(file);
    const customId = type === 'intro' ? 'intro-bg-custom' : 'outro-bg-custom';
    
    const newImg: CharacterImage = {
      id: customId,
      name: type === 'intro' ? 'Ảnh nền Intro riêng' : 'Ảnh nền Outro riêng',
      path: customId,
      url,
      file,
      keywords: []
    };
    
    setConfig(prev => ({
      ...prev,
      [type === 'intro' ? 'introImageId' : 'outroImageId']: customId
    }));
    
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== customId);
      return [...filtered, newImg];
    });
  };

  const getBlobVideoDuration = (blob: Blob): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(blob);
      
      let resolved = false;
      const done = (val: number) => {
        if (resolved) return;
        resolved = true;
        video.removeEventListener('loadedmetadata', onLoad);
        video.removeEventListener('durationchange', onLoad);
        video.removeEventListener('loadeddata', onLoad);
        video.removeEventListener('error', onError);
        URL.revokeObjectURL(url);
        resolve(val);
      };

      const onLoad = () => {
        const d = video.duration;
        if (typeof d === 'number' && isFinite(d) && d > 0) {
          done(d);
        }
      };
      const onError = () => {
        done(0);
      };

      video.addEventListener('loadedmetadata', onLoad);
      video.addEventListener('durationchange', onLoad);
      video.addEventListener('loadeddata', onLoad);
      video.addEventListener('error', onError);

      video.src = url;
      video.load();

      setTimeout(() => {
        if (!resolved) {
          const d = video.duration;
          if (typeof d === 'number' && isFinite(d) && d > 0) {
            done(d);
          } else {
            done(0);
          }
        }
      }, 1500);
    });
  };

  const handleVideoConfigUploaded = async (type: 'intro' | 'outro', file: File, duration: number) => {
    const url = URL.createObjectURL(file);
    const key = type === 'intro' ? 'introVideoUrl' : 'outroVideoUrl';
    const durKey = type === 'intro' ? 'introDuration' : 'outroDuration';
    
    try {
      await saveConfigFileToDB(type === 'intro' ? 'intro-video' : 'outro-video', file);
    } catch (e) {
      console.error("Lỗi khi lưu video config vào DB:", e);
    }

    setConfig(prev => ({
      ...prev,
      [key]: url,
      [durKey]: duration
    }));
  };

  const handleVideoConfigRemoved = async (type: 'intro' | 'outro') => {
    const key = type === 'intro' ? 'introVideoUrl' : 'outroVideoUrl';
    
    try {
      await deleteConfigFileFromDB(type === 'intro' ? 'intro-video' : 'outro-video');
    } catch (e) {
      console.error("Lỗi khi xóa video config khỏi DB:", e);
    }

    setConfig(prev => ({
      ...prev,
      [key]: undefined
    }));
  };

  // Load state and files on startup
  useEffect(() => {
    // Request persistent storage to prevent browser from auto-clearing IndexedDB when local space is low
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(granted => {
          if (granted) {
            console.log("✓ Quyền lưu trữ bền bỉ (Persistent Storage) đã được cấp thành công!");
          } else {
            console.warn("⚠ Trình duyệt từ chối cấp quyền lưu trữ bền bỉ. Ảnh có thể bị xóa nếu ổ đĩa đầy hoặc chạy ẩn danh.");
          }
        }).catch(err => {
          console.warn("⚠ Không thể lấy quyền lưu trữ bền bỉ do giới hạn bảo mật của trình duyệt:", err);
        });
      }
    } catch (e) {
      console.warn("⚠ Lỗi khi truy cập StorageManager API:", e);
    }

    // 1. Recover character images
    getAllImagesFromDB().then((loadedImages) => {
      setImages(loadedImages);
      setVideos([]);
      setIsDbLoading(false);
    }).catch(err => {
      console.error("Lỗi khi khôi phục tài nguyên nhân vật từ IndexedDB:", err);
      setIsDbLoading(false);
    });

    // 2. Recover configurations
    let savedConfigStr = null;
    try {
      savedConfigStr = safeLocalStorage.getItem('vsync_config');
    } catch (e) {
      console.warn("Lỗi đọc config từ safeLocalStorage:", e);
    }
    let loadedConfig = DEFAULT_CONFIG;
    if (savedConfigStr) {
      try {
        const parsed = JSON.parse(savedConfigStr);
        if (parsed) {
          if (!parsed.humanStickerGroups || parsed.humanStickerGroups.length === 0) {
            parsed.humanStickerGroups = populateDefaultStickers(DEFAULT_STICKER_GROUPS);
          } else {
            parsed.humanStickerGroups = populateDefaultStickers(parsed.humanStickerGroups);
          }
        }
        loadedConfig = { ...DEFAULT_CONFIG, ...parsed };
      } catch (e) {
        console.error("Lỗi khôi phục cấu hình từ localStorage:", e);
      }
    }

    // 3. Load custom intro & outro video files from IndexedDB
    Promise.all([
      getConfigFileFromDB('intro-video'),
      getConfigFileFromDB('outro-video')
    ]).then(async ([introFile, outroFile]) => {
      const updatedConfig = { ...loadedConfig };
      if (introFile) {
        updatedConfig.introVideoUrl = URL.createObjectURL(introFile);
        const dur = await getBlobVideoDuration(introFile);
        if (dur > 0) {
          updatedConfig.introDuration = dur;
        }
      }
      if (outroFile) {
        updatedConfig.outroVideoUrl = URL.createObjectURL(outroFile);
        const dur = await getBlobVideoDuration(outroFile);
        if (dur > 0) {
          updatedConfig.outroDuration = dur;
        }
      }
      setConfig(updatedConfig);
      setIsConfigLoaded(true);
    }).catch(err => {
      console.error("Lỗi khi khôi phục file video intro/outro:", err);
      setConfig(loadedConfig);
      setIsConfigLoaded(true);
    });

    // 4. Load background music files from IndexedDB
    getAllBgMusicFromDB()
      .then(tracks => {
        setBgMusicFiles(tracks);
      })
      .catch(err => {
        console.error("Lỗi khôi phục danh sách nhạc nền:", err);
      });

    // 5. Load dictionary rules from localStorage
    let savedDictStr = null;
    try {
      savedDictStr = safeLocalStorage.getItem('vsync_dictionary');
    } catch (e) {
      console.warn("Lỗi đọc dictionary từ safeLocalStorage:", e);
    }
    if (savedDictStr) {
      try {
        setDictionary(JSON.parse(savedDictStr));
      } catch (e) {
        console.error("Lỗi khôi phục danh bạ từ localStorage:", e);
      }
    }
  }, []);

  // Save configurations upon changes after initialization
  useEffect(() => {
    if (!isConfigLoaded) return;
    const serializable = {
      ...config,
      introVideoUrl: undefined,
      outroVideoUrl: undefined
    };
    try {
      safeLocalStorage.setItem('vsync_config', JSON.stringify(serializable));
    } catch (e) {
      console.warn("Lỗi lưu config vào safeLocalStorage:", e);
    }
  }, [config, isConfigLoaded]);

  // Sync dictionary to localStorage and trigger subtitle remapping on dictionary edits
  useEffect(() => {
    if (!isConfigLoaded) return;
    try {
      safeLocalStorage.setItem('vsync_dictionary', JSON.stringify(dictionary));
    } catch (e) {
      console.warn("Lỗi lưu dictionary vào safeLocalStorage:", e);
    }
    if (subtitles.length > 0 && getNormalizedImages.length > 0) {
      remapSubtitles(subtitles, getNormalizedImages, dictionary);
    }
  }, [dictionary, getNormalizedImages]);

  // Automatically clean up orphan dictionary rules for deleted characters or backgrounds
  useEffect(() => {
    if (!isConfigLoaded) return;

    // Collect all existing character/background names
    const existingNames = new Set<string>();
    images.forEach(img => {
      if (img.characterName) existingNames.add(img.characterName.toLowerCase());
    });
    backgroundNames.forEach(bg => {
      if (bg) existingNames.add(bg.toLowerCase());
    });
    try {
      const savedEmpty = safeLocalStorage.getItem('vsync_empty_chars');
      if (savedEmpty) {
        const parsed = JSON.parse(savedEmpty);
        if (Array.isArray(parsed)) {
          parsed.forEach(c => {
            if (c) existingNames.add(c.toLowerCase());
          });
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Filter dictionary: keep only rules where characterName is in existingNames
    const cleaned = dictionary.filter(rule => {
      if (!rule.characterName) return false;
      return existingNames.has(rule.characterName.toLowerCase());
    });

    if (cleaned.length !== dictionary.length) {
      setDictionary(cleaned);
      try {
        safeLocalStorage.setItem('vsync_dictionary', JSON.stringify(cleaned));
      } catch (e) {
        console.warn("Lỗi lưu dictionary vào safeLocalStorage:", e);
      }
    }
  }, [images, backgroundNames, isConfigLoaded]);

  // Trigger subtitle remapping when layout config or video settings changes
  useEffect(() => {
    if (!isConfigLoaded) return;
    if (subtitles.length > 0 && getNormalizedImages.length > 0) {
      remapSubtitles(subtitles, getNormalizedImages, dictionary);
    }
  }, [config.singleKeywordMode, config.videoPriorityBlocks, videos, getNormalizedImages]);

  const handleImagesLoaded = async (loadedImages: CharacterImage[], skipRemap = false) => {
    try {
      await saveImagesToDB(loadedImages);
    } catch (err) {
      console.error("Lỗi lưu ảnh vào db:", err);
    }

    setImages(prev => {
      const existingPaths = new Set(prev.map(img => img.path));
      const filteredNew = loadedImages.filter(img => !existingPaths.has(img.path));
      const combined = [...prev, ...filteredNew];
      if (subtitles.length > 0 && !skipRemap) {
        remapSubtitles(subtitles, combined);
      }
      return combined;
    });
  };

  const handleSingleImageDelete = async (id: string) => {
    try {
      await deleteImageFromDB(id);
      setImages(prev => {
        const updated = prev.filter(img => {
          if (img.id === id) {
            URL.revokeObjectURL(img.url); // prevent leak
            return false;
          }
          return true;
        });
        if (subtitles.length > 0) {
          remapSubtitles(subtitles, updated);
        }
        return updated;
      });
    } catch (err) {
      console.error("Không thể xóa ảnh lẻ:", err);
    }
  };

  const handleClearImages = async () => {
    try {
      await clearAllImagesFromDB();
      images.forEach(img => URL.revokeObjectURL(img.url)); // clear object urls cleanly
    } catch (err) {
      console.error("Lỗi dọn sạch db:", err);
    }
    setImages([]);
    // Reset matches on subtitles if images are cleared
    setSubtitles(prev => prev.map(b => ({
      ...b,
      matchedLeftImageId: undefined,
      matchedRightImageId: undefined,
      matchedLeftKeyword: undefined,
      matchedRightKeyword: undefined
    })));
  };

  const handleReloadAll = () => {
    if ((window as any).isRenderingGlobal) {
      alert("⚠️ Không thể reload khi đang xuất/render video! Vui lòng chờ cho đến khi hoàn thành hoặc tải lại trang.");
      return;
    }
    const confirmReset = window.confirm("XÁC NHẬN: Bạn có chắc chắn muốn làm mới toàn bộ không? Tất cả cài đặt hiện tại sẽ được khởi tạo lại từ đầu.");
    if (confirmReset) {
      window.location.reload();
    }
  };

  const handleAudioLoaded = (file: File, duration: number) => {
    setAudioFile(file);
    if (duration > 0) {
      setAudioDuration(duration);
    }
  };

  const handleClearAudio = () => {
    setAudioFile(null);
    setAudioDuration(0);
    setHasProcessed(false);
  };

  const getRandomPresetAndGroup = (currentPresetId?: string, currentGroup?: string) => {
    // 1. Randomize style preset
    let randomPresetId = currentPresetId || config.activePresetId;
    if (presets && presets.length > 0) {
      if (presets.length > 1) {
        const otherPresets = presets.filter(p => p.id !== (currentPresetId || config.activePresetId));
        const randIndex = Math.floor(Math.random() * otherPresets.length);
        randomPresetId = otherPresets[randIndex].id;
      } else {
        randomPresetId = presets[0].id;
      }
    }

    // 2. Randomize effect group
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
    let randomGroup = currentGroup || config.activeEffectGroup;
    if (finalGroups.length > 1) {
      const otherGroups = finalGroups.filter(g => g !== (currentGroup || config.activeEffectGroup));
      randomGroup = otherGroups[Math.floor(Math.random() * otherGroups.length)];
    } else {
      randomGroup = finalGroups[0];
    }

    return { randomPresetId, randomGroup };
  };

  const handleSubtitlesLoaded = (file: File, parsedBlocks: SubtitleBlock[]) => {
    setSrtFile(file);
    setSubtitles(parsedBlocks);
    setBypassMissingCheck(false); // Reset bypass for fresh subtitle upload
    
    // Generate a fresh random seed automatically to shuffle behavior positions and styles completely across videos!
    const newSeed = Math.floor(Math.random() * 1000000);
    const { randomPresetId, randomGroup } = getRandomPresetAndGroup();
    setConfig(prev => ({
      ...prev,
      behaviorSeed: newSeed,
      activePresetId: randomPresetId,
      activeEffectGroup: randomGroup
    }));

    if (images.length > 0) {
      remapSubtitles(parsedBlocks, images);
    }
    // Check missing immediately and trigger showing the popup if any are missing
    const missing = checkMissingCharacterImages(parsedBlocks, images, dictionary);
    if (missing.length > 0) {
      setMissingCharacters(missing);
      setShowMissingImagesModal(true);
    }
  };

  const handleClearSubtitles = () => {
    setSrtFile(null);
    setSubtitles([]);
    setBypassMissingCheck(false);
    setHasProcessed(false);
  };

  // Helper matching detector for missing character images
  const checkMissingCharacterImages = (
    blocksList: SubtitleBlock[], 
    imagesList: CharacterImage[], 
    dictList: DictionaryRule[]
  ): Array<{ characterName: string; matchedKeywords: string[] }> => {
    if (blocksList.length === 0 || dictList.length === 0) return [];
    
    // Group keywords by characterName from dictionary rules
    const charKeywordsMap: Record<string, Set<string>> = {};
    dictList.forEach(entry => {
      if (!entry.characterName) return;
      if (!charKeywordsMap[entry.characterName]) {
        charKeywordsMap[entry.characterName] = new Set();
      }
      charKeywordsMap[entry.characterName].add(entry.characterName);
      if (entry.keyword) {
        charKeywordsMap[entry.characterName].add(entry.keyword);
      }
    });

    const missingWithCounts: Array<{ characterName: string; matchedKeywords: string[]; totalCount: number }> = [];

    // For each unique character, check if mentioned and if they have 0 images in the stock images list
    Object.entries(charKeywordsMap).forEach(([charName, kws]) => {
      // Exclude background/scenery names from missing/warning alerts since they are intended to trigger scenery videos
      const cleanChar = charName.replace(/^\*/, '').trim().toLowerCase();
      if (backgroundNames.some(bg => bg.replace(/^\*/, '').trim().toLowerCase() === cleanChar)) {
        return;
      }

      const matchedWithCounts: string[] = [];
      let charTotalCount = 0;
      kws.forEach(kw => {
        let count = 0;
        blocksList.forEach(block => {
          if (isKeywordMatch(block.text, kw)) {
            count++;
          }
        });
        if (count > 0) {
          matchedWithCounts.push(`${kw} (${count} lần)`);
          charTotalCount += count;
        }
      });

      if (matchedWithCounts.length > 0) {
        // Character is mentioned! Check if they have images associated with their name
        const hasImages = imagesList.some(img => img.characterName === charName);
        if (!hasImages) {
          missingWithCounts.push({
            characterName: charName,
            matchedKeywords: matchedWithCounts,
            totalCount: charTotalCount
          });
        }
      }
    });

    // Sort by total occurrences descending
    missingWithCounts.sort((a, b) => b.totalCount - a.totalCount);

    // Map back to output signature
    return missingWithCounts.map(({ characterName, matchedKeywords }) => ({
      characterName,
      matchedKeywords
    }));
  };

  useEffect(() => {
    if (subtitles.length > 0 && dictionary.length > 0) {
      const missing = checkMissingCharacterImages(subtitles, images, dictionary);
      setMissingCharacters(missing);
    } else {
      setMissingCharacters([]);
    }
  }, [subtitles, images, dictionary, backgroundNames]);

  // Helper matching connector
  const remapSubtitles = (
    blocksList: SubtitleBlock[],
    imagesList: CharacterImage[],
    dictList: DictionaryRule[] = dictionary
  ) => {
    if (imagesList.length === 0) return;

    // Gather all unique valid keywords/characterName from image items + dictionary (preserving original casing!)
    const allKeywords = new Set<string>();
    imagesList.forEach(img => {
      if (img.characterName && img.characterName !== 'Không có nhân vật' && img.characterName !== 'Tất cả') {
        const lowerChar = img.characterName.toLowerCase();
        if (!STOP_WORDS.has(lowerChar)) {
          allKeywords.add(img.characterName);
        }
      }
    });

    dictList.forEach(entry => {
      if (entry.keyword) {
        const lowerKw = entry.keyword.toLowerCase();
        if (!STOP_WORDS.has(lowerKw)) {
          allKeywords.add(entry.keyword);
        }
      }
      if (entry.characterName) {
        const lowerChar = entry.characterName.toLowerCase();
        if (!STOP_WORDS.has(lowerChar)) {
          allKeywords.add(entry.characterName);
        }
      }
    });

    // Count frequency of each keyword in the entire srt file based on exact matching
    const kwFrequency: Record<string, number> = {};
    allKeywords.forEach(kw => {
      kwFrequency[kw] = 0;
    });

    blocksList.forEach(block => {
      allKeywords.forEach(kw => {
        if (isKeywordMatch(block.text, kw)) {
          kwFrequency[kw] = (kwFrequency[kw] || 0) + 1;
        }
      });
    });

    const sortedKws = Object.entries(kwFrequency)
      .filter(([kw, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    // Select the 5 most frequent keywords across the subtitles
    const top5Kws = sortedKws.slice(0, 5);
    // If we have fewer than 5 keywords, supplement with other valid keywords from candidate allKeywords
    if (top5Kws.length < 5) {
      const extraList = Array.from(allKeywords).filter(kw => !top5Kws.includes(kw));
      top5Kws.push(...extraList.slice(0, 5 - top5Kws.length));
    }

    const usedImageIds = new Set<string>();

    const uniqueCharNames = Array.from(new Set([
      ...imagesList.map(img => img.characterName),
      ...(videos || []).map(v => v.characterName),
      ...dictList.map(d => d.characterName)
    ].map(name => name?.trim()).filter(name => {
      if (!name) return false;
      const lower = name.toLowerCase();
      return lower !== 'không có nhân vật' && lower !== 'tất cả' && lower !== 'không có' && !STOP_WORDS.has(lower);
    }) as string[]));

    const isWordMatchIgnoreCase = (targetText: string, kw: string): boolean => {
      if (!targetText || !kw) return false;
      const lowerText = targetText.toLowerCase();
      const lowerKw = kw.toLowerCase().trim();
      if (STOP_WORDS.has(lowerKw)) return false;
      
      let index = lowerText.indexOf(lowerKw);
      while (index !== -1) {
        let leftOk = true;
        if (index > 0) {
          const leftChar = lowerText[index - 1];
          if (/[A-Za-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(leftChar)) {
            leftOk = false;
          }
        }
        
        let rightOk = true;
        const rightIndex = index + lowerKw.length;
        if (rightIndex < lowerText.length) {
          const rightChar = lowerText[rightIndex];
          if (/[A-Za-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(rightChar)) {
            rightOk = false;
          }
        }
        
        if (leftOk && rightOk) {
          return true;
        }
        index = lowerText.indexOf(lowerKw, index + 1);
      }
      return false;
    };

    const getCharsInItem = (item: CharacterImage): Set<string> => {
      const itemChars = new Set<string>();
      if (item.characterName) {
        const lowerChar = item.characterName.trim().toLowerCase();
        if (lowerChar && lowerChar !== 'không có nhân vật' && lowerChar !== 'tất cả' && lowerChar !== 'không có' && !STOP_WORDS.has(lowerChar)) {
          uniqueCharNames.forEach(char => {
            if (isWordMatchIgnoreCase(item.characterName || '', char)) {
              itemChars.add(char);
            }
          });
          itemChars.add(item.characterName.trim());
        }
      }
      if (item.name) {
        uniqueCharNames.forEach(char => {
          if (isWordMatchIgnoreCase(item.name || '', char)) {
            itemChars.add(char);
          }
        });
      }
      return itemChars;
    };

    const getDetectedCharactersForBlock = (text: string): Set<string> => {
      const detected = new Set<string>();
      uniqueCharNames.forEach(char => {
        if (isWordMatchIgnoreCase(text, char)) {
          detected.add(char);
        }
      });
      dictList.forEach(entry => {
        if (entry.keyword && isWordMatchIgnoreCase(text, entry.keyword)) {
          if (entry.characterName) {
            const lower = entry.characterName.trim().toLowerCase();
            if (lower && lower !== 'không có nhân vật' && lower !== 'tất cả' && lower !== 'không có' && !STOP_WORDS.has(lower)) {
              detected.add(entry.characterName.trim());
            }
          }
        }
      });
      return detected;
    };

    const getBestMediaForBlock = (
      detectedChars: Set<string>,
      shouldPreferVideo: boolean,
      excludeIds: Set<string> = new Set()
    ): Array<{ item: CharacterImage; score: number; isVideo: boolean }> => {
      if (detectedChars.size === 0) return [];

      const candidates: Array<{ item: CharacterImage; score: number; isVideo: boolean }> = [];

      // Score images
      imagesList.forEach(img => {
        if (excludeIds.has(img.id)) return;
        const imgChars = getCharsInItem(img);
        let score = 0;
        imgChars.forEach(char => {
          if (detectedChars.has(char)) {
            score++;
          }
        });
        if (score > 0) {
          candidates.push({ item: img, score, isVideo: false });
        }
      });

      // Score videos
      (videos || []).forEach(vid => {
        if (excludeIds.has(vid.id)) return;
        const vidChars = getCharsInItem(vid as any);
        let score = 0;
        vidChars.forEach(char => {
          if (detectedChars.has(char)) {
            score++;
          }
        });
        if (score > 0) {
          candidates.push({ item: vid as any, score, isVideo: true });
        }
      });

      // Sort:
      // 1. Score descending
      // 2. Freshness: unused first
      // 3. Media preference: shouldPreferVideo
      candidates.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        const aUsed = usedImageIds.has(a.item.id);
        const bUsed = usedImageIds.has(b.item.id);
        if (aUsed !== bUsed) return aUsed ? 1 : -1;
        if (shouldPreferVideo) {
          if (a.isVideo !== b.isVideo) return a.isVideo ? -1 : 1;
        } else {
          if (a.isVideo !== b.isVideo) return a.isVideo ? 1 : -1;
        }
        return a.item.id.localeCompare(b.item.id);
      });

      return candidates;
    };

    const isBackgroundKw = (kw: string): boolean => {
      if (!kw) return false;
      if (backgroundNames.some(bg => bg === kw)) {
        return true;
      }
      const matchedRule = dictList.find(entry => entry.keyword === kw);
      if (matchedRule && backgroundNames.some(bg => bg === matchedRule.characterName)) {
        return true;
      }
      return false;
    };

    const getImagesForKw = (kw: string) => {
      const matches: CharacterImage[] = [];
      // 1. Match from dictionary rules
      dictList.forEach(entry => {
        if (entry.keyword === kw && kw.length > 0) {
          const targetChar = entry.characterName;
          imagesList.forEach(img => {
            if (img.characterName && img.characterName === targetChar) {
              if (!matches.some(m => m.id === img.id)) {
                matches.push(img);
              }
            }
          });
        }
      });
      // 2. Fallback to characterName exact match
      imagesList.forEach(img => {
        if (img.characterName && img.characterName === kw) {
          if (!matches.some(m => m.id === img.id)) {
            matches.push(img);
          }
        }
      });
      return shuffleArray(matches);
    };

    const selectRandomImageForKw = (kw: string, excludeIds: Set<string> = new Set()): CharacterImage | null => {
      const pool = getImagesForKw(kw);
      if (pool.length === 0) return null;

      let candidates = pool.filter(img => !excludeIds.has(img.id));
      if (candidates.length === 0) {
        candidates = pool;
      }

      let freshCandidates = candidates.filter(img => !usedImageIds.has(img.id));
      if (freshCandidates.length === 0) {
        freshCandidates = candidates;
      }

      const selected = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
      if (selected) {
        usedImageIds.add(selected.id);
      }
      return selected;
    };

    const selectRandomRandomImage = (excludeIds: Set<string> = new Set()): CharacterImage | null => {
      if (imagesList.length === 0) return null;
      let candidates = imagesList.filter(img => !excludeIds.has(img.id));
      if (candidates.length === 0) candidates = imagesList;

      let freshCandidates = candidates.filter(img => !usedImageIds.has(img.id));
      if (freshCandidates.length === 0) freshCandidates = candidates;

      const selected = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
      if (selected) {
        usedImageIds.add(selected.id);
      }
      return selected;
    };

    const getVideosForKw = (kw: string): CharacterImage[] => {
      const matches: CharacterImage[] = [];
      dictList.forEach(entry => {
        if (entry.keyword === kw && kw.length > 0) {
          const targetChar = entry.characterName;
          videos.forEach(vid => {
            if (vid.characterName && vid.characterName === targetChar) {
              if (!matches.some(m => m.id === vid.id)) {
                matches.push(vid);
              }
            }
          });
        }
      });
      videos.forEach(vid => {
        if (vid.characterName && vid.characterName === kw) {
          if (!matches.some(m => m.id === vid.id)) {
            matches.push(vid);
          }
        }
      });
      return shuffleArray(matches);
    };

    const resolveMediaForKw = (kw: string, preferVideo: boolean, excludeIds: Set<string> = new Set()): { id: string; keyword: string } | null => {
      const imgPool = getImagesForKw(kw);
      const isBg = isBackgroundKw(kw);
      const videoPool = isBg ? [] : getVideosForKw(kw);

      const findBestInPool = (pool: Array<{ id: string }>) => {
        if (pool.length === 0) return null;
        let candidates = pool.filter(item => !excludeIds.has(item.id));
        if (candidates.length === 0) candidates = pool;

        let freshCandidates = candidates.filter(item => !usedImageIds.has(item.id));
        if (freshCandidates.length === 0) freshCandidates = candidates;

        const selected = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
        if (selected) {
          usedImageIds.add(selected.id);
        }
        return selected;
      };

      if (preferVideo) {
        const videoRes = findBestInPool(videoPool);
        if (videoRes) return { id: videoRes.id, keyword: kw };

        const imgRes = findBestInPool(imgPool);
        if (imgRes) return { id: imgRes.id, keyword: kw };
      } else {
        const imgRes = findBestInPool(imgPool);
        if (imgRes) return { id: imgRes.id, keyword: kw };

        const videoRes = findBestInPool(videoPool);
        if (videoRes) return { id: videoRes.id, keyword: kw };
      }

      return null;
    };

    const selectRandomRandomMedia = (excludeIds: Set<string> = new Set()): { id: string } | null => {
      const img = selectRandomRandomImage(excludeIds);
      if (img) return img;

      if (videos.length === 0) return null;
      let candidates = videos.filter(v => !excludeIds.has(v.id));
      if (candidates.length === 0) candidates = videos;
      
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      return selected || null;
    };

    // Merge the raw blocksList first to match the rendered merged blocks list
    let mergedBlocks: SubtitleBlock[] = [];
    const minChars = config.minSubChars !== undefined ? config.minSubChars : 40;
    
    if (minChars > 0 && blocksList.length > 0) {
      let i = 0;
      while (i < blocksList.length) {
        let currentBlock = { ...blocksList[i] };
        const constituentIds = [currentBlock.id];
        
        while (currentBlock.text.trim().length < minChars && i + 1 < blocksList.length) {
          i++;
          const nextBlock = blocksList[i];
          currentBlock.text = (currentBlock.text.trim() + " " + nextBlock.text.trim()).trim();
          currentBlock.endTime = nextBlock.endTime;
          constituentIds.push(nextBlock.id);
        }
        
        if (currentBlock.text.trim().length < minChars && mergedBlocks.length > 0) {
          const lastIdx = mergedBlocks.length - 1;
          mergedBlocks[lastIdx].text = (mergedBlocks[lastIdx].text.trim() + " " + currentBlock.text.trim()).trim();
          mergedBlocks[lastIdx].endTime = currentBlock.endTime;
          
          const lastBlock = mergedBlocks[lastIdx] as any;
          if (lastBlock.constituentIds) {
            lastBlock.constituentIds.push(...constituentIds);
          }
        } else {
          (currentBlock as any).constituentIds = constituentIds;
          mergedBlocks.push(currentBlock);
        }
        i++;
      }
    } else {
      mergedBlocks = blocksList.map(b => ({ ...b, constituentIds: [b.id] }));
    }

    const resultMerged: SubtitleBlock[] = [];

    for (let i = 0; i < mergedBlocks.length; i++) {
      const block = mergedBlocks[i];
      
      // If block was manually overridden or uploaded directly by the user, preserve it!
      if (block.isManualMatch) {
        resultMerged.push(block);
        continue;
      }

      const characterToImages: Record<string, CharacterImage[]> = {};
      const characterToMatchedRawKeywords: Record<string, Set<string>> = {};
      
      // 1. Match from characterName
      imagesList.forEach(img => {
        if (img.characterName && img.characterName !== 'Không có nhân vật' && img.characterName !== 'Tất cả') {
          if (isKeywordMatch(block.text, img.characterName)) {
            const charName = img.characterName;
            if (!characterToImages[charName]) {
              characterToImages[charName] = [];
            }
            if (!characterToImages[charName].some(x => x.id === img.id)) {
              characterToImages[charName].push(img);
            }
            if (!characterToMatchedRawKeywords[charName]) {
              characterToMatchedRawKeywords[charName] = new Set();
            }
            characterToMatchedRawKeywords[charName].add(charName);
          }
        }
      });

      // 1b. Match from characterName in videos as well
      (videos || []).forEach(vid => {
        if (vid.characterName && vid.characterName !== 'Không có nhân vật' && vid.characterName !== 'Tất cả') {
          if (isKeywordMatch(block.text, vid.characterName)) {
            const charName = vid.characterName;
            if (!characterToImages[charName]) {
              characterToImages[charName] = [];
            }
            if (!characterToMatchedRawKeywords[charName]) {
              characterToMatchedRawKeywords[charName] = new Set();
            }
            characterToMatchedRawKeywords[charName].add(charName);
          }
        }
      });

      // 2. Match from dictionary rules
      dictList.forEach(entry => {
        const dictKw = entry.keyword;
        if (isKeywordMatch(block.text, dictKw) && dictKw.length > 0) {
          const targetChar = entry.characterName;
          if (targetChar) {
            const charImages = imagesList.filter(img => 
              img.characterName && img.characterName === targetChar
            );
            const charVideos = (videos || []).filter(vid =>
              vid.characterName && vid.characterName === targetChar
            );
            if (!characterToImages[targetChar]) {
              characterToImages[targetChar] = [];
            }
            charImages.forEach(img => {
              if (!characterToImages[targetChar].some(existing => existing.id === img.id)) {
                characterToImages[targetChar].push(img);
              }
            });
            if (!characterToMatchedRawKeywords[targetChar]) {
              characterToMatchedRawKeywords[targetChar] = new Set();
            }
            characterToMatchedRawKeywords[targetChar].add(dictKw);
          }
        }
      });

      // Prune characters with exactly 0 images and 0 videos
      Object.keys(characterToImages).forEach(charName => {
        const hasImages = characterToImages[charName] && characterToImages[charName].length > 0;
        const hasVideos = (videos || []).some(vid => vid.characterName && vid.characterName === charName);
        if (!hasImages && !hasVideos) {
          delete characterToImages[charName];
          delete characterToMatchedRawKeywords[charName];
        }
      });

      const keywordToImages: Record<string, CharacterImage[]> = characterToImages;
      let matchedKeywords = Object.keys(characterToImages);
      matchedKeywords.sort((a, b) => {
        const rawKwsA = characterToMatchedRawKeywords[a] ? Array.from(characterToMatchedRawKeywords[a]) : [a];
        const rawKwsB = characterToMatchedRawKeywords[b] ? Array.from(characterToMatchedRawKeywords[b]) : [b];

        const getFirstPosition = (kws: string[]) => {
          let minIdx = 999999;
          kws.forEach(kw => {
            const idx = block.text.toLowerCase().indexOf(kw.toLowerCase());
            if (idx !== -1 && idx < minIdx) {
              minIdx = idx;
            }
          });
          return minIdx;
        };

        const posA = getFirstPosition(rawKwsA);
        const posB = getFirstPosition(rawKwsB);
        return posA - posB;
      });

      let isFallbackBlockVal = false;

      // If it is the first block (index 0) and has no matching keywords, default to the most frequent keyword in srt
      if (i === 0 && matchedKeywords.length === 0 && sortedKws.length > 0) {
        const topKw = sortedKws[0];
        const topKwImages = getImagesForKw(topKw);
        if (topKwImages.length > 0) {
          keywordToImages[topKw] = topKwImages;
          matchedKeywords = [topKw];
          isFallbackBlockVal = true;
        }
      }

      // If we already have AI prediction and there are no direct matched keywords, use the AI matched keywords list to select fresh random media!
      if (block.isAiPredicted && matchedKeywords.length === 0 && block.matchedKeywordsList && block.matchedKeywordsList.length > 0) {
        matchedKeywords = block.matchedKeywordsList;
      }

      let leftImgId: string | undefined = undefined;
      let rightImgId: string | undefined = undefined;
      let leftKw: string | undefined = undefined;
      let rightKw: string | undefined = undefined;
      let matchedKwsList: string[] | undefined = undefined;
      let matchedImgIds: string[] | undefined = undefined;
      let inheritanceDist = 0;

      const checkShouldPairForKw = (b: SubtitleBlock): boolean => {
        const mode = config?.singleKeywordMode || 'pair';
        if (mode === 'no_split') return false;
        if (mode === 'pair') return true;
        if (mode === 'single') return false;
        
        // Use hash of block id, text, and startTime to guarantee unique and stable seed
        const idStr = String(b.id || '');
        const textStr = String(b.text || '');
        const timeStr = String(b.startTime || '');
        let hash = 0;
        const combined = `${idStr}|${textStr}|${timeStr}`;
        for (let i = 0; i < combined.length; i++) {
          hash = (hash << 5) - hash + combined.charCodeAt(i);
          hash |= 0;
        }
        const seed = Math.abs(hash) % 100;

        if (mode === 'percent_50_50') return seed < 50;
        if (mode === 'percent_25_75') return seed < 25;
        if (mode === 'percent_75_25') return seed < 75;
        return true;
      };

      const isNoSplit = config?.singleKeywordMode === 'no_split';

      const isPriorityBlock = config.videoPriorityBlocks && (() => {
        const digits = config.videoPriorityBlocks.split(',').map(s => s.trim()).filter(Boolean);
        const blockIdStr = String(block.id);
        return digits.some(digit => blockIdStr.endsWith(digit));
      })();

      const shouldPreferVideo = !!isPriorityBlock;

      const detectedBlockChars = getDetectedCharactersForBlock(block.text);

      if (i === 0 && detectedBlockChars.size === 0 && sortedKws.length > 0) {
        const topKw = sortedKws[0];
        detectedBlockChars.add(topKw);
        isFallbackBlockVal = true;
      }

      if (block.isAiPredicted && detectedBlockChars.size === 0 && block.matchedKeywordsList && block.matchedKeywordsList.length > 0) {
        block.matchedKeywordsList.forEach(kw => detectedBlockChars.add(kw));
      }

      if (detectedBlockChars.size > 0) {
        const candidates = getBestMediaForBlock(detectedBlockChars, shouldPreferVideo);
        if (candidates.length > 0) {
          const firstCandidate = candidates[0];
          leftImgId = firstCandidate.item.id;
          leftKw = firstCandidate.item.characterName || Array.from(detectedBlockChars)[0];
          matchedImgIds = [firstCandidate.item.id];
          matchedKwsList = [leftKw];
          inheritanceDist = 0;

          const shouldPair = checkShouldPairForKw(block);
          if (shouldPair && !isNoSplit) {
            let secondCandidate = candidates.find(c => c.item.id !== firstCandidate.item.id);
            if (!secondCandidate) {
              const fallbackCandidates = getBestMediaForBlock(detectedBlockChars, shouldPreferVideo, new Set([firstCandidate.item.id]));
              if (fallbackCandidates.length > 0) {
                secondCandidate = fallbackCandidates[0];
              }
            }
            const secondMedia = secondCandidate ? secondCandidate.item : firstCandidate.item;
            rightImgId = secondMedia.id;
            rightKw = secondMedia.characterName || leftKw;
            matchedImgIds.push(secondMedia.id);
            matchedKwsList.push(rightKw);
          } else {
            rightImgId = undefined;
            rightKw = undefined;
          }
        } else {
          const fallback1 = selectRandomRandomMedia();
          const fallback2 = selectRandomRandomMedia(new Set([fallback1?.id].filter(Boolean) as string[]));
          const shouldPair = checkShouldPairForKw(block);
          const firstKw = Array.from(detectedBlockChars)[0] || "";
          if (fallback1) {
            leftImgId = fallback1.id;
            leftKw = firstKw;
            matchedImgIds = [fallback1.id];
            matchedKwsList = [firstKw];
            if (shouldPair && fallback2 && !isNoSplit) {
              rightImgId = fallback2.id;
              rightKw = firstKw;
              matchedImgIds.push(fallback2.id);
              matchedKwsList.push(firstKw);
            } else {
              rightImgId = undefined;
              rightKw = undefined;
            }
          }
          inheritanceDist = 0;
        }
      } else {
        // Inherit from previous block up to 5 consecutive levels (excluding background keywords)
        const prevBlock = i > 0 ? resultMerged[i - 1] : null;
        const legacyKws: string[] = [];
        if (prevBlock) {
          const prevBlockAssignedImages = imagesList.filter(img => 
            prevBlock.matchedImageIds?.includes(img.id) ||
            img.id === prevBlock.matchedLeftImageId ||
            img.id === prevBlock.matchedRightImageId
          );
          const prevBlockCharNames = Array.from(new Set(
            prevBlockAssignedImages.map(img => img.characterName).filter(Boolean) as string[]
          )).filter(name => !isBackgroundKw(name));

          const prevBlockVideoCharNames = Array.from(new Set(
            (videos || []).filter(vid => 
              prevBlock.matchedImageIds?.includes(vid.id) ||
              vid.id === prevBlock.matchedLeftImageId ||
              vid.id === prevBlock.matchedRightImageId
            ).map(vid => vid.characterName).filter(Boolean) as string[]
          )).filter(name => !isBackgroundKw(name));

          legacyKws.push(...Array.from(new Set([...prevBlockCharNames, ...prevBlockVideoCharNames])));
        }
        const containsTop5 = legacyKws.some(kw => 
          top5Kws.some(tk => tk.toLowerCase() === kw.toLowerCase())
        );
        const canInherit = prevBlock && 
                           !prevBlock.isFallbackBlock && 
                           (containsTop5 || (prevBlock.inheritanceDistance ?? 0) < 5) && 
                           legacyKws.length > 0;

        if (canInherit && prevBlock) {
          const prevUsedIds = new Set([
            prevBlock.matchedLeftImageId,
            prevBlock.matchedRightImageId,
            ...(prevBlock.matchedImageIds || [])
          ].filter(Boolean) as string[]);

          if (legacyKws.length >= 2) {
            if (isNoSplit) {
              const seedIndex = Math.floor(Math.random() * legacyKws.length);
              const kw = legacyKws[seedIndex];
              const media = resolveMediaForKw(kw, shouldPreferVideo, prevUsedIds);
              if (media) {
                leftImgId = media.id;
                leftKw = kw;
                matchedKwsList = [kw];
                rightImgId = undefined;
                rightKw = undefined;
                matchedImgIds = [media.id];
              } else {
                const fallback = selectRandomRandomMedia(prevUsedIds);
                if (fallback) {
                  leftImgId = fallback.id;
                  leftKw = kw;
                  matchedKwsList = [kw];
                  rightImgId = undefined;
                  rightKw = undefined;
                  matchedImgIds = [fallback.id];
                }
              }
            } else {
              const selectedMediaForKws: { id: string; keyword: string }[] = [];
              const usedMediaIdsForBlock = new Set<string>();

              const slicedKws = legacyKws.slice(0, 4);
              slicedKws.forEach(kw => {
                const combinedExcludes = new Set([...prevUsedIds, ...usedMediaIdsForBlock]);
                const media = resolveMediaForKw(kw, shouldPreferVideo, combinedExcludes);
                if (media) {
                  selectedMediaForKws.push(media);
                  usedMediaIdsForBlock.add(media.id);
                }
              });

              if (selectedMediaForKws.length >= 2) {
                leftImgId = selectedMediaForKws[0].id;
                rightImgId = selectedMediaForKws[selectedMediaForKws.length - 1].id;
                leftKw = selectedMediaForKws[0].keyword;
                rightKw = selectedMediaForKws[selectedMediaForKws.length - 1].keyword;
                matchedKwsList = selectedMediaForKws.map(m => m.keyword);
                matchedImgIds = selectedMediaForKws.map(m => m.id);
              } else if (selectedMediaForKws.length === 1) {
                const media1 = selectedMediaForKws[0];
                const shouldPair = checkShouldPairForKw(block);
                leftImgId = media1.id;
                leftKw = media1.keyword;
                matchedKwsList = [media1.keyword];
                if (shouldPair) {
                  const combinedExcludes = new Set([...prevUsedIds, media1.id]);
                  const media2 = resolveMediaForKw(media1.keyword, shouldPreferVideo, combinedExcludes) || media1;
                  rightImgId = media2.id;
                  rightKw = media1.keyword;
                  matchedImgIds = [media1.id, media2.id];
                  matchedKwsList = [media1.keyword, media1.keyword];
                } else {
                  rightImgId = undefined;
                  rightKw = undefined;
                  matchedImgIds = [media1.id];
                }
              }
            }
          } else {
            const kw = legacyKws[0];
            const media1 = resolveMediaForKw(kw, shouldPreferVideo, prevUsedIds);
            if (media1) {
              const shouldPair = checkShouldPairForKw(block);
              leftImgId = media1.id;
              leftKw = kw;
              matchedKwsList = [kw];
              if (shouldPair) {
                const combinedExcludes = new Set([...prevUsedIds, media1.id]);
                const media2 = resolveMediaForKw(kw, shouldPreferVideo, combinedExcludes) || media1;
                rightImgId = media2.id;
                rightKw = kw;
                matchedImgIds = [media1.id, media2.id];
                matchedKwsList = [kw, kw];
              } else {
                rightImgId = undefined;
                rightKw = undefined;
                matchedImgIds = [media1.id];
              }
            } else {
              const fallback1 = selectRandomRandomMedia(prevUsedIds);
              const fallback2 = selectRandomRandomMedia(new Set([...prevUsedIds, fallback1?.id].filter(Boolean) as string[]));
              const shouldPair = checkShouldPairForKw(block);
              if (fallback1) {
                leftImgId = fallback1.id;
                leftKw = kw;
                matchedKwsList = [kw];
                if (shouldPair && fallback2) {
                  rightImgId = fallback2.id;
                  rightKw = kw;
                  matchedImgIds = [fallback1.id, fallback2.id];
                  matchedKwsList = [kw, kw];
                } else {
                  rightImgId = undefined;
                  rightKw = undefined;
                  matchedImgIds = [fallback1.id];
                }
              }
            }
          }

          inheritanceDist = (prevBlock.inheritanceDistance ?? 0) + 1;
          isFallbackBlockVal = false;
        } else {
          // Fallback utilizing a random subset of the top 5 frequent keywords
          isFallbackBlockVal = true;
          const poolKws = top5Kws.length > 0 ? top5Kws : [imagesList[0]?.characterName || imagesList[0]?.keywords?.[0] || ""].filter(Boolean);
          
          let availableFallbackKws = poolKws;
          if (prevBlock) {
            const prevBlockKws = new Set<string>();
            if (prevBlock.matchedLeftKeyword) prevBlockKws.add(prevBlock.matchedLeftKeyword.toLowerCase());
            if (prevBlock.matchedRightKeyword) prevBlockKws.add(prevBlock.matchedRightKeyword.toLowerCase());
            if (prevBlock.matchedKeywordsList) {
              prevBlock.matchedKeywordsList.forEach(k => prevBlockKws.add(k.toLowerCase()));
            }
            availableFallbackKws = poolKws.filter(k => !prevBlockKws.has(k.toLowerCase()));
            if (availableFallbackKws.length === 0) {
              availableFallbackKws = poolKws; // fallback if all are excluded
            }
          }

          // Pick exactly one random keyword
          const fallbackKw = availableFallbackKws.length > 0
            ? availableFallbackKws[Math.floor(Math.random() * availableFallbackKws.length)]
            : "";

          const mediaSelected = fallbackKw ? (resolveMediaForKw(fallbackKw, shouldPreferVideo) || selectRandomRandomMedia()) : selectRandomRandomMedia();
          const shouldPair = checkShouldPairForKw(block);
          
          leftImgId = mediaSelected?.id;
          leftKw = fallbackKw || undefined;
          
          if (shouldPair && mediaSelected) {
            const media2 = fallbackKw 
              ? (resolveMediaForKw(fallbackKw, shouldPreferVideo, new Set([mediaSelected.id])) || mediaSelected) 
              : (selectRandomRandomMedia(new Set([mediaSelected.id])) || mediaSelected);
            rightImgId = media2.id;
            rightKw = fallbackKw || undefined;
            matchedImgIds = [mediaSelected.id, media2.id];
            matchedKwsList = fallbackKw ? [fallbackKw, fallbackKw] : [];
          } else {
            rightImgId = undefined;
            rightKw = undefined;
            matchedImgIds = mediaSelected ? [mediaSelected.id] : [];
            matchedKwsList = fallbackKw ? [fallbackKw] : [];
          }
          inheritanceDist = 0;
        }
      }

      if (matchedKeywords.length > 0) {
        matchedKwsList = matchedKeywords;
      }

      // Enforce unique single-video block rule: "Khi 1 đoạn được xác định có video, thì video đó sẽ là video duy nhất."
      // Only character keyword videos stand alone. Background videos can show in split/paired layouts.
      const allSelectedIds = [leftImgId, rightImgId, ...(matchedImgIds || [])].filter(Boolean) as string[];
      const firstVideoId = allSelectedIds.find(id => {
        const videoObj = videos.find(v => v.id === id);
        if (!videoObj) return false;
        const isBg = videoObj.characterName ? backgroundNames.some(bg => bg === videoObj.characterName) : false;
        return !isBg;
      });
      if (firstVideoId) {
        let associatedKw: string | undefined = undefined;
        if (firstVideoId === leftImgId) {
          associatedKw = leftKw;
        } else if (firstVideoId === rightImgId) {
          associatedKw = rightKw;
        } else if (matchedImgIds && matchedKwsList) {
          const idx = matchedImgIds.indexOf(firstVideoId);
          if (idx !== -1 && idx < matchedKwsList.length) {
            associatedKw = matchedKwsList[idx];
          }
        }
        
        if (!associatedKw) {
          const vidObj = videos.find(v => v.id === firstVideoId);
          associatedKw = vidObj?.characterName || leftKw || rightKw;
        }

        leftImgId = firstVideoId;
        rightImgId = undefined;
        leftKw = associatedKw;
        rightKw = undefined;
        matchedKwsList = associatedKw ? [associatedKw] : undefined;
        matchedImgIds = [firstVideoId];
      }

      // Enforce unique character restriction: Keep at most one image/video per unique character name
      // BUT bypass this when it is a single-keyword block that is configured to be paired
      if (matchedImgIds && matchedImgIds.length > 0) {
        const blockKws = Array.from(new Set([
          leftKw,
          rightKw,
          ...(matchedKwsList || [])
        ].filter(Boolean) as string[]));
        const isSingleKwBlock = blockKws.length <= 1;
        const shouldBypassCharRestriction = isSingleKwBlock && checkShouldPairForKw(block);

        const seenChars = new Set<string>();
        const uniqueIds: string[] = [];
        for (const id of matchedImgIds) {
          const img = imagesList.find(x => x.id === id);
          const vid = videos.find(x => x.id === id);
          const charName = img?.characterName || vid?.characterName;
          if (charName && charName !== 'Không có nhân vật' && charName !== 'Tất cả' && charName !== 'Không có') {
            const lower = charName.toLowerCase();
            if (seenChars.has(lower) && !shouldBypassCharRestriction) {
              continue;
            }
            seenChars.add(lower);
          }
          uniqueIds.push(id);
        }
        matchedImgIds = uniqueIds;
        // Keep left and right IDs aligned in case they are set
        if (leftImgId && !matchedImgIds.includes(leftImgId)) {
          leftImgId = matchedImgIds[0] || undefined;
          leftKw = leftImgId ? (imagesList.find(x => x.id === leftImgId)?.characterName || videos.find(x => x.id === leftImgId)?.characterName) : undefined;
        }
        if (rightImgId && !matchedImgIds.includes(rightImgId)) {
          rightImgId = matchedImgIds[1] || undefined;
          rightKw = rightImgId ? (imagesList.find(x => x.id === rightImgId)?.characterName || videos.find(x => x.id === rightImgId)?.characterName) : undefined;
        }
      }

      resultMerged.push({
        ...block,
        matchedLeftImageId: leftImgId,
        matchedRightImageId: undefined,
        matchedLeftKeyword: leftKw,
        matchedRightKeyword: undefined,
        matchedKeywordsList: leftKw ? [leftKw] : undefined,
        matchedImageIds: leftImgId ? [leftImgId] : undefined,
        isAiPredicted: block.isAiPredicted || false,
        aiExplanation: block.aiExplanation,
        inheritanceDistance: inheritanceDist,
        isFallbackBlock: isFallbackBlockVal
      });
    }

    const resultRaw = blocksList.map(rawBlock => {
      const mergedBlock = resultMerged.find(m => {
        const constituentIds = (m as any).constituentIds as number[] | undefined;
        if (constituentIds) {
          return constituentIds.includes(rawBlock.id);
        }
        return rawBlock.startTime >= m.startTime - 0.001 && rawBlock.endTime <= m.endTime + 0.001;
      });

      if (mergedBlock) {
        return {
          ...rawBlock,
          matchedLeftImageId: mergedBlock.matchedLeftImageId,
          matchedRightImageId: mergedBlock.matchedRightImageId,
          matchedLeftKeyword: mergedBlock.matchedLeftKeyword,
          matchedRightKeyword: mergedBlock.matchedRightKeyword,
          matchedImageIds: mergedBlock.matchedImageIds,
          matchedKeywordsList: mergedBlock.matchedKeywordsList,
          isManualMatch: mergedBlock.isManualMatch,
          isAiPredicted: mergedBlock.isAiPredicted,
          aiExplanation: mergedBlock.aiExplanation,
          inheritanceDistance: mergedBlock.inheritanceDistance,
          isFallbackBlock: mergedBlock.isFallbackBlock
        };
      }
      return rawBlock;
    });

    setSubtitles(resultRaw);
  };

  const handleSubtitlesMatched = (updatedBlocks: SubtitleBlock[]) => {
    // Map modified properties of merged blocks back to the raw block level so that their state is correctly retained
    setSubtitles(prevRaw => {
      return prevRaw.map(rawBlock => {
        const mergedBlock = updatedBlocks.find(m => {
          const constituentIds = (m as any).constituentIds as number[] | undefined;
          if (constituentIds) {
            return constituentIds.includes(rawBlock.id);
          }
          return rawBlock.startTime >= m.startTime - 0.001 && rawBlock.endTime <= m.endTime + 0.001;
        });

        if (mergedBlock) {
          return {
            ...rawBlock,
            matchedLeftImageId: mergedBlock.matchedLeftImageId,
            matchedRightImageId: mergedBlock.matchedRightImageId,
            matchedLeftKeyword: mergedBlock.matchedLeftKeyword,
            matchedRightKeyword: mergedBlock.matchedRightKeyword,
            matchedImageIds: mergedBlock.matchedImageIds,
            matchedKeywordsList: mergedBlock.matchedKeywordsList,
            isManualMatch: mergedBlock.isManualMatch,
            isAiPredicted: mergedBlock.isAiPredicted,
            aiExplanation: mergedBlock.aiExplanation,
            inheritanceDistance: mergedBlock.inheritanceDistance,
            isFallbackBlock: mergedBlock.isFallbackBlock
          };
        }
        return rawBlock;
      });
    });
  };

  const handlePreviewTimeSelect = (time: number) => {
    setPreviewTime(time);
  };

  return (
    <div className="min-h-screen bg-[#1c2022] text-[#E2E8F0] font-sans selection:bg-emerald-500/30 selection:text-white" id="main-app-container">
      {/* Sleek Header */}
      <header className="border-b border-emerald-500/15 bg-[#24292d]/95 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Left Side: Navigation items (Swapped) */}
          <div className="flex flex-wrap items-center gap-3 order-2 sm:order-1">
            <button
              onClick={handleReloadAll}
              className="flex items-center gap-1.5 bg-rose-650 hover:bg-rose-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg border border-rose-500/10 active:scale-95 transition-all shadow-md uppercase tracking-wider cursor-pointer"
              title="Khôi phục trạng thái ban đầu để làm video mới"
              id="header-reload-all-btn"
            >
              <RefreshCw size={13} className="animate-spin-slow" />
              <span>RELOAD ALL</span>
            </button>

            {/* Kho Anh Trigger folder */}
            <button
              onClick={() => setIsKhoAnhOpen(true)}
              className="flex items-center gap-1.5 bg-[#2a1d0b] text-amber-400 hover:bg-[#3c2a10] font-bold text-xs px-4 py-2.5 rounded-lg border border-amber-500/20 active:scale-95 transition-all shadow-md"
              title="Kho ảnh nhân vật"
              id="header-kho-anh-btn"
            >
              <FolderLock size={14} />
              <span>KHO ẢNH ({images.length})</span>
            </button>

            {/* Custom Settings Trigger gear */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-850 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-lg border border-white/5 transition-all shadow-md"
              title="Cài đặt Video &amp; mật độ phụ đề"
              id="header-settings-btn"
            >
              <Settings size={14} className="hover:rotate-45 transition-transform" />
              <span>Cài đặt Video</span>
            </button>
          </div>

          {/* Right Side: Title Block and icon (Swapped) */}
          <div className="flex items-center gap-3 order-1 sm:order-2">
            <div className="text-right sm:text-right">
              <h1 className="text-md font-bold tracking-tight text-white flex items-center justify-end flex-wrap gap-2">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">NGUYỄN THÀNH NHÂN</span>
                NOT VIDEO V-SYNC ENGINE
              </h1>
              <p className="text-[10px] text-white/45 mt-0.5 uppercase tracking-wider font-mono">
                Tactical Frame Syncing Suite • Secure Offline IndexedDB Engine
              </p>
            </div>
            <div className="p-2 bg-emerald-600 text-black rounded-lg flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Film size={18} className="animate-pulse" />
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-8">
            
            {/* Step-by-Step simplified flow coordinator */}
            {!hasProcessed ? (
              <div className="max-w-xl mx-auto bg-[#0d1113] border border-emerald-500/10 rounded-2xl p-8 shadow-2xl space-y-6" id="simplified-start-card">
                <div className="text-center space-y-2">
                  <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase bg-emerald-500/10 px-3 py-1 rounded-full">
                    BƯỚC 1: NẠP TÀI NGUYÊN GỐC
                  </span>
                  <h2 className="text-base font-bold text-white">Nạp tệp Phụ đề & Âm thanh</h2>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Tải lên tệp phụ đề <code className="bg-slate-900 text-white px-1 py-0.5 rounded text-[10px] font-mono">.srt</code> và audio thuyết minh <code className="bg-slate-900 text-white px-1 py-0.5 rounded text-[10px] font-mono">.mp3</code> tương ứng. Bạn có thể nạp hoặc quản lý Kho ảnh bằng cách bấm nút <span className="font-bold text-sky-400">KHO ẢNH</span> phía trên bất cứ lúc nào!
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Audio File Loader */}
                  <AudioLoader
                    audioFile={audioFile}
                    audioDuration={audioDuration}
                    onAudioLoaded={handleAudioLoaded}
                    onClearAudio={handleClearAudio}
                  />

                  {/* Subtitle File Loader */}
                  <SrtLoader
                    srtFile={srtFile}
                    subtitles={subtitles}
                    onSubtitlesLoaded={handleSubtitlesLoaded}
                    onClearSubtitles={handleClearSubtitles}
                  />
                </div>

                {images.length === 0 && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] rounded-xl flex items-start gap-2">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>Kho ảnh hiện tại trống. Vui lòng bấm vào <strong>KHO ẢNH</strong> trên thanh công cụ để tạo danh sách nhóm nhân vật và nạp ảnh trước khi xử lý video!</span>
                  </div>
                )}

                {images.length > 0 && missingCharacters.length > 0 && (
                  <div 
                    onClick={() => setShowMissingImagesModal(true)}
                    className="p-3.5 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 hover:border-amber-500/30 text-amber-300 text-[11px] rounded-xl flex items-start gap-2.5 cursor-pointer transition-all active:scale-[0.99] select-none shadow animate-in fade-in"
                  >
                    <Sparkles size={14} className="shrink-0 mt-0.5 text-amber-400" />
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5 text-amber-300">
                        <span>Thiếu ảnh nhân vật kịch bản!</span>
                        <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">Bổ sung</span>
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                        Có {missingCharacters.length} nhân vật được đề cập trong phụ đề srt ({missingCharacters.map(c => c.characterName).slice(0, 3).join(', ')}{missingCharacters.length > 3 ? '...' : ''}) nhưng chưa có ảnh nào trong Kho ảnh. Bấm để thêm nhanh!
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!audioFile || subtitles.length === 0}
                  onClick={() => {
                    if (images.length === 0) {
                      alert("⚠️ Kho ảnh hiện đang trống! Hãy bấm nút 'KHO ẢNH' ở trên góc phải để thêm ít nhất 1 nhân vật và nạp danh sách ảnh nhé!");
                      setIsKhoAnhOpen(true);
                      return;
                    }
                    const missing = checkMissingCharacterImages(subtitles, images, dictionary);
                    if (missing.length > 0 && !bypassMissingCheck) {
                      setMissingCharacters(missing);
                      setShowMissingImagesModal(true);
                      setBypassMissingCheck(true);
                      return;
                    }
                    // Generate a fresh random seed automatically to shuffle behavior positions and styles completely across videos!
                    const newSeed = Math.floor(Math.random() * 1000000);
                    const { randomPresetId, randomGroup } = getRandomPresetAndGroup();
                    setConfig(prev => ({
                      ...prev,
                      behaviorSeed: newSeed,
                      activePresetId: randomPresetId,
                      activeEffectGroup: randomGroup
                    }));

                    // Trigger match automatically on processing
                    remapSubtitles(subtitles, getNormalizedImages);
                    setHasProcessed(true);
                  }}
                  className={`w-full py-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all transition-transform active:scale-[0.98] ${
                    audioFile && subtitles.length > 0
                      ? 'bg-emerald-600 text-black shadow-lg shadow-emerald-500/15 hover:bg-emerald-500'
                      : 'bg-zinc-900 border border-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  <Cpu size={14} />
                  <span>XỬ LÝ VIDEO</span>
                </button>
              </div>
            ) : (
              /* Step 2 Workspace panel revealed on process matching */
              <div className="space-y-8 animate-in fade-in duration-200" id="step2-workspace">
                <div className="flex items-center justify-between bg-[#24292d] border border-emerald-500/15 px-5 py-3 rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.4)] animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    <span className="text-[11px] font-bold text-emerald-400 font-mono tracking-wider uppercase">BƯỚC 2: LIÊN KẾT PHỤ ĐỀ & KIỂM TRA PREVIEW [ACTIVE CONSOLE]</span>
                  </div>
                  <button
                    onClick={() => setHasProcessed(false)}
                    className="text-[10px] font-bold text-zinc-400 hover:text-white px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 rounded-md transition-all border border-emerald-500/10"
                  >
                    ← Chọn Lại File SRT & MP3
                  </button>
                </div>

                {/* Video Preview and Video Exporter Side-by-Side in the Same Row! */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  
                  {/* Visual Realtime Preview Monitor */}
                  <VideoPreviewSection
                    subtitles={displaySubtitles}
                    images={getNormalizedImages}
                    videos={videos}
                    audioFile={audioFile}
                    audioDuration={audioDuration}
                    config={config}
                    onConfigChange={setConfig}
                    previewTime={previewTime}
                    onPreviewTimeSelect={setPreviewTime}
                    bgMusicFiles={bgMusicFiles}
                    presets={presets}
                    onUpdatePresets={setPresets}
                  />

                  {/* Exporter Progress Bar & Formats */}
                  <VideoExporter
                    subtitles={displaySubtitles}
                    images={getNormalizedImages}
                    videos={videos}
                    audioFile={audioFile}
                    audioDuration={audioDuration}
                    config={config}
                    bgMusicFiles={bgMusicFiles}
                    presets={presets}
                  />

                </div>

                {/* Collapsible Timeline at the bottom */}
                <div className="border border-emerald-500/15 rounded-2xl bg-[#24292d] overflow-hidden shadow-xl" id="collapsible-timeline-panel">
                  <div 
                    onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                    className="flex items-center justify-between p-5 bg-[#17191b] hover:bg-[#202428] cursor-pointer select-none transition-colors border-b border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg flex items-center justify-center transition-all ${isTimelineExpanded ? 'bg-emerald-600 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Cpu size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          DÒNG THỜI GIAN
                          {!isTimelineExpanded && (
                            <span className="text-[10px] font-mono font-bold tracking-normal text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded uppercase shrink-0">
                              Bấm để mở rộng
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed font-sans">
                          Tổ chức kịch bản, thời lượng từng câu thoại, bóc tách nhân vật và lựa chọn hình ảnh split-screen thông minh
                        </p>
                      </div>
                    </div>
                    <div className="text-zinc-400 shrink-0">
                      {isTimelineExpanded ? (
                        <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded">
                          ĐANG HIỂN THỊ ▲
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-zinc-400 flex items-center gap-1 bg-zinc-800 px-2.5 py-1 rounded">
                          ĐANG ẨN ▼
                        </span>
                      )}
                    </div>
                  </div>

                  {isTimelineExpanded && (
                    <div className="p-5 bg-[#24292d]/50 animate-in fade-in slide-in-from-top-2 duration-300">
                      <SubtitleMatcher
                        subtitles={mergedSubtitles}
                        images={getNormalizedImages}
                        videos={videos}
                        config={config}
                        onSubtitlesMatched={handleSubtitlesMatched}
                        onPreviewTimeSelect={handlePreviewTimeSelect}
                        dictionary={dictionary}
                        onImagesAdded={handleImagesLoaded}
                        backgroundNames={backgroundNames}
                      />
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
      </main>

      {/* Settings Modal popover panel */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onConfigChange={setConfig}
        images={getNormalizedImages}
        onCustomBgUploaded={handleCustomBgUploaded}
        bgMusicFiles={bgMusicFiles}
        onAddBgMusic={handleAddBgMusic}
        onDeleteBgMusic={handleDeleteBgMusic}
        onUpdateBgMusicVolume={handleUpdateBgMusicVolume}
        audioFile={audioFile}
        onVideoConfigUploaded={handleVideoConfigUploaded}
        onVideoConfigRemoved={handleVideoConfigRemoved}
        presets={presets}
        onPresetsChange={setPresets}
      />

      {/* Kho Anh Modal popover catalog */}
      <KhoAnhModal
        isOpen={isKhoAnhOpen}
        onClose={() => setIsKhoAnhOpen(false)}
        images={getNormalizedImages}
        onImagesLoaded={handleImagesLoaded}
        onDeleteImage={handleSingleImageDelete}
        onDeleteCharacter={handleDeleteCharacter}
        onDeleteAllImagesOfCharacter={handleDeleteAllImagesOfCharacter}
        dictionary={dictionary}
        onUpdateDictionary={setDictionary}
        backgroundNames={backgroundNames}
        onUpdateBackgroundNames={setBackgroundNames}
        onClearAllImages={handleClearImages}
      />

      {/* Missing Character Images Warning Dialog */}
      <MissingCharacterImagesModal
        isOpen={showMissingImagesModal}
        onClose={() => {
          setShowMissingImagesModal(false);
          setBypassMissingCheck(true);
          if (subtitles.length > 0) {
            remapSubtitles(subtitles, getNormalizedImages, dictionary);
          }
        }}
        missingCharacters={missingCharacters}
        onImagesAdded={handleImagesLoaded}
        allImages={getNormalizedImages}
      />

      {showMismatchWarning && (
        <div id="mismatch-warning-overlay" className="fixed inset-0 bg-black/85 backdrop-blur-[6px] z-[9999] flex items-center justify-center p-4">
          <div id="mismatch-warning-card" className="bg-[#121215] border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-in scale-in duration-200">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider">Cảnh báo lệch thời gian tệp</h3>
            </div>
            
            <p className="text-xs text-white/70 leading-relaxed font-sans mb-5 col-span-2">
              Thời gian của phụ đề <span className="text-amber-400 font-mono font-bold">.srt</span> ({formatMismatchDuration(subtitles[subtitles.length - 1]?.endTime || 0)}) và tệp thuyết minh <span className="text-amber-400 font-mono font-bold">.mp3</span> ({formatMismatchDuration(audioDuration)}) đang lệch nhau quá <span className="text-red-400 font-semibold">10 giây</span> (lệch cụ thể: <span className="text-red-400 font-bold">{formatMismatchDuration(Math.abs(audioDuration - (subtitles[subtitles.length - 1]?.endTime || 0)))}</span>).
              <br /><br />
              Vui lòng kiểm tra kịch bản hoặc tệp âm thanh xem đã khớp hoàn toàn hay chưa để tránh lỗi hiển thị lệch hình, lệch tiếng trong video thành phẩm.
            </p>

            <div className="flex justify-end gap-3">
              <button
                id="btn-confirm-mismatch"
                onClick={() => {
                  setShowMismatchWarning(false);
                  setHasShownMismatchWarning(true);
                }}
                className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Xác nhận & Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Footer */}
      <footer className="border-t border-emerald-500/15 py-6 text-center text-[11px] text-white/40 mt-12 bg-[#0e1214]">
        <div>NOT VIDEO V-SYNC ENGINE • LOCAL RENDER ACCELERATION WITH BROWSER GPU</div>
        <div className="mt-1 opacity-70">Tối ưu hóa và đồng bộ hóa khung hình cao cấp, xử lý cục bộ trực tiếp trên trình duyệt web của bạn.</div>
      </footer>
    </div>
  );
}

export default function AppWrapped() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
