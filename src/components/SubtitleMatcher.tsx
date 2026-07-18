/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SubtitleBlock, CharacterImage, DictionaryRule, RenderConfig } from '../types';
import { Sparkles, Image as ImageIcon, CheckCircle, AlertCircle, RefreshCw, X, ArrowRight, Search, Play } from 'lucide-react';

// List of common English and Vietnamese stop words to ignore when extracting keywords, highlighting, and matching
const STOP_WORDS = new Set([
  'at', 'of', 'and', 'the', 'with', 'or', 'in', 'to', 'on', 'by', 'for', 'an', 'is', 'it', 'about', 'from', 'as', 
  'this', 'that', 'these', 'those', 'then', 'here', 'there', 'who', 'whom', 'where', 'when', 'why', 'how', 'which',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'not', 'no', 'yes', 'so', 'if', 'your',
  'my', 'their', 'our', 'his', 'her', 'its', 'me', 'you', 'he', 'she', 'they', 'we', 'us', 'him', 'them',
  'cua', 'va', 'trong', 'cho', 'nhu', 'nhung', 'co', 'nay', 'do', 'kia', 'của', 'và', 'trong', 'cho', 'như', 'những', 'có', 'này', 'đó', 'kia',
  'a', 'an', 'gh', 'thì', 'là', 'mà', 'gì', 'nào', 'với', 'về', 'để', 'cũng', 'đã', 'đang', 'sẽ', 'được', 'từ', 'qua', 'bởi', 'tại', 'ra', 'vào', 'lên', 'xuống', 'lại', 'thêm'
]);

// Fisher-Yates shuffle helper to ensure complete and robust randomness of local image arrays
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface SubtitleMatcherProps {
  subtitles: SubtitleBlock[];
  images: CharacterImage[];
  videos?: CharacterImage[];
  onSubtitlesMatched: (updatedBlocks: SubtitleBlock[]) => void;
  onPreviewTimeSelect?: (time: number) => void;
  dictionary?: DictionaryRule[];
  config?: RenderConfig;
  onImagesAdded?: (newImages: CharacterImage[], skipRemap?: boolean) => void;
  backgroundNames?: string[];
}

