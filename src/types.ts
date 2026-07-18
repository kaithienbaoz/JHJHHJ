/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubtitleBlock {
  id: number;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
  matchedLeftImageId?: string; // ID of the selected left image
  matchedRightImageId?: string; // ID of the selected right image
  matchedLeftKeyword?: string; // Keyword that matched for left side
  matchedRightKeyword?: string; // Keyword that matched for right side
  matchedKeywordsList?: string[]; // Up to 3 unique matched keywords
  matchedImageIds?: string[]; // Order list of matched image IDs
  isAiPredicted?: boolean; // Whether matched by generative AI
  aiExplanation?: string; // Generated context explanation
  inheritanceDistance?: number; // How many levels back this block inherited keywords from
  isManualMatch?: boolean; // Whether customized or uploaded manually by user
  isFallbackBlock?: boolean; // Whether block used fallback when inheritance limit was reached or couldn't inherit
}

export interface CharacterImage {
  id: string;      // Unique generated ID
  name: string;    // Full file name
  path: string;    // Virtual path or webkitRelativePath
  url: string;     // Object URL for browser preview
  file?: File;      // The actual File object
  keywords: string[]; // List of keywords extracted from the filename
  characterName?: string; // Optional character name folder grouping
}

export interface DictionaryRule {
  id: string;
  keyword: string;
  characterName: string;
}

export interface SubtitlePreset {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  outlineColor: string;
  outlineWidth: number;
  bgColor: string;
  bgOpacity: number;
  position: 'bottom-center' | 'top-center' | 'left' | 'right' | 'center';
  effect: 'standard' | 'cinematic' | 'badge' | 'neon' | 'frosted';
  subtitleHighlightMode?: 'none' | 'alternating' | 'pair' | 'random_pair';
  subtitleHighlightColor?: string;
  subtitleShowEffect?: 'none' | 'karaoke' | 'tiktok_glow' | 'bounce_loop' | 'pulse_grow' | 'flicker_warm' | 'slide_up_down' | 'slide_left_right' | 'wave_text' | 'shake_vibe' | 'rainbow_flow' | 'glitch_cyber' | 'typewriter' | 'highlight_two_words';
  enableTextHighlight?: boolean;
  enableHighlightContrastText?: boolean;
  subtitleHighlightBgColor?: string;
  syncHighlightTextColor?: boolean;
  presetY?: number;
  uppercase?: boolean;
}

export interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  transitionDuration: number; // in seconds (e.g. 0.5)
  transitionType: 'fade' | 'zoom' | 'slide' | 'slide_left' | 'slide_right' | 'slide_up' | 'slide_down' | 'zoom_fade' | 'random_all' | 'none' | 'wipe_left' | 'wipe_right' | 'wipe_up' | 'wipe_down' | 'rotate_fade' | 'curtain_open' | 'curtain_close' | 'grid_dissolve' | 'ripple_fade' | 'cross_zoom';
  singleKeywordMode?: 'pair' | 'single' | 'percent_50_50' | 'percent_25_75' | 'percent_75_25' | 'no_split';
  dividerStyle?: string;
  maxSubChars?: number;
  minSubChars?: number;
  enableKenBurns: boolean; // Subtle zoom/pan effect for static images
  imageEffect?: 'none' | 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'pan_up' | 'pan_down' | 'pan_up_left' | 'pan_up_right' | 'pan_down_left' | 'pan_down_right' | 'rotate_slow_cw' | 'rotate_slow_ccw' | 'zoom_pulse' | 'shiver' | 'random';
  subtitleOffset: number; // Y offset from bottom as % (e.g. 15)
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleOutlineColor: string;
  subtitleOutlineWidth: number;
  subtitleBgColor: string;
  subtitleBgOpacity: number;
  
  // Dynamic Subtitle Presets
  enableDynamicSubstyling: boolean; // Randomly rotate among presets to maximize variety
  activePresetId: string; // Currently active main preset
  activeEffectGroup?: string; // Currently active effect group (A, B, C, D)
  
  // Subtitle Positions & Drag Drop Coordinates (percentages)
  subtitleX?: number;
  subtitleY?: number;
  subtitleAlign?: 'left' | 'center' | 'right' | 'justify';

  // Subtitle custom animations
  subtitleEffectIn?: 'zoom_fade' | 'bounce' | 'fade_in' | 'slide_up' | 'slide_down' | 'slide_left' | 'slide_right' | 'zoom_in' | 'zoom_out' | 'flip_in' | 'stretch_in' | 'bounce_in' | 'typewriter' | 'none';
  subtitleEffectOut?: 'fade' | 'slide_up' | 'slide_down' | 'slide_left' | 'slide_right' | 'zoom_in' | 'zoom_out' | 'flip_out' | 'stretch_out' | 'none';
  subtitleShowEffect?: 'none' | 'karaoke' | 'tiktok_glow' | 'bounce_loop' | 'pulse_grow' | 'flicker_warm' | 'slide_up_down' | 'slide_left_right' | 'wave_text' | 'shake_vibe' | 'rainbow_flow' | 'glitch_cyber' | 'typewriter' | 'highlight_two_words';

  // Subtitle Translucent Blur Background (Nền mờ)
  enableBlurBg?: boolean;
  blurBgHeight?: number; // height in pixels (e.g. 80)
  blurBgWidth?: number;  // width in percentage of screen (e.g. 100)
  blurBgOpacity?: number; // opacity (e.g. 0.5)
  blurBgInOutEffect?: 'top-to-bottom' | 'bottom-to-top' | 'left-to-right' | 'right-to-left' | 'random';
  blurBgX?: number;      // Independent coordinate X (percentage 0-100)
  blurBgY?: number;      // Independent coordinate Y (percentage 0-100)
  blurBgShape?: 'rectangle' | 'circle' | 'rounded' | 'pill';
  blurBgColorHex?: string; // Hex color for the blur shape
  blurBgBorderColorHex?: string; // Hex color for the border (defaults to none/transparent)
  blurBgBlurAmount?: number; // Blur blur amount in pixels (e.g. 18)
  lockTextInBlur?: boolean; // Whether to lock text inside the backdrop blur with auto scale
  
  // Intro options
  introDuration: number; // in seconds
  introTitle: string;
  introSubtitle: string;
  introBgColor: string;
  introTextColor: string;
  introImageId: string; // ID of character image to use, or "none"
  
  // Outro options
  outroDuration: number; // in seconds
  outroTitle: string;
  outroSubtitle: string;
  outroBgColor: string;
  outroTextColor: string;
  outroImageId: string; // ID of character image to use, or "none"
  
  // Custom MP4 Media settings
  introVideoUrl?: string; // Optional custom MP4 Intro video src
  outroVideoUrl?: string; // Optional custom MP4 Outro video src

  // Brand Logo watermark overlays
  logoUrl?: string; // Base64 or object URL of PNG/JPG
  logoX?: number; // X coordinate (0-100, default 85)
  logoY?: number; // Y coordinate (0-100, default 15)
  logoSize?: number; // width size in pixels (10-300, default 80)
  logoOpacity?: number; // opacity of logo (0-1, default 0.9)

  // Style variation seed
  calendarStyleSeed?: number;

  // Subtitle Highlight Settings
  subtitleHighlightMode?: 'none' | 'alternating' | 'pair' | 'random_pair'; // none, alternating odd/even words, or 2 adjacent (pair) highlight
  subtitleHighlightColor?: string; // HEX color for highlight, e.g. #F59E0B
  enableTextHighlight?: boolean;
  enableHighlightContrastText?: boolean;
  subtitleHighlightBgColor?: string;
  syncHighlightTextColor?: boolean;

  // Substyle phase alternation controls
  substyleSwitchMin?: number; // Minimum blocks before switching style phase, default 2
  substyleSwitchMax?: number; // Maximum blocks before switching style phase, default 4
  primaryRenderMode?: 'alternate' | 'traditional_dominant' | 'effects_dominant' | 'always_traditional' | 'always_effects'; // Which display style is dominant

  // Background overlay animations
  bgEffect?: 'none' | 'snow' | 'snowflake' | 'rain' | 'sparks' | 'lightning' | 'lightning_clouds' | 'sakura' | 'bubbles' | 'golden_dust' | 'autumn_leaves' | 'starry_glow' | 'hearts' | 'fireflies' | 'matrix_rain' | 'snow_storm' | 'neon_stars' | 'old_film_vintage' | 'old_film_noir' | 'old_film_scratch' | 'random';
  bgEffectInterval?: number; // active trigger frequency (blocks)
  bgEffectConsecutive?: number; // active trigger duration length (blocks)
  
  // Audio volume controls
  mainAudioVolume?: number; // volume of main voice file (50 to 400, default 200)
  typewriterVolume?: number; // volume scale of typewriter click sound (0 to 200, default 100)

  // Human-like Behavior controls
  enableHumanArrow?: boolean;
  humanArrowBlocks?: string; // Comma-separated 1-based sub block numbers e.g. "1, 3, 5"
  enableHumanTypewriter?: boolean;
  humanTypewriterBlocks?: string; // Comma-separated e.g. "2, 4, 6"
  humanTypewriterColor?: string; // custom background hex color e.g. "#000000"
  humanTypewriterOpacity?: number; // background opacity 0 to 100 (default 85)
  randomTypewriterColor?: boolean; // randomly select from the 10 preset colors
  enableHumanStickers?: boolean;
  humanStickerGroups?: Array<{
    id: string;
    name: string; // e.g. "SAD"
    keywords: string; // e.g. "sad, cry, crying"
    size?: number; // scale or size (default 150)
    images: Array<{
      id: string;
      name: string;
      base64: string; // stored base64 image data for sticker
    }>;
  }>;
  enableHighlightDate?: boolean;
  highlightDateFontFamily?: string;
  highlightDateColor?: string;
  highlightDateBgColor?: string;
  highlightDateBgOpacity?: number;
  highlightTextModeDate?: boolean;
  highlightTextModeCaps?: boolean;
  highlightTextFontSize?: number;
  testHighlightText?: boolean;
  
  // Background noises behavior
  enableBackgroundNoise?: boolean;
  backgroundNoises?: Array<{
    id: string;
    name: string;
    segments: string;
    volume: number;
  }>;

  // Fake News behavior
  enableFakeNews?: boolean;
  fakeNewsBlocks?: string;

  // Fake NewsPaper behavior (Fake Báo Online)
  enableFakeNewsPaper?: boolean;
  fakeNewsPaperBlocks?: string;

  // Handwriting behavior
  enableHandWrite?: boolean;
  handWriteBlocks?: string;

  // Fake Comment behavior
  enableFakeComment?: boolean;
  fakeCommentBlocks?: string;

  // Fake Website behavior
  enableFakeWebsite?: boolean;
  fakeWebsiteBlocks?: string;

  // Fake Video Editor behavior
  enableFakeVideoEditor?: boolean;
  fakeVideoEditorBlocks?: string;

  // Draw Circle behavior
  enableDrawCircle?: boolean;
  drawCircleBlocks?: string;
  drawXBlocks?: string;
  mouseDrawType?: 'circle' | 'x_mark';

  // Fake Calendar behavior
  enableFakeCalendar?: boolean;

  // Touch Typing behavior (GÕ CẢM ỨNG)
  enableTouchTyping?: boolean;
  touchTypingBlocks?: string;
  enableTouchTypingSound?: boolean;
  touchTypingVolume?: number;

  // Fake Poll behavior
  enableFakePoll?: boolean;
  fakePollBlocks?: string;

  // Screenshot Comment behavior
  screenshotCommentBlocks?: string;

  // Multi-video variation seed
  behaviorSeed?: number;

  // Video selection priority
  videoPriorityBlocks?: string;
}