export default function SubtitleMatcher({
  subtitles,
  images,
  videos = [],
  onSubtitlesMatched,
  onPreviewTimeSelect,
  dictionary = [],
  config,
  onImagesAdded,
  backgroundNames = []
}: SubtitleMatcherProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [selectorPosition, setSelectorPosition] = useState<'left' | 'right'>('left');
  const [imageSelectorSearch, setImageSelectorSearch] = useState('');
  const [tryPreviewBlock, setTryPreviewBlock] = useState<SubtitleBlock | null>(null);

  // AI loading and suggestion states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [individualLoadingId, setIndividualLoadingId] = useState<number | null>(null); // To satisfy TS let's use number | null
  const [aiError, setAiError] = useState<string | null>(null);

  const getIndividualLoadingState = (id: number): boolean => {
    return individualLoadingId === id;
  };

  // 1. Highlight matched keywords in the subtitle text in yellow
  const renderHighlightedText = (textString: string, keywordsArr: string[] = []) => {
    if (!textString) return <span>{textString}</span>;

    const yellowSet = new Set<string>();
    const redSet = new Set<string>();

    const allCandidates = new Set<string>();
    dictionary.forEach(entry => {
      if (entry.keyword) allCandidates.add(entry.keyword);
      if (entry.characterName) allCandidates.add(entry.characterName);
    });
    images.forEach(img => {
      if (img.characterName && img.characterName !== 'Không có nhân vật' && img.characterName !== 'Tất cả') {
        allCandidates.add(img.characterName);
      }
    });
    (videos || []).forEach(vid => {
      if (vid.characterName && vid.characterName !== 'Không có nhân vật' && vid.characterName !== 'Tất cả') {
        allCandidates.add(vid.characterName);
      }
    });

    if (keywordsArr && keywordsArr.length > 0) {
      keywordsArr.forEach(kw => {
        const trimmed = kw.trim();
        if (!trimmed) return;
        yellowSet.add(trimmed);

        dictionary.forEach(entry => {
          if (entry.characterName && entry.characterName === trimmed) {
            yellowSet.add(entry.keyword);
          }
          if (entry.keyword && entry.keyword === trimmed && entry.characterName) {
            yellowSet.add(entry.characterName);
          }
        });
      });
    }

    allCandidates.forEach(cand => {
      const trimmed = cand.trim();
      if (!trimmed || STOP_WORDS.has(trimmed.toLowerCase())) return;
      if (yellowSet.has(trimmed)) return;

      if (isKeywordMatch(textString, trimmed)) {
        const targetCharacters = new Set<string>([trimmed]);
        dictionary.forEach(entry => {
          if (entry.keyword && entry.keyword === trimmed && entry.characterName) {
            targetCharacters.add(entry.characterName);
          }
          if (entry.characterName && entry.characterName === trimmed && entry.keyword) {
            targetCharacters.add(entry.keyword);
          }
        });

        const hasMedia = images.some(img => {
          const char = img.characterName || '';
          return char && targetCharacters.has(char);
        }) || (videos || []).some(vid => {
          const char = vid.characterName || '';
          return char && targetCharacters.has(char);
        });

        if (!hasMedia) {
          redSet.add(trimmed);
        }
      }
    });

    const sortedYellow = Array.from(yellowSet)
      .filter(Boolean)
      .map(k => k.trim())
      .filter(k => k.length > 0 && !STOP_WORDS.has(k.toLowerCase()))
      .sort((a, b) => b.length - a.length);

    const sortedRed = Array.from(redSet)
      .filter(Boolean)
      .map(k => k.trim())
      .filter(k => k.length > 0 && !STOP_WORDS.has(k.toLowerCase()))
      .sort((a, b) => b.length - a.length);

    const allSorted = [...sortedYellow, ...sortedRed].sort((a, b) => b.length - a.length);

    if (allSorted.length === 0) {
      return <span>{textString}</span>;
    }

    const pattern = allSorted
      .map(kw => kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
      .join('|');

    try {
      const regex = new RegExp(`(${pattern})`, 'g');
      const parts = textString.split(regex);
      return (
        <>
          {parts.map((part, index) => {
            const isYellow = sortedYellow.some(kw => kw === part);
            const isRed = sortedRed.some(kw => kw === part);
            if (isYellow) {
              return (
                <span key={index} className="text-yellow-400 bg-yellow-400/10 px-1 py-0.5 rounded font-bold border border-yellow-400/20 shadow-sm animate-pulse-subtle">
                  {part}
                </span>
              );
            } else if (isRed) {
              return (
                <span key={index} className="text-red-500 bg-red-500/10 px-1 py-0.5 rounded font-bold border border-red-500/20 shadow-sm animate-pulse-subtle">
                  {part}
                </span>
              );
            } else {
              return <span key={index}>{part}</span>;
            }
          })}
        </>
      );
    } catch (e) {
      return <span>{textString}</span>;
    }
  };

  // 2. Individual line suggestion via server-side Gemini Mime-response
  const handleIndividualAiSuggest = async (block: SubtitleBlock) => {
    if (images.length === 0) {
      alert("Vui lòng tải tệp ảnh nhân vật lên trước để AI có danh sách đối chiếu!");
      return;
    }

    setIndividualLoadingId(block.id);
    setAiError(null);

    try {
      const charactersMap: Record<string, Set<string>> = {};
      images.forEach(img => {
        if (!img.characterName) return;
        if (!charactersMap[img.characterName]) {
          charactersMap[img.characterName] = new Set();
        }
        if (img.keywords) {
          img.keywords.forEach(kw => {
            if (kw && kw.trim().length > 0) {
              charactersMap[img.characterName].add(kw.toLowerCase());
            }
          });
        }
      });

      const charactersPayload = Object.entries(charactersMap).map(([name, kwSet]) => ({
        name,
        keywords: Array.from(kwSet)
      }));

      const response = await fetch('/api/gemini/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtitles: [{ id: block.id, text: block.text }],
          characters: charactersPayload
        })
      });

      if (!response.ok) {
        let errMsg = `Lỗi máy chủ: Trả về trạng thái ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (!data || !data.suggestions) {
        throw new Error('Định dạng phản hồi AI không đồng bộ hợp lệ.');
      }

      const suggestions = data.suggestions as Array<{
        id: number;
        suggestedKeywords: string[];
        explanation?: string;
      }>;

      const suggestion = suggestions.find(s => s.id === block.id);
      if (suggestion && suggestion.suggestedKeywords && suggestion.suggestedKeywords.length > 0) {
        const suggestedKws = suggestion.suggestedKeywords.map(k => k.toLowerCase());
        
        let leftImgId = block.matchedLeftImageId;
        let rightImgId = block.matchedRightImageId;
        let leftKw = block.matchedLeftKeyword;
        let rightKw = block.matchedRightKeyword;

        const keywordToImages: Record<string, CharacterImage[]> = {};
        suggestedKws.forEach(kw => {
          const ruleMatchChars = new Set<string>();
          dictionary.forEach(entry => {
            if (entry.keyword.toLowerCase() === kw) {
              ruleMatchChars.add(entry.characterName);
            }
          });

          const matchingImages = images.filter(img => 
            img.characterName && (
              img.characterName.toLowerCase() === kw ||
              ruleMatchChars.has(img.characterName)
            )
          );
          if (matchingImages.length > 0) {
            keywordToImages[kw] = matchingImages;
          }
        });

        const matchedKeys = Object.keys(keywordToImages);
        matchedKeys.sort((a, b) => {
          const idxA = block.text.toLowerCase().indexOf(a.toLowerCase());
          const idxB = block.text.toLowerCase().indexOf(b.toLowerCase());
          const valA = idxA === -1 ? 999999 : idxA;
          const valB = idxB === -1 ? 999999 : idxB;
          return valA - valB;
        });
        const mode = config?.singleKeywordMode || 'pair';
        const isNoSplit = mode === 'no_split';

        const usedImageIds = new Set<string>();
        subtitles.forEach(b => {
          if (b.id !== block.id) {
            if (b.matchedLeftImageId) usedImageIds.add(b.matchedLeftImageId);
            if (b.matchedRightImageId) usedImageIds.add(b.matchedRightImageId);
            if (b.matchedImageIds) b.matchedImageIds.forEach(id => usedImageIds.add(id));
          }
        });

        const selectUniqueFromPool = (pool: CharacterImage[], excludeIds: Set<string> = new Set()) => {
          if (pool.length === 0) return null;
          let candidates = pool.filter(img => !excludeIds.has(img.id));
          if (candidates.length === 0) candidates = pool;

          let freshCandidates = candidates.filter(img => !usedImageIds.has(img.id));
          if (freshCandidates.length === 0) freshCandidates = candidates;

          const selected = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
          if (selected) {
            usedImageIds.add(selected.id);
          }
          return selected;
        };

        if (matchedKeys.length >= 2 && isNoSplit) {
          const seedIndex = (block.id * 31 + 7) % matchedKeys.length;
          const kw = matchedKeys[seedIndex];
          const pool = keywordToImages[kw];
          const selected1 = selectUniqueFromPool(pool);
          leftImgId = selected1 ? selected1.id : undefined;
          rightImgId = undefined;
          leftKw = kw;
          rightKw = undefined;
        } else if (matchedKeys.length >= 2) {
          const kw1 = matchedKeys[0];
          const kw2 = matchedKeys[1];
          const leftPool = keywordToImages[kw1];
          const rightPool = keywordToImages[kw2];
          const selected1 = selectUniqueFromPool(leftPool);
          const selected2 = selectUniqueFromPool(rightPool, new Set([selected1?.id].filter(Boolean) as string[]));
          leftImgId = selected1 ? selected1.id : undefined;
          rightImgId = selected2 ? selected2.id : undefined;
          leftKw = kw1;
          rightKw = kw2;
        } else if (matchedKeys.length === 1) {
          const kw = matchedKeys[0];
          const pool = keywordToImages[kw];
          const selected1 = selectUniqueFromPool(pool);
          leftImgId = selected1 ? selected1.id : undefined;
          const shouldPair = checkShouldPairForKw(block);
          if (shouldPair) {
            const selected2 = selectUniqueFromPool(pool, new Set([selected1?.id].filter(Boolean) as string[]));
            rightImgId = selected2 ? selected2.id : undefined;
            rightKw = kw;
          } else {
            rightImgId = undefined;
            rightKw = undefined;
          }
          leftKw = kw;
        }

        const updated = subtitles.map(b => b.id === block.id ? {
          ...b,
          matchedLeftImageId: leftImgId,
          matchedRightImageId: rightImgId,
          matchedLeftKeyword: leftKw,
          matchedRightKeyword: rightKw,
          matchedKeywordsList: suggestedKws,
          isAiPredicted: true,
          aiExplanation: suggestion.explanation
        } : b);

        onSubtitlesMatched(updated);
      } else {
        alert("AI đọc phụ đề nhưng không phát hiện nhân vật đối chiếu nào phù hợp.");
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Không thể lấy gợi ý AI cho dòng này.");
    } finally {
      setIndividualLoadingId(null);
    }
  };

  // 3. Batch suggestions trigger for all empty subtitle blocks
  const handleAiSuggestForUnmatched = async () => {
    const unmatchedBlocks = subtitles.filter(
      b => !b.matchedLeftKeyword && !b.matchedRightKeyword && (!b.matchedKeywordsList || b.matchedKeywordsList.length === 0)
    );

    if (unmatchedBlocks.length === 0) {
      alert("Tất cả câu phụ đề đều đã có từ khóa chủ đạo. Không cần phân tích AI thêm!");
      return;
    }

    if (images.length === 0) {
      alert("Vui lòng tải tệp ảnh nhân vật lên trước để AI có danh sách đối chiếu!");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const charactersMap: Record<string, Set<string>> = {};
      images.forEach(img => {
        if (!img.characterName) return;
        if (!charactersMap[img.characterName]) {
          charactersMap[img.characterName] = new Set();
        }
        if (img.keywords) {
          img.keywords.forEach(kw => {
            if (kw && kw.trim().length > 0) {
              charactersMap[img.characterName].add(kw.toLowerCase());
            }
          });
        }
      });

      const charactersPayload = Object.entries(charactersMap).map(([name, kwSet]) => ({
        name,
        keywords: Array.from(kwSet)
      }));

      const response = await fetch('/api/gemini/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtitles: unmatchedBlocks.map(b => ({ id: b.id, text: b.text })),
          characters: charactersPayload
        })
      });

      if (!response.ok) {
        let errMsg = `Lỗi máy chủ: Trả về trạng thái ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (!data || !data.suggestions) {
        throw new Error('Định dạng phản hồi AI không đồng bộ hợp lệ.');
      }

      const suggestions = data.suggestions as Array<{
        id: number;
        suggestedKeywords: string[];
        explanation?: string;
      }>;

      const usedImageIds = new Set<string>();
      subtitles.forEach(b => {
        if (b.matchedLeftImageId) usedImageIds.add(b.matchedLeftImageId);
        if (b.matchedRightImageId) usedImageIds.add(b.matchedRightImageId);
        if (b.matchedImageIds) b.matchedImageIds.forEach(id => usedImageIds.add(id));
      });

      const selectUniqueFromPool = (pool: CharacterImage[], excludeIds: Set<string> = new Set()) => {
        if (pool.length === 0) return null;
        let candidates = pool.filter(img => !excludeIds.has(img.id));
        if (candidates.length === 0) candidates = pool;

        let freshCandidates = candidates.filter(img => !usedImageIds.has(img.id));
        if (freshCandidates.length === 0) freshCandidates = candidates;

        const selected = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
        if (selected) {
          usedImageIds.add(selected.id);
        }
        return selected;
      };

      const updated = subtitles.map(block => {
        const suggestion = suggestions.find(s => s.id === block.id);
        if (suggestion && suggestion.suggestedKeywords && suggestion.suggestedKeywords.length > 0) {
          const suggestedKws = suggestion.suggestedKeywords.map(k => k.toLowerCase());
          
          let leftImgId = block.matchedLeftImageId;
          let rightImgId = block.matchedRightImageId;
          let leftKw = block.matchedLeftKeyword;
          let rightKw = block.matchedRightKeyword;

          const keywordToImages: Record<string, CharacterImage[]> = {};
          suggestedKws.forEach(kw => {
            const ruleMatchChars = new Set<string>();
            dictionary.forEach(entry => {
              if (entry.keyword.toLowerCase() === kw) {
                ruleMatchChars.add(entry.characterName);
              }
            });

            const matchingImages = images.filter(img => 
              img.characterName && (
                img.characterName.toLowerCase() === kw ||
                ruleMatchChars.has(img.characterName)
              )
            );
            if (matchingImages.length > 0) {
              keywordToImages[kw] = matchingImages;
            }
          });

          const matchedKeys = Object.keys(keywordToImages);
          matchedKeys.sort((a, b) => {
            const idxA = block.text.toLowerCase().indexOf(a.toLowerCase());
            const idxB = block.text.toLowerCase().indexOf(b.toLowerCase());
            const valA = idxA === -1 ? 999999 : idxA;
            const valB = idxB === -1 ? 999999 : idxB;
            return valA - valB;
          });
          const mode = config?.singleKeywordMode || 'pair';
          const isNoSplit = mode === 'no_split';

          if (matchedKeys.length >= 2 && isNoSplit) {
            const seedIndex = (block.id * 31 + 7) % matchedKeys.length;
            const kw = matchedKeys[seedIndex];
            const pool = keywordToImages[kw];
            const selected1 = selectUniqueFromPool(pool);
            leftImgId = selected1 ? selected1.id : undefined;
            rightImgId = undefined;
            leftKw = kw;
            rightKw = undefined;
          } else if (matchedKeys.length >= 2) {
            const kw1 = matchedKeys[0];
            const kw2 = matchedKeys[1];
            const leftPool = keywordToImages[kw1];
            const rightPool = keywordToImages[kw2];
            const selected1 = selectUniqueFromPool(leftPool);
            const selected2 = selectUniqueFromPool(rightPool, new Set([selected1?.id].filter(Boolean) as string[]));
            leftImgId = selected1 ? selected1.id : undefined;
            rightImgId = selected2 ? selected2.id : undefined;
            leftKw = kw1;
            rightKw = kw2;
          } else if (matchedKeys.length === 1) {
            const kw = matchedKeys[0];
            const pool = keywordToImages[kw];
            const selected1 = selectUniqueFromPool(pool);
            leftImgId = selected1 ? selected1.id : undefined;
            const shouldPair = checkShouldPairForKw(block);
            if (shouldPair) {
              const selected2 = selectUniqueFromPool(pool, new Set([selected1?.id].filter(Boolean) as string[]));
              rightImgId = selected2 ? selected2.id : undefined;
              rightKw = kw;
            } else {
              rightImgId = undefined;
              rightKw = undefined;
            }
            leftKw = kw;
          }

          return {
            ...block,
            matchedLeftImageId: leftImgId,
            matchedRightImageId: rightImgId,
            matchedLeftKeyword: leftKw,
            matchedRightKeyword: rightKw,
            matchedKeywordsList: suggestedKws,
            isAiPredicted: true,
            aiExplanation: suggestion.explanation
          };
        }
        return block;
      });

      onSubtitlesMatched(updated);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Không thể lấy gợi ý AI lúc này.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Helper for keyword matching with exact case, standalone or bordered by special chars (word boundaries)
  const isKeywordMatch = (subtitleText: string, kw: string): boolean => {
    if (!subtitleText || !kw) return false;
    if (STOP_WORDS.has(kw.toLowerCase().trim())) return false; // Absolutely ignore stop words!
    
    let index = subtitleText.indexOf(kw);
    while (index !== -1) {
      let leftOk = true;
      if (index > 0) {
        const leftChar = subtitleText[index - 1];
        if (/[A-Za-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(leftChar)) {
          leftOk = false;
        }
      }
      
      let rightOk = true;
      const rightIndex = index + kw.length;
      if (rightIndex < subtitleText.length) {
        const rightChar = subtitleText[rightIndex];
        if (/[A-Za-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(rightChar)) {
          rightOk = false;
        }
      }
      
      if (leftOk && rightOk) {
        return true;
      }
      index = subtitleText.indexOf(kw, index + 1);
    }
    return false;
  };

  // Memoized top 5 most frequent keywords appearing in the srt file
  const srtTopKeywords = React.useMemo(() => {
    if (!subtitles || subtitles.length === 0) return [];
    
    const isBackgroundKw = (kwName: string): boolean => {
      if (!kwName) return false;
      const lowerKw = kwName.toLowerCase();
      if (backgroundNames.some(bg => bg.toLowerCase() === lowerKw)) {
        return true;
      }
      const matchedRule = dictionary.find(entry => entry.keyword?.toLowerCase() === lowerKw);
      if (matchedRule && matchedRule.characterName && backgroundNames.some(bg => bg.toLowerCase() === matchedRule.characterName!.toLowerCase())) {
        return true;
      }
      return false;
    };

    const allKeywords = new Set<string>();
    images.forEach(img => {
      if (img.characterName && img.characterName !== 'Không có nhân vật' && img.characterName !== 'Tất cả') {
        const lowerChar = img.characterName.toLowerCase();
        if (!STOP_WORDS.has(lowerChar) && !isBackgroundKw(img.characterName)) {
          allKeywords.add(img.characterName);
        }
      }
    });

    (videos || []).forEach(vid => {
      if (vid.characterName && vid.characterName !== 'Không có nhân vật' && vid.characterName !== 'Tất cả') {
        const lowerChar = vid.characterName.toLowerCase();
        if (!STOP_WORDS.has(lowerChar) && !isBackgroundKw(vid.characterName)) {
          allKeywords.add(vid.characterName);
        }
      }
    });

    dictionary.forEach(entry => {
      if (entry.keyword) {
        const lowerKw = entry.keyword.toLowerCase();
        if (!STOP_WORDS.has(lowerKw) && !isBackgroundKw(entry.keyword)) {
          allKeywords.add(entry.keyword);
        }
      }
      if (entry.characterName) {
        const lowerChar = entry.characterName.toLowerCase();
        if (!STOP_WORDS.has(lowerChar) && !isBackgroundKw(entry.characterName)) {
          allKeywords.add(entry.characterName);
        }
      }
    });

    const kwFrequency: Record<string, number> = {};
    allKeywords.forEach(kw => {
      kwFrequency[kw] = 0;
    });

    subtitles.forEach(block => {
      allKeywords.forEach(kw => {
        if (isKeywordMatch(block.text, kw)) {
          kwFrequency[kw] = (kwFrequency[kw] || 0) + 1;
        }
      });
    });

    const sortedEntries = Object.entries(kwFrequency)
      .filter(([kw, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    return sortedEntries.slice(0, 5).map(([kw, count], idx) => ({
      keyword: kw,
      count,
      rank: idx + 1
    }));
  }, [subtitles, images, videos, dictionary, backgroundNames]);

  // Auto-matching logic for Left/Right images mapping
  const handleAutoMatch = () => {
    if ((images.length === 0 && (!videos || videos.length === 0)) || subtitles.length === 0) return;

    // Gather all unique valid keywords/characterNames from image items + dictionary + videos (preserving original casing!)
    const allKeywords = new Set<string>();
    images.forEach(img => {
      if (img.characterName && img.characterName !== 'Không có nhân vật' && img.characterName !== 'Tất cả') {
        const lowerChar = img.characterName.toLowerCase();
        if (!STOP_WORDS.has(lowerChar)) {
          allKeywords.add(img.characterName);
        }
      }
    });

    (videos || []).forEach(vid => {
      if (vid.characterName && vid.characterName !== 'Không có nhân vật' && vid.characterName !== 'Tất cả') {
        const lowerChar = vid.characterName.toLowerCase();
        if (!STOP_WORDS.has(lowerChar)) {
          allKeywords.add(vid.characterName);
        }
      }
    });

    dictionary.forEach(entry => {
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

    subtitles.forEach(block => {
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

    const isBackgroundKw = (kw: string): boolean => {
      if (!kw) return false;
      if (backgroundNames.some(bg => bg === kw)) {
        return true;
      }
      const matchedRule = dictionary.find(entry => entry.keyword === kw);
      if (matchedRule && backgroundNames.some(bg => bg === matchedRule.characterName)) {
        return true;
      }
      return false;
    };

    const getImagesForKw = (kw: string) => {
      const matches: CharacterImage[] = [];
      // 1. Match from dictionary rules
      dictionary.forEach(entry => {
        if (entry.keyword === kw && kw.length > 0) {
          const targetChar = entry.characterName;
          images.forEach(img => {
            if (img.characterName && img.characterName === targetChar) {
              if (!matches.some(m => m.id === img.id)) {
                matches.push(img);
              }
            }
          });
        }
      });
      // 2. Fallback to characterName exact match
      images.forEach(img => {
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
      if (images.length === 0) return null;
      let candidates = images.filter(img => !excludeIds.has(img.id));
      if (candidates.length === 0) candidates = images;

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
      dictionary.forEach(entry => {
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

    const resultBlocks: SubtitleBlock[] = [];

    for (let i = 0; i < subtitles.length; i++) {
      const block = subtitles[i];
      
      // Keep manually matched or uploaded blocks untouched!
      if (block.isManualMatch) {
        resultBlocks.push(block);
        continue;
      }

      const characterToImages: Record<string, CharacterImage[]> = {};
      const characterToMatchedRawKeywords: Record<string, Set<string>> = {};
      
      // 1. Match from characterName
      images.forEach(img => {
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
      dictionary.forEach(entry => {
        const dictKw = entry.keyword;
        if (isKeywordMatch(block.text, dictKw) && dictKw.length > 0) {
          const targetChar = entry.characterName;
          if (targetChar) {
            const charImages = images.filter(img => 
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

      if (matchedKeywords.length >= 2) {
        if (isNoSplit) {
          // Select exactly 1 keyword randomly
          const seedIndex = Math.floor(Math.random() * matchedKeywords.length);
          const kw = matchedKeywords[seedIndex];
          const media = resolveMediaForKw(kw, shouldPreferVideo);
          if (media) {
            leftImgId = media.id;
            leftKw = kw;
            matchedKwsList = [kw];
            rightImgId = undefined;
            rightKw = undefined;
            matchedImgIds = [media.id];
            inheritanceDist = 0;
          } else {
            const fallback = selectRandomRandomMedia();
            if (fallback) {
              leftImgId = fallback.id;
              leftKw = kw;
              matchedKwsList = [kw];
              rightImgId = undefined;
              rightKw = undefined;
              matchedImgIds = [fallback.id];
              inheritanceDist = 0;
            }
          }
        } else {
          const selectedMediaForKws: { id: string; keyword: string }[] = [];
          const usedMediaIds = new Set<string>();

          const slicedKws = matchedKeywords.slice(0, 4);
          slicedKws.forEach(kw => {
            const media = resolveMediaForKw(kw, shouldPreferVideo, usedMediaIds);
            if (media) {
              selectedMediaForKws.push(media);
              usedMediaIds.add(media.id);
            }
          });

          if (selectedMediaForKws.length >= 2) {
            leftImgId = selectedMediaForKws[0].id;
            rightImgId = selectedMediaForKws[selectedMediaForKws.length - 1].id;
            leftKw = selectedMediaForKws[0].keyword;
            rightKw = selectedMediaForKws[selectedMediaForKws.length - 1].keyword;
            matchedKwsList = selectedMediaForKws.map(m => m.keyword);
            matchedImgIds = selectedMediaForKws.map(m => m.id);
            inheritanceDist = 0;
          } else if (selectedMediaForKws.length === 1) {
            const media1 = selectedMediaForKws[0];
            const shouldPair = checkShouldPairForKw(block);
            leftImgId = media1.id;
            leftKw = media1.keyword;
            matchedKwsList = [media1.keyword];
            if (shouldPair) {
              const media2 = resolveMediaForKw(media1.keyword, shouldPreferVideo, new Set([media1.id])) || media1;
              rightImgId = media2.id;
              rightKw = media1.keyword;
              matchedImgIds = [media1.id, media2.id];
              matchedKwsList = [media1.keyword, media1.keyword];
            } else {
              rightImgId = undefined;
              rightKw = undefined;
              matchedImgIds = [media1.id];
            }
            inheritanceDist = 0;
          }
        }
      } else if (matchedKeywords.length === 1) {
        const kw = matchedKeywords[0];
        const media1 = resolveMediaForKw(kw, shouldPreferVideo);
        if (media1) {
          const shouldPair = checkShouldPairForKw(block);
          leftImgId = media1.id;
          leftKw = kw;
          matchedKwsList = [kw];
          if (shouldPair) {
            const media2 = resolveMediaForKw(kw, shouldPreferVideo, new Set([media1.id])) || media1;
            rightImgId = media2.id;
            rightKw = kw;
            matchedImgIds = [media1.id, media2.id];
            matchedKwsList = [kw, kw];
          } else {
            rightImgId = undefined;
            rightKw = undefined;
            matchedImgIds = [media1.id];
          }
          inheritanceDist = 0;
        } else {
          const fallback1 = selectRandomRandomMedia();
          const fallback2 = selectRandomRandomMedia(new Set([fallback1?.id].filter(Boolean) as string[]));
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
          inheritanceDist = 0;
        }
      } else {
        // Inherit from previous block up to 5 consecutive levels (excluding background keywords, unlimited for top keywords)
        const prevBlock = i > 0 ? resultBlocks[i - 1] : null;
        const legacyKws: string[] = [];
        if (prevBlock) {
          const prevBlockAssignedImages = images.filter(img => 
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
          const poolKws = top5Kws.length > 0 ? top5Kws : [images[0]?.characterName || images[0]?.keywords?.[0] || ""].filter(Boolean);
          
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
          const img = images.find(x => x.id === id);
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
          leftKw = leftImgId ? (images.find(x => x.id === leftImgId)?.characterName || videos.find(x => x.id === leftImgId)?.characterName) : undefined;
        }
        if (rightImgId && !matchedImgIds.includes(rightImgId)) {
          rightImgId = matchedImgIds[1] || undefined;
          rightKw = rightImgId ? (images.find(x => x.id === rightImgId)?.characterName || videos.find(x => x.id === rightImgId)?.characterName) : undefined;
        }
      }

      resultBlocks.push({
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

    onSubtitlesMatched(resultBlocks);
  };

  // Run auto-match elements when data sets load
  useEffect(() => {
    if (images.length > 0 && subtitles.length > 0 && subtitles.every(s => !s.matchedLeftImageId && !s.matchedRightImageId)) {
      handleAutoMatch();
    }
  }, [images.length, subtitles.length]);

  const checkShouldPairForKw = (b: SubtitleBlock): boolean => {
    return false; // Disable pairing completely as requested
  };

  const handleManualImageSelect = (blockId: number, imageId: string) => {
    const updated = subtitles.map(b => {
      if (b.id === blockId) {
        const isVideo = videos.some(v => v.id === imageId);
        
        if (isVideo) {
          const videoObj = videos.find(v => v.id === imageId);
          const isBg = videoObj?.characterName ? backgroundNames.some(bg => bg === videoObj.characterName) : false;
          if (!isBg) {
            // It's a character video, so it MUST stand alone!
            const firstKw = videoObj ? (videoObj.keywords?.[0] || videoObj.characterName) : undefined;
            return {
              ...b,
              matchedLeftImageId: imageId,
              matchedLeftKeyword: firstKw,
              matchedRightImageId: undefined,
              matchedRightKeyword: undefined,
              matchedImageIds: [imageId],
              matchedKeywordsList: firstKw ? [firstKw] : undefined,
              isManualMatch: true,
            };
          }
        }

        const image = images.find(img => img.id === imageId) || videos.find(v => v.id === imageId);
        const mode = config?.singleKeywordMode || 'pair';
        
        // Count how many keywords are present
        const matchedKwsList = [b.matchedLeftKeyword, b.matchedRightKeyword, ...(b.matchedKeywordsList || [])].filter(Boolean) as string[];
        const uniqueKws = Array.from(new Set(matchedKwsList));

        // If 'no_split' or if single keyword with shouldPair = false, we force single image!
        const isSingleKw = uniqueKws.length <= 1;
        const shouldPair = mode !== 'no_split' && (!isSingleKw || checkShouldPairForKw(b));

        const isCharVideo = (id: string | undefined): boolean => {
          if (!id) return false;
          const vObj = videos.find(v => v.id === id);
          if (!vObj) return false;
          const isBg = vObj.characterName ? backgroundNames.some(bg => bg === vObj.characterName) : false;
          return !isBg;
        };
        const leftIsCharVideo = isCharVideo(b.matchedLeftImageId);
        const rightIsCharVideo = isCharVideo(b.matchedRightImageId);

        const leftImgId = selectorPosition === 'left' ? imageId : (leftIsCharVideo ? undefined : b.matchedLeftImageId);
        const rightImgId = selectorPosition === 'right' ? imageId : (rightIsCharVideo ? undefined : b.matchedRightImageId);
        const leftKw = selectorPosition === 'left' ? (image ? (image.keywords?.[0] || image.characterName) : b.matchedLeftKeyword) : (leftIsCharVideo ? undefined : b.matchedLeftKeyword);
        const rightKw = selectorPosition === 'right' ? (image ? (image.keywords?.[0] || image.characterName) : b.matchedRightKeyword) : (rightIsCharVideo ? undefined : b.matchedRightKeyword);

        if (!shouldPair || !leftImgId || !rightImgId) {
          const finalId = leftImgId || rightImgId || imageId;
          const finalKw = leftImgId ? leftKw : (rightImgId ? rightKw : (image ? image.keywords[0] : undefined));

          return {
            ...b,
            matchedLeftImageId: finalId,
            matchedLeftKeyword: finalKw,
            matchedRightImageId: undefined,
            matchedRightKeyword: undefined,
            matchedImageIds: [finalId],
            matchedKeywordsList: finalKw ? [finalKw] : undefined,
            isManualMatch: true,
          };
        } else {
          const imgIds = [leftImgId, rightImgId].filter(Boolean) as string[];
          const kws = [leftKw, rightKw].filter(Boolean) as string[];

          return {
            ...b,
            matchedLeftImageId: leftImgId,
            matchedRightImageId: rightImgId,
            matchedLeftKeyword: leftKw,
            matchedRightKeyword: rightKw,
            matchedImageIds: imgIds,
            matchedKeywordsList: kws,
            isManualMatch: true,
          };
        }
      }
      return b;
    });
    onSubtitlesMatched(updated);
    setSelectedBlockId(null);
  };

  const getLeftImage = (block: SubtitleBlock) => {
    return images.find(img => img.id === block.matchedLeftImageId) || videos.find(v => v.id === block.matchedLeftImageId);
  };

  const getRightImage = (block: SubtitleBlock) => {
    return images.find(img => img.id === block.matchedRightImageId) || videos.find(v => v.id === block.matchedRightImageId);
  };

  const getMatchedImages = (block: SubtitleBlock) => {
    let list: CharacterImage[] = [];
    if (block.matchedImageIds && block.matchedImageIds.length > 0) {
      list = block.matchedImageIds.map(id => images.find(img => img.id === id) || videos.find(v => v.id === id)).filter(Boolean) as CharacterImage[];
    } else {
      const left = images.find(img => img.id === block.matchedLeftImageId) || videos.find(v => v.id === block.matchedLeftImageId);
      if (left) list.push(left);
      const right = images.find(img => img.id === block.matchedRightImageId) || videos.find(v => v.id === block.matchedRightImageId);
      if (right) {
        list.push(right);
      }
    }

    if (list.length <= 1) return list;

    const mode = config?.singleKeywordMode || 'pair';
    if (mode === 'no_split') {
      return list.slice(0, 1);
    }

    const matchedKws = Array.from(new Set([
      block.matchedLeftKeyword,
      block.matchedRightKeyword,
      ...(block.matchedKeywordsList || [])
    ].filter(Boolean) as string[]));

    if (matchedKws.length === 1 || (block.matchedLeftKeyword && block.matchedLeftKeyword === block.matchedRightKeyword)) {
      const shouldPair = checkShouldPairForKw(block);
      if (!shouldPair) {
        return list.slice(0, 1);
      } else {
        return list.slice(0, 2);
      }
    }
    const kwCount = Math.min(matchedKws.length, 4);
    return list.slice(0, kwCount);
  };

  const formatSecs = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  // Filter subtitles list
  const filteredBlocks = subtitles.filter(block => {
    const hasMatch = !!block.matchedLeftKeyword || !!block.matchedRightKeyword;
    if (activeFilter === 'matched' && !hasMatch) return false;
    if (activeFilter === 'unmatched' && hasMatch) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const textMatch = block.text.toLowerCase().includes(q);
      const kwMatch = block.matchedLeftKeyword?.toLowerCase().includes(q) || 
                       block.matchedRightKeyword?.toLowerCase().includes(q) || false;
      const leftNameMatch = getLeftImage(block)?.name.toLowerCase().includes(q) || false;
      const rightNameMatch = getRightImage(block)?.name.toLowerCase().includes(q) || false;
      return textMatch || kwMatch || leftNameMatch || rightNameMatch;
    }

    return true;
  });

  const matchedCount = subtitles.filter(s => !!s.matchedLeftKeyword || !!s.matchedRightKeyword).length;
  const unmatchedCount = subtitles.length - matchedCount;

  const currentBlock = subtitles.find(b => b.id === selectedBlockId);
  const combinedSelectorMedia = [
    ...images.map(img => ({ ...img, isVideo: false })),
    ...videos.map(v => ({ ...v, isVideo: true }))
  ];

  const filteredSelectorMedia = combinedSelectorMedia.filter(item => 
    item.name.toLowerCase().includes(imageSelectorSearch.toLowerCase()) ||
    (item.keywords || []).some(kw => kw.toLowerCase().includes(imageSelectorSearch.toLowerCase())) ||
    (item.characterName || '').toLowerCase().includes(imageSelectorSearch.toLowerCase())
  );

  return (
    <div className="bg-transparent border-0 p-0 shadow-none" id="sub-matcher-card">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-md font-semibold text-white font-sans tracking-tight flex items-center gap-2">
            CẤU HÌNH DÒNG THỜI GIAN
          </h2>
          <p className="text-xs text-white/40 mt-0.5">
            Dựa trên từ khóa phụ đề, chọn lọc các hình ảnh 640x720 để tự động ghép thành khung hình 1280x720 hoàn chỉnh
          </p>
          <p className="text-[10px] text-red-500 font-bold tracking-wider mt-1 select-none">
            VIỆC TÌM KIẾM VÀ LỰA CHỌN ẢNH BẮT BUỘC PHẢI PHÂN BIỆT CHỮ HOA CHỮ THƯỜNG, ĐÂY LÀ ĐIỀU BẮT BUỘC KHÔNG BAO GIỜ ĐƯỢC PHÉP THAY ĐỔI
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAutoMatch}
            disabled={images.length === 0 || subtitles.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/15 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <RefreshCw size={12} />
            Tự động Khớp Lại
          </button>
        </div>
      </div>

      {subtitles.length === 0 ? (
        <div className="py-8 text-center text-xs text-white/45 border border-white/10 rounded-xl bg-[#050505]/20">
          Hãy nạp đầy đủ file phụ đề SRT và hình ảnh để bắt đầu bóc tách khớp khối
        </div>
      ) : (
        <>
          {aiError && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center justify-between text-xs text-rose-300">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{aiError}</span>
              </div>
              <button onClick={() => setAiError(null)} className="text-rose-400 hover:text-rose-200 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2.5 mb-5 text-center">
            <div className="bg-[#050505]/40 rounded-xl p-2.5 border border-white/10">
              <span className="text-[10px] text-white/40 block font-medium">Tổng câu Sub</span>
              <span className="text-sm font-bold text-white font-mono mt-0.5 block">{subtitles.length}</span>
            </div>
            <div className="bg-[#050505]/40 rounded-xl p-2.5 border border-white/10">
              <span className="text-[10px] text-blue-400 block font-medium">Khớp Từ Khóa</span>
              <span className="text-sm font-bold text-blue-400 font-mono mt-0.5 block">{matchedCount}</span>
            </div>
            <div className="bg-[#050505]/40 rounded-xl p-2.5 border border-white/10">
              <span className="text-[10px] text-amber-400 block font-medium">Không Khớp (Ngẫu Nhiên)</span>
              <span className="text-sm font-bold text-amber-400 font-mono mt-0.5 block">{unmatchedCount}</span>
            </div>
          </div>

          {/* Top 5 Keywords display */}
          {srtTopKeywords.length > 0 && (
            <div className="bg-[#050505]/40 rounded-xl p-3 border border-white/10 mb-5 text-left">
              <span className="text-[10px] text-blue-400 font-bold block mb-2 font-sans tracking-wider uppercase flex items-center gap-1">
                <Sparkles size={11} className="animate-pulse" />
                Top 5 Từ Khóa Xuất Hiện Nhiều Nhất
              </span>
              <div className="flex flex-wrap gap-2">
                {srtTopKeywords.map(({ keyword, count, rank }) => (
                  <div
                    key={keyword}
                    className="flex items-center gap-1.5 bg-blue-950/40 border border-blue-500/20 px-2.5 py-1 rounded-lg text-xs hover:bg-blue-950/60 transition-all select-none"
                  >
                    <span className="text-blue-400 font-extrabold font-mono text-[10px]">TOP {rank}</span>
                    <span className="text-white font-bold">{keyword}</span>
                    <span className="text-white/60 font-semibold font-sans text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 flex items-center gap-1">
                      <span className="text-sm font-extrabold text-yellow-500 font-mono">{count}</span> lần
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtering tabs and search bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex bg-[#050505] p-1 rounded-lg border border-white/10 text-xs text-white/40">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeFilter === 'all' ? 'bg-[#111114] text-white font-semibold border border-white/5' : 'hover:text-white'
                }`}
              >
                Tất cả ({subtitles.length})
              </button>
              <button
                onClick={() => setActiveFilter('matched')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeFilter === 'matched' ? 'bg-[#111114] text-white font-semibold border border-white/5' : 'hover:text-white'
                }`}
              >
                Đã Khớp Từ Khóa ({matchedCount})
              </button>
              <button
                onClick={() => setActiveFilter('unmatched')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeFilter === 'unmatched' ? 'bg-[#111114] text-white font-semibold border border-white/5' : 'hover:text-white'
                }`}
              >
                Dự Phòng ({unmatchedCount})
              </button>
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-white/40">
                <Search size={13} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lọc dòng sub..."
                className="w-full sm:w-48 pl-8 pr-3 py-1.5 text-xs bg-[#050505] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Table representing all synced elements */}
          <div className="border border-white/10 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto">
            <table className="w-full border-collapse text-left text-xs text-white/90">
              <thead className="bg-[#050505] text-white/50 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-medium border-none w-[12%]">STT &amp; Thời gian</th>
                  <th className="px-4 py-3 font-medium border-none w-[20%]">Nhân vật được chọn</th>
                  <th className="px-4 py-3 font-medium border-none w-[35%]">Nội dung phụ đề</th>
                  <th className="px-4 py-3 font-medium border-none w-[25%]">Ghép Cảnh Phân Chia (640x720)</th>
                  <th className="px-4 py-3 font-medium text-right border-none w-[8%]">Căn chỉnh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#050505]/20">
                {filteredBlocks.map((block) => {
                  const leftImg = getLeftImage(block);
                  const rightImg = getRightImage(block);
                  return (
                    <tr key={block.id} className="hover:bg-white/5 transition-all group">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono text-white/50 flex items-center gap-2">
                          <span className="text-white/30 font-bold">#{block.id}</span>
                          <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] border border-white/5 text-blue-400">
                            {formatSecs(block.startTime)}
                          </span>
                        </div>
                        <div className="text-[10px] text-white/30 font-mono mt-0.5">
                          Độ dài: {(block.endTime - block.startTime).toFixed(1)}s
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5 max-w-[140px]">
                          {(() => {
                            const matchedKws = Array.from(new Set([
                              block.matchedLeftKeyword,
                              block.matchedRightKeyword,
                              ...(block.matchedKeywordsList || [])
                            ].filter(Boolean) as string[]));

                            if (matchedKws.length > 0) {
                              return (
                                <>
                                  <div className="flex flex-wrap gap-1">
                                    {matchedKws.slice(0, 4).map((kw) => {
                                      const charImg = images.find(img => 
                                        img.keywords?.some(k => k.toLowerCase() === kw.toLowerCase()) ||
                                        (img.characterName && img.characterName.toLowerCase() === kw.toLowerCase())
                                      ) || videos.find(v => 
                                        v.keywords?.some(k => k.toLowerCase() === kw.toLowerCase()) ||
                                        (v.characterName && v.characterName.toLowerCase() === kw.toLowerCase())
                                      );
                                      const isCharVid = charImg ? videos.some(v => v.id === charImg.id) : false;
                                      const isInSub = block.text.toLowerCase().includes(kw.toLowerCase()) || (() => {
                                        const lowerKw = kw.toLowerCase();
                                        // Check if kw is a character name whose linked keywords are present in the subtitle text
                                        const isDictMatch = dictionary.some(entry => 
                                          entry.characterName && 
                                          entry.characterName.toLowerCase() === lowerKw && 
                                          entry.keyword && 
                                          block.text.toLowerCase().includes(entry.keyword.toLowerCase())
                                        );
                                        if (isDictMatch) return true;

                                        const isImgMatch = images.some(img => 
                                          img.characterName && 
                                          img.characterName.toLowerCase() === lowerKw && 
                                          img.keywords && 
                                          img.keywords.some(k => block.text.toLowerCase().includes(k.toLowerCase()))
                                        );
                                        return isImgMatch;
                                      })();
                                      const isInherited = !isInSub && typeof block.inheritanceDistance === 'number' && block.inheritanceDistance > 0;
                                      const isBgKw = backgroundNames.some(bg => bg.toLowerCase() === kw.toLowerCase()) || (() => {
                                        const matchedRule = dictionary?.find(entry => entry.keyword?.toLowerCase() === kw.toLowerCase());
                                        return matchedRule?.characterName ? backgroundNames.some(bg => bg.toLowerCase() === matchedRule.characterName.toLowerCase()) : false;
                                      })();
                                      const topKwMatch = srtTopKeywords.find(
                                        item => item.keyword.toLowerCase() === kw.toLowerCase()
                                      );
                                      const isTop5 = !!topKwMatch;
                                      
                                      let badgeBgClass = 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-900/20';
                                      let textClass = 'text-rose-400';
                                      let titleStr = `Nhân vật rủi ro: ${kw}`;
                                      
                                      if (isInSub) {
                                        if (charImg) {
                                          badgeBgClass = 'bg-[#1A1105]/60 border-[#FBBF24]/20 hover:bg-[#201507]';
                                          textClass = 'text-yellow-400';
                                          titleStr = kw;
                                        } else {
                                          badgeBgClass = 'bg-red-500/10 border-red-500/30 hover:bg-red-900/20';
                                          textClass = 'text-red-500 font-bold';
                                          titleStr = `${kw} (chưa có ảnh)`;
                                        }
                                      } else if (isInherited) {
                                        badgeBgClass = 'bg-emerald-950/40 border-emerald-500/20 hover:bg-emerald-950/60';
                                        textClass = 'text-emerald-400';
                                        titleStr = `Nhân vật kế thừa: ${kw} (+${block.inheritanceDistance})`;
                                      } else if (isTop5) {
                                        badgeBgClass = 'bg-red-500/10 border-red-500/40 hover:bg-red-900/20';
                                        textClass = 'text-red-400';
                                        titleStr = `${kw} | TOP ${topKwMatch.rank}`;
                                      }

                                      if (isBgKw) {
                                        badgeBgClass = 'bg-sky-950/35 border-sky-500/25 hover:bg-sky-950/50';
                                        textClass = 'text-sky-450';
                                        titleStr = `Bối cảnh: ${kw}`;
                                      }

                                      return (
                                        <div key={kw} className={`flex items-center gap-1.5 border rounded px-1.5 py-1 select-none text-[10px] ${badgeBgClass}`} title={titleStr}>
                                          {charImg ? (
                                            isCharVid ? (
                                              <video
                                                src={charImg.url}
                                                muted
                                                playsInline
                                                className="w-5 h-6 object-cover rounded border border-white/10 shrink-0"
                                              />
                                            ) : (
                                              <img
                                                src={charImg.url}
                                                alt={kw}
                                                className="w-5 h-6 object-cover rounded border border-white/10 shrink-0"
                                                referrerPolicy="no-referrer"
                                              />
                                            )
                                          ) : isBgKw ? (
                                            <div className="w-5 h-6 bg-sky-500/10 text-sky-400 font-mono text-[9px] rounded flex items-center justify-center border border-sky-500/10 shrink-0" title="Bối cảnh">
                                              🎬
                                            </div>
                                          ) : (
                                            <div className={`w-5 h-6 font-mono text-[9px] rounded flex items-center justify-center shrink-0 ${isInSub ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-500/60 border border-yellow-500/10'}`}>
                                              ?
                                            </div>
                                          )}
                                          <span className={`${textClass} font-bold truncate max-w-[130px] flex items-center`}>

                                            {!isInSub && !isInherited && !isBgKw && (
                                              <span className="text-rose-500 font-extrabold mr-1 animate-pulse" title="Từ khóa rủi ro / không chứa trực tiếp trong văn bản">
                                                !
                                              </span>
                                            )}
                                            {isInherited ? (
                                              <>
                                                {kw}
                                                <span className="text-emerald-400 font-extrabold ml-1" title={`Kế thừa cấp ${block.inheritanceDistance}`}>
                                                  +{block.inheritanceDistance}
                                                </span>
                                              </>
                                            ) : isTop5 && !isInSub ? (
                                              `${kw} | TOP ${topKwMatch.rank}`
                                            ) : (
                                              kw
                                            )}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              );
                            } else {
                              return <span className="text-[10px] text-white/30 italic">Không khớp</span>;
                            }
                          })()}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <p className="font-sans text-sm text-white font-semibold leading-relaxed pr-4">
                          {(() => {
                            const matchedKws = Array.from(new Set([
                              block.matchedLeftKeyword,
                              block.matchedRightKeyword,
                              ...(block.matchedKeywordsList || [])
                            ].filter(Boolean) as string[]));
                            return renderHighlightedText(block.text, matchedKws);
                          })()}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {(() => {
                            const blockImages = getMatchedImages(block);
                            const mode = config?.singleKeywordMode || 'pair';
                            const isSingleKwBlock = (() => {
                              const kws = Array.from(new Set([
                                block.matchedLeftKeyword,
                                block.matchedRightKeyword,
                                ...(block.matchedKeywordsList || [])
                              ].filter(Boolean) as string[]));
                              return kws.length <= 1;
                            })();
                            const shouldPair = mode !== 'no_split' && (!isSingleKwBlock || checkShouldPairForKw(block));

                            if (blockImages.length === 0) {
                              return (
                                <div className="flex gap-2">
                                  {shouldPair ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectorPosition('left');
                                          setSelectedBlockId(block.id);
                                        }}
                                        className="cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-all flex items-center gap-1 border border-dashed border-white/10 bg-[#050505]/40 p-1.5 px-2.5 rounded-lg text-[9px] text-white/50 active:scale-95 font-semibold"
                                      >
                                        + Chọn Trái
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectorPosition('right');
                                          setSelectedBlockId(block.id);
                                        }}
                                        className="cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all flex items-center gap-1 border border-dashed border-white/10 bg-[#050505]/40 p-1.5 px-2.5 rounded-lg text-[9px] text-white/50 active:scale-95 font-semibold"
                                      >
                                        + Chọn Phải
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectorPosition('left');
                                        setSelectedBlockId(block.id);
                                      }}
                                      className="cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-all flex items-center gap-1 border border-dashed border-white/10 bg-[#050505]/40 p-1.5 px-2.5 rounded-lg text-[9px] text-white/50 active:scale-95 font-semibold"
                                    >
                                      + Chọn ảnh nhân vật
                                    </button>
                                  )}
                                </div>
                              );
                            }
                             return blockImages.map((img, idx) => {
                              let label = `CỘT ${idx + 1}`;
                              let labelClass = 'text-amber-400 font-bold font-mono';
                              if (blockImages.length === 1) {
                                label = 'ẢNH ĐƠN';
                                labelClass = 'text-blue-400 font-bold font-mono';
                              } else if (blockImages.length === 2) {
                                label = idx === 0 ? 'BÊN TRÁI' : 'BÊN PHẢI';
                                labelClass = idx === 0 ? 'text-blue-400 font-bold font-mono' : 'text-emerald-450 font-bold font-mono';
                              } else if (blockImages.length === 3) {
                                label = idx === 0 ? 'BÊN TRÁI' : idx === 1 ? 'Ở GIỮA' : 'BÊN PHẢI';
                                labelClass = idx === 0 ? 'text-blue-400 font-bold font-mono' : idx === 1 ? 'text-amber-400 font-bold font-mono' : 'text-emerald-450 font-bold font-mono';
                              }

                              const isVideo = videos.some(v => v.id === img.id);

                              return (
                                <button
                                  key={`${img.id}-${idx}`}
                                  onClick={() => {
                                    setSelectorPosition(idx === 0 ? 'left' : 'right');
                                    setSelectedBlockId(block.id);
                                  }}
                                  className="flex items-center gap-2 border border-white/10 bg-[#050505]/60 hover:bg-[#0c0c0e] hover:border-blue-500/50 p-1.5 rounded-lg flex-1 min-w-[110px] max-w-[150px] cursor-pointer text-left transition-all active:scale-[0.98]"
                                  title={blockImages.length === 1 ? 'Bấm để đổi ảnh/video' : `Bấm để đổi ảnh/video cho bên ${idx === 0 ? 'TRÁI' : 'PHẢI'}`}
                                >
                                  {isVideo ? (
                                    <video
                                      src={img.url}
                                      muted
                                      playsInline
                                      className="w-10 h-12 object-cover rounded border border-white/10 bg-black shrink-0"
                                    />
                                  ) : (
                                    <img
                                      src={img.url}
                                      alt={label}
                                      className="w-10 h-12 object-cover rounded border border-white/10 bg-black shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <div className="text-[9px] min-w-0 leading-tight">
                                    <span className={labelClass}>{isVideo ? `${label} (VIDEO)` : label}</span>
                                    <p className="text-white/50 truncate mt-0.5 font-medium" title={img.name}>
                                      {img.name}
                                    </p>
                                  </div>
                                </button>
                              );
                            });
                          })()}
                        </div>

                        {/* Keyword metadata lines */}
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {block.matchedLeftKeyword && (
                            <span className="text-[8px] font-mono text-blue-450 bg-blue-500/10 border border-blue-500/15 px-1.5 rounded">
                              L: {block.matchedLeftKeyword}
                            </span>
                          )}
                          {block.matchedRightKeyword && (
                            <span className="text-[8px] font-mono text-emerald-450 bg-emerald-500/10 border border-emerald-500/15 px-1.5 rounded">
                              R: {block.matchedRightKeyword}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              if (onPreviewTimeSelect) {
                                onPreviewTimeSelect(block.startTime);
                              }
                              setTryPreviewBlock(block);
                            }}
                            className="p-1 px-3 text-[10px] text-white hover:text-white bg-blue-600 hover:bg-blue-500 rounded border border-blue-500/30 transition-colors flex items-center gap-1 font-bold shadow cursor-pointer"
                            title="Xem thử ghép cảnh & phụ đề"
                          >
                            <Play size={10} fill="currentColor" /> Thử
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredBlocks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-white/40 font-sans text-xs">
                      Không tìm thấy phụ đề nào trùng khớp với tiêu chí tìm kiếm
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Manual Choice Overlay Modal Box */}
      {selectedBlockId !== null && currentBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" id="manual-image-modal">
          <div className="bg-[#0E0E11] border border-white/10 rounded-2xl w-full max-w-xl flex flex-col max-h-[85vh] shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                  Chọn ảnh <span className={selectorPosition === 'left' ? 'text-blue-400' : 'text-emerald-400 font-bold'}>{selectorPosition === 'left' ? 'BÊN TRÁI (L)' : 'BÊN PHẢI (R)'}</span> cho câu Sub #{currentBlock.id}
                </h3>
                <p className="text-xs text-white/40 mt-1 line-clamp-1 max-w-[420px]">
                  Phụ đề: "{currentBlock.text}"
                </p>
              </div>
              <button
                onClick={() => setSelectedBlockId(null)}
                className="p-1.5 text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 bg-[#050505]/40 border-b border-white/10 flex gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-white/40">
                  <Search size={13} />
                </span>
                <input
                  type="text"
                  value={imageSelectorSearch}
                  onChange={(e) => setImageSelectorSearch(e.target.value)}
                  placeholder="Lọc ảnh/video theo từ khóa..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#050505] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {imageSelectorSearch && (
                <button
                  onClick={() => setImageSelectorSearch('')}
                  className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5"
                >
                  Xóa
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filteredSelectorMedia.map((media) => {
                const isSelected = selectorPosition === 'left' 
                  ? currentBlock.matchedLeftImageId === media.id
                  : currentBlock.matchedRightImageId === media.id;
                return (
                  <button
                    key={media.id}
                    onClick={() => handleManualImageSelect(currentBlock.id, media.id)}
                    className={`group relative text-left rounded-xl overflow-hidden border aspect-[64/72] transition-all flex flex-col ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 ring-offset-2 ring-offset-black shadow-md'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {media.isVideo ? (
                      <video
                        src={media.url}
                        muted
                        playsInline
                        autoPlay
                        loop
                        className="w-full h-full object-cover flex-1"
                      />
                    ) : (
                      <img
                        src={media.url}
                        alt={media.name}
                        className="w-full h-full object-cover flex-1"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-1.5 flex flex-col">
                      <p className="text-[9px] text-white/70 font-mono truncate">
                        {media.name}
                      </p>
                      {media.isVideo && (
                        <p className="text-[8px] text-blue-400 font-bold font-mono tracking-wider">VIDEO</p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-500 text-white p-0.5 rounded-full z-10">
                        <CheckCircle size={10} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredSelectorMedia.length === 0 && (
                <div className="col-span-full text-center py-12 text-white/40 text-xs">
                  Không tìm thấy ảnh hoặc video nhân vật nào phù hợp với từ khóa lọc
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-[#050505]/20 text-right flex items-center justify-between text-xs text-white/40">
              <span>Đang hiển thị {filteredSelectorMedia.length} ảnh và video</span>
              <button
                onClick={() => setSelectedBlockId(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Try Preview Mode Dynamic Overlay */}
      {tryPreviewBlock !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" id="try-preview-modal">
          <div className="bg-[#0E0E11] border border-white/10 rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                  Xem Thử Ghép Cảnh - Câu Sub #{tryPreviewBlock.id}
                </h3>
                <p className="text-xs text-white/40 mt-1">
                  Mốc thoại: {(tryPreviewBlock.endTime - tryPreviewBlock.startTime).toFixed(1)} giây ({formatSecs(tryPreviewBlock.startTime)} - {formatSecs(tryPreviewBlock.endTime)})
                </p>
              </div>
              <button
                onClick={() => setTryPreviewBlock(null)}
                className="p-1.5 text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center justify-center bg-[#070709]/55 overflow-y-auto">
              {/* Scale proportionate 16:9 box simulating video renderer output */}
              <div className="w-full aspect-video bg-[#000000] border border-white/15 rounded-xl relative overflow-hidden shadow-2xl max-w-2xl">
                {(() => {
                  const blockImages = getMatchedImages(tryPreviewBlock);
                  if (blockImages.length === 0) {
                    return (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 select-none">
                        <ImageIcon size={48} strokeWidth={1} className="mb-2" />
                        <span className="text-xs font-sans">Chưa liên kết ảnh nhân vật cho câu này</span>
                      </div>
                    );
                  }
                  
                  const numCols = blockImages.length;
                  return (
                    <div className="absolute inset-0 flex">
                      {blockImages.map((img, colIndex) => {
                        let shouldFlip = false;
                        if (numCols === 2) {
                          if (colIndex === 1) shouldFlip = true;
                        } else if (numCols === 3) {
                          if (colIndex === 2) {
                            shouldFlip = true;
                          } else if (colIndex === 1) {
                            shouldFlip = (tryPreviewBlock.id % 2 === 0);
                          }
                        } else if (numCols === 4) {
                          if (colIndex === 2 || colIndex === 3) {
                            shouldFlip = true;
                          }
                        } else if (numCols > 4) {
                          const half = Math.floor(numCols / 2);
                          if (colIndex >= numCols - half) {
                            shouldFlip = true;
                          }
                        }

                        // Prevent background/scenery images from flipping!
                        if (img.characterName && backgroundNames.some(bg => bg.toLowerCase() === img.characterName!.toLowerCase())) {
                          shouldFlip = false;
                        }

                        const isVideo = videos.some(v => v.id === img.id);

                        if (numCols === 1) {
                          return (
                            <div 
                              key={`${img.id}-${colIndex}`} 
                              className="h-full w-full relative overflow-hidden"
                              style={{ width: '100%' }}
                            >
                              {isVideo ? (
                                <>
                                  <video 
                                    src={img.url}
                                    muted
                                    playsInline
                                    className={`absolute inset-0 w-full h-full object-cover blur-xl opacity-40 select-none ${shouldFlip ? 'scale-x-[-1]' : ''}`}
                                  />
                                  <video 
                                    src={img.url}
                                    muted
                                    playsInline
                                    autoPlay
                                    loop
                                    className={`w-full h-full object-contain relative z-10 select-none ${shouldFlip ? 'scale-x-[-1]' : ''}`}
                                  />
                                </>
                              ) : (
                                <>
                                  <img 
                                    src={img.url}
                                    alt="back-blurred"
                                    className={`absolute inset-0 w-full h-full object-cover blur-xl opacity-40 select-none ${shouldFlip ? 'scale-x-[-1]' : ''}`}
                                    referrerPolicy="no-referrer"
                                  />
                                  <img 
                                    src={img.url}
                                    alt={img.name}
                                    className={`w-full h-full object-contain relative z-10 select-none ${shouldFlip ? 'scale-x-[-1]' : ''}`}
                                    referrerPolicy="no-referrer"
                                  />
                                </>
                              )}
                              <div className="absolute top-2 left-2 z-20 bg-black/75 px-2 py-0.5 rounded text-[8px] font-mono text-white/60 border border-white/5 uppercase select-none">
                                {img.characterName || 'Chưa đặt tên'} (ĐƠN{isVideo ? ' - VIDEO' : ''})
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div 
                            key={`${img.id}-${colIndex}`} 
                            className="h-full relative overflow-hidden border-r border-white/5 last:border-r-0"
                            style={{ width: `${100 / numCols}%` }}
                          >
                            {isVideo ? (
                              <video 
                                src={img.url}
                                muted
                                playsInline
                                autoPlay
                                loop
                                className={`w-full h-full object-cover select-none ${shouldFlip ? 'scale-x-[-1]' : ''}`}
                              />
                            ) : (
                              <img 
                                src={img.url}
                                alt={img.name}
                                className={`w-full h-full object-cover select-none ${shouldFlip ? 'scale-x-[-1]' : ''}`}
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="absolute top-2 left-2 bg-black/75 px-2 py-0.5 rounded text-[8px] font-mono text-white/60 border border-white/5 uppercase select-none">
                              {colIndex === 0 && numCols === 2 ? 'L: ' : (colIndex === 1 && numCols === 2 ? 'R: ' : '')}{img.characterName || 'Chưa đặt tên'}{isVideo ? ' (VIDEO)' : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Subtitle simulation Overlay matching formatting strictly */}
                <div className="absolute inset-x-4 bottom-8 flex flex-col items-center select-none pointer-events-none">
                  <p 
                    className="px-4 py-1.5 text-center text-white"
                    style={{
                      fontFamily: '"Josefin Sans", sans-serif',
                      fontSize: '22px', // scaled proportionally for beautiful preview aspect aspect ration
                      fontWeight: '700',
                      textShadow: '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000',
                      lineHeight: '1.2'
                    }}
                  >
                    {(() => {
                      const words = tryPreviewBlock.text.split(' ');
                      const matchedKws = Array.from(new Set([
                        tryPreviewBlock.matchedLeftKeyword,
                        tryPreviewBlock.matchedRightKeyword,
                        ...(tryPreviewBlock.matchedKeywordsList || [])
                      ].filter(Boolean) as string[]));

                      const lowerKws = matchedKws.map(k => k.toLowerCase());

                      return words.map((w, idx) => {
                        let cleaned = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").toLowerCase();
                        const isKeyword = lowerKws.includes(cleaned);
                        return (
                          <span 
                            key={idx} 
                            className={isKeyword ? "text-[#EAB308]" : "text-white"}
                            style={isKeyword ? { color: '#EAB308' } : undefined}
                          >
                            {w}{' '}
                          </span>
                        );
                      });
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-white/40 bg-[#050507]">
              <div className="flex gap-2 text-[10px]">
                <span>Phân giải ghép cảnh: <strong className="text-white">640x720</strong> mỗi cột</span>
                <span>•</span>
                <span>Font mặc định: <strong className="text-white">Josefin Sans</strong> (40px)</span>
                <span>•</span>
                <span>Bo viền: <strong className="text-white">Mỏng (1.5px)</strong></span>
              </div>
              <button
                onClick={() => setTryPreviewBlock(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
