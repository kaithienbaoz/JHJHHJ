import React from 'react';
import { Cpu, Upload, X, Plus, RefreshCw } from 'lucide-react';
import { RenderConfig } from '../types';
import { playTypewriterClick, playBackgroundNoise } from '../utils/audioSynthesizer';
import { DEFAULT_STICKER_GROUPS, populateDefaultStickers } from '../utils/stickerGenerator';

interface BehaviorSettingsProps {
  config: RenderConfig;
  updateConfig: (key: string, value: any) => void;
  activeAccordion: number | null;
  setActiveAccordion: (value: number | null) => void;
}

export const BehaviorSettings: React.FC<BehaviorSettingsProps> = ({
  config,
  updateConfig,
  activeAccordion,
  setActiveAccordion,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* =======================================================
          NHÓM 1: NGỮ CẢNH
         ======================================================= */}
      <div className="bg-[#050505]/40 border border-sky-500/20 rounded-xl p-5 space-y-4 shadow-lg shadow-sky-500/[0.02]">
        <div className="border-b border-sky-500/10 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>📌 NHÓM 1: NGỮ CẢNH (Hành vi theo tình huống)</span>
            </h3>
            <p className="text-[10.5px] text-white/50 mt-1">
              Các hành vi chỉ xuất hiện khi một sự kiện cụ thể xảy ra trong phụ đề (khớp từ khóa, ngày tháng năm,...).
            </p>
          </div>
          <span className="text-[10px] font-bold bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20 font-mono uppercase">A, B, C</span>
        </div>

        <div className="space-y-3">
          
          {/* Choice A: Sticker Thông Minh Khớp Từ Khóa */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 3 ? null : 3)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-sky-500/10 text-sky-400 font-extrabold text-xs font-mono">A</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">Sticker Thông Minh Khớp Từ Khóa</span>
                  <span className="text-[10px] text-white/40">Tự động kích hoạt sticker theo văn cảnh nội dung từ khóa của đoạn phụ đề</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 3 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 3 && (
              <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableHumanStickers"
                      checked={!!config.enableHumanStickers}
                      onChange={(e) => updateConfig('enableHumanStickers', e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 text-sky-500 focus:ring-sky-500/20 bg-black cursor-pointer"
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
                    <div className="space-y-3.5">
                      {((config.humanStickerGroups || []) as Array<any>).map((group, gIdx) => (
                        <div key={group.id} className="p-3 bg-[#111116] border border-white/5 rounded-lg space-y-3 relative">
                          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-sky-400 font-bold">#{gIdx + 1}</span>
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
                              className="h-1 bg-white/10 rounded appearance-none cursor-pointer accent-sky-500 flex-1"
                            />
                            <span className="text-[10.5px] font-mono text-sky-400 font-bold min-w-[34px] text-right">
                              {group.size || 280}px
                            </span>
                          </div>

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
                              className="py-1 px-3 bg-[#181822] hover:bg-[#20202d] border border-white/5 rounded text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Upload size={10} /> Thêm ảnh sticker mới
                            </button>

                            {group.images && group.images.length > 0 && (
                              <div className="grid grid-cols-4 gap-2 pt-2">
                                {group.images.map((img: any) => (
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
                      className="w-full py-2 bg-sky-600/10 border border-sky-500/20 hover:bg-sky-600/20 text-sky-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus size={13} /> Thêm Nhóm Sticker Từ Khóa Mới
                    </button>

                    <p className="text-[9.5px] text-white/45 leading-relaxed">
                      Đăng ký nhóm sticker theo cảm xúc (ví dụ: SAD, HAPPY, LAUGH). Điền các từ khóa cách nhau bằng dấu phẩy. Khi trong câu phụ đề chứa bất kỳ từ khóa nào đó, <strong>hai (2) sticker</strong> có kích thước to rõ rệt thuộc nhóm đó sẽ tự động đồng loạt bay từ hai rìa trái phải của màn hình vào vị trí ngẫu nhiên và lắc lư chuyển động vô cùng chân thực và tự nhiên.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Choice B: Highlight Custom Text */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 4 ? null : 4)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-sky-500/10 text-sky-400 font-extrabold text-xs font-mono">B</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">NỔI BẬT CHỮ</span>
                  <span className="text-[10px] text-white/40">Tự động nhận dạng các mốc ngày tháng năm hoặc chữ viết hoa để hiển thị nổi bật ở trung tâm</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 4 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 4 && (
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
                    className="w-4 h-4 rounded border-white/10 text-sky-500 focus:ring-sky-500/20 bg-black cursor-pointer"
                  />
                </div>

                {config.enableHighlightDate && (
                  <div className="space-y-4 animate-in fade-in duration-200 pt-2 border-t border-white/5">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="highlightTextModeCaps" className="text-[11px] text-white/80 cursor-pointer flex flex-col">
                          <span className="font-bold flex items-center gap-1.5 text-sky-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                            Nổi bật chữ caplock (Chuyển tiếp tự động)
                          </span>
                          <span className="text-[10px] text-white/45 mt-0.5">Nhận diện và thu phóng các từ được viết hoàn toàn bằng chữ in hoa (Ví dụ: KATIE, HELLO,...) ở trung tâm màn hình.</span>
                        </label>
                        <input
                          type="checkbox"
                          id="highlightTextModeCaps"
                          checked={config.highlightTextModeCaps !== false}
                          onChange={(e) => updateConfig('highlightTextModeCaps', e.target.checked)}
                          className="w-4 h-4 rounded border-white/10 text-sky-500 focus:ring-sky-500/20 bg-black cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="block text-[10px] text-white/50 uppercase tracking-wider font-bold">Cỡ chữ (Font Size):</span>
                          <span className="text-xs font-mono text-sky-400 font-bold">
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
                          className="w-full h-1 bg-white/10 rounded appearance-none cursor-pointer accent-sky-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-white/50 uppercase tracking-wider font-bold">Font chữ phong cách:</label>
                      <select
                        value={config.highlightDateFontFamily || 'Josefin Sans'}
                        onChange={(e) => updateConfig('highlightDateFontFamily', e.target.value)}
                        className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-medium cursor-pointer"
                      >
                        {[
                          'Arimo', 'Cardo', 'Cormorant Garamond', 'Crimson Text', 'DM Serif Display', 'Domine',
                          'Eczar', 'Frank Ruhl Libre', 'IBM Plex Sans', 'IBM Plex Serif', 'Inter', 'Josefin Sans', 'Libre Baskerville',
                          'Merriweather', 'Montserrat', 'Newsreader', 'Oswald', 'Outfit', 'Playfair Display', 'Prata',
                          'PT Sans', 'PT Serif', 'Roboto Condensed', 'Space Grotesk', 'Spectral', 'Ultra', 'Vollkorn'
                        ].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

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
                      Khi kích hoạt bôi nổi bật chữ, khi phân đoạn có ngày/tháng/năm hoặc các từ viết hoa hoàn toàn, hệ thống sẽ <strong>chỉ bôi hiển thị từ khóa nổi bật đó</strong> phóng to ở giữa màn hình bằng hiệu ứng gõ chữ từng chữ cái cực kỳ chuẩn xác và hoàn thành trước 2/3 thời gian của đoạn.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Choice C: LỊCH NGÀY THÁNG NĂM (Calendar) */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 11 ? null : 11)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-sky-500/10 text-sky-400 font-extrabold text-xs font-mono">C</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">LỊCH NGÀY THÁNG NĂM</span>
                  <span className="text-[10px] text-white/40">Tự động vẽ Lịch thiết lập 3D mỗi khi phát hiện ngày tháng năm trong phụ đề</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 11 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 11 && (
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
                    className="w-4 h-4 rounded border-white/10 text-sky-500 focus:ring-sky-500/20 bg-black cursor-pointer"
                  />
                </div>

                {config.enableFakeCalendar && (
                  <div className="space-y-2 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      Khi kích hoạt lựa chọn này, <strong className="text-sky-400">bất kỳ đoạn phụ đề nào chứa thông tin ngày tháng năm</strong> (ví dụ: <code className="text-white/80">"June 8-12"</code>, <code className="text-white/80">"15/06"</code>, <code className="text-white/80">"June 1 to June 19"</code>,...) sẽ tự động kích hoạt chế độ Lịch 3D thông minh.
                    </p>
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      Lịch cực kỳ thông minh: tự động phân tích dải ngày trong câu để <strong className="text-sky-400">bôi đen toàn bộ khoảng ngày</strong>, ngẫu nhiên chọn một trong <strong className="text-sky-400">10 phong cách thiết kế đặc trưng đầy sắc sảo</strong>, và tự động quyết định giữa hiển thị <strong className="text-sky-400">Full màn hình hay Thu nhỏ đặt trên mặt bàn</strong> để mang đến hiệu ứng thị giác tuyệt đỉnh sinh động!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* =======================================================
          NHÓM 2: CHU KỲ
         ======================================================= */}
      <div className="bg-[#050505]/40 border border-purple-500/20 rounded-xl p-5 space-y-4 shadow-lg shadow-purple-500/[0.02]">
        <div className="border-b border-purple-500/10 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>🔄 NHÓM 2: CHU KỲ (Hành vi xuất hiện tuần hoàn)</span>
            </h3>
            <p className="text-[10.5px] text-white/50 mt-1">
              Các hành vi xuất hiện lặp lại tuần hoàn. Nhập danh sách đoạn phát (Ví dụ: <code className="text-white/80">1, 3, 5</code>) hoặc nhập <code className="text-purple-400">#X</code> (Ví dụ: <code className="text-purple-400">#3</code>) để hệ thống tự động phát ngẫu nhiên X lần trong suốt cả video.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const newSeed = Math.floor(Math.random() * 1000000);
                updateConfig('behaviorSeed', newSeed);
              }}
              title="Xáo trộn lại toàn bộ các vị trí xuất hiện (đối với thiết lập #X) và thay đổi kiểu dáng hiển thị ngẫu nhiên của các hành vi!"
              className="flex items-center gap-1 text-[10px] font-black bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded cursor-pointer transition-all active:scale-95 uppercase tracking-wider"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Xáo trộn</span>
            </button>
            <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 px-2 py-1 rounded border border-purple-500/20 font-mono uppercase">1 - 10</span>
          </div>
        </div>

        <div className="space-y-3">

          {/* Choice 1 -> 1: Red Arrow & Circle */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 1 ? null : 1)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">1</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">Mũi tên đỏ & Vòng tròn chỉ định</span>
                  <span className="text-[10px] text-white/40">Tập trung sự chú ý bằng mũi tên bay vào khoanh vùng mục tiêu</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 1 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 1 && (
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
                    className="w-4 h-4 rounded border-white/10 text-purple-500 focus:ring-purple-500/20 bg-black"
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
                      placeholder="Ví dụ: 1, 3, 5 hoặc #3"
                      value={config.humanArrowBlocks || ''}
                      onChange={(e) => updateConfig('humanArrowBlocks', e.target.value)}
                      className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                      💡 Mẹo: Nhập #3 để tự động chọn ngẫu nhiên hành vi này xuất hiện đúng 3 lần trong suốt video.
                    </p>
                    <p className="text-[9.5px] text-white/45 leading-relaxed">
                      Tại các đoạn này, hệ thống sẽ tự động vẽ một vòng tròn mục tiêu màu đỏ tại điểm ngẫu nhiên, và bắn một mũi tên đỏ từ ngoài bay vào chỉ thẳng vào đó.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Choice 2 -> 2: Typewriter text typing */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 2 ? null : 2)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">2</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Gõ Chữ & Màn Mờ Đầy Bản</span>
                  <span className="text-[10px] text-white/40">Giả lập người thật đang trực tiếp gõ phụ đề kí tự trên phông nền mờ</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 2 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 2 && (
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
                    className="w-4 h-4 rounded border-white/10 text-purple-500 focus:ring-purple-500/20 bg-black"
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
                        placeholder="Ví dụ: 2, 4 hoặc #2"
                        value={config.humanTypewriterBlocks || ''}
                        onChange={(e) => updateConfig('humanTypewriterBlocks', e.target.value)}
                        className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                      />
                      <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                        💡 Mẹo: Nhập #3 để tự động chọn ngẫu nhiên hành vi này xuất hiện đúng 3 lần trong suốt video.
                      </p>
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
                                    ? 'bg-purple-600 border-purple-500 text-white shadow'
                                    : 'bg-[#121217] border-white/10 text-white/50 hover:bg-white/5 cursor-pointer'
                              }`}
                            >
                              {presetColor.label}
                            </button>
                          );
                        })}

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
                        className="w-4 h-4 rounded border-white/10 text-purple-500 focus:ring-purple-500/20 bg-black cursor-pointer"
                      />
                      <label htmlFor="randomTypewriterColor" className="text-[11px] text-white/70 select-none cursor-pointer font-medium leading-tight">
                        🎲 Tự động chọn ngẫu nhiên 1 trong 10 màu sắc trên cho mỗi phân đoạn gõ chữ
                      </label>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">Độ mờ màn nền (Opacity)</span>
                        <span className="text-xs font-mono text-purple-400 font-bold">
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
                        className="w-full h-1 bg-white/10 rounded appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    <div className="space-y-2 pt-2.5 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">Âm lượng tiếng gõ phím (Typewriter)</span>
                        <span className="text-xs font-mono text-purple-400 font-bold">
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
                          className="flex-1 h-1 bg-white/10 rounded appearance-none cursor-pointer accent-purple-500"
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
                          className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/25 hover:border-purple-500/40 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap active:scale-95 flex items-center gap-1.5"
                        >
                          ▶ Thử tiếng gõ
                        </button>
                      </div>
                    </div>

                    <p className="text-[9.5px] text-white/45 leading-relaxed">
                      Tại các phân đoạn này, một lớp phủ màu sắc mờ tùy chọn với độ mờ tùy chỉnh sẽ che trọn màn hình, và phụ đề được hiển thị bằng hiệu ứng gõ đập cơ giả lập hoàn thành gõ trước khi kết thúc đoạn <strong>2/3 thời lượng</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Choice 5 -> 3: Background Noise */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 5 ? null : 5)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">3</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">Thêm Tạp Âm Giả Lập Môi Trường</span>
                  <span className="text-[10px] text-white/40">Kích hoạt tạp âm đời thực rải rác để vượt qua cơ chế quét AI của YouTube</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 5 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 5 && (
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
                    className="w-4 h-4 rounded border-white/10 text-purple-500 focus:ring-purple-500/20 bg-black cursor-pointer"
                  />
                </div>

                {config.enableBackgroundNoise && (
                  <div className="space-y-4 animate-in fade-in duration-200 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      Hãy nhập danh sách đoạn phát (Ví dụ: <code className="text-white/80">1, 3</code>) hoặc nhập <code className="text-purple-400">#X</code> (Ví dụ: <code className="text-purple-400">#3</code>) bên cạnh từng loại tiếng để hệ thống tự động bồi đắp dải âm sinh hoạt sống động khi xuất video.
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
                                <span className="text-[11.5px] font-bold text-purple-300 block">{item.name}</span>
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
                                  className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 hover:border-purple-500/40 rounded-md text-[9.5px] font-bold transition-all whitespace-nowrap active:scale-95"
                                >
                                  🔊 Nghe thử
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              <div className="space-y-1">
                                <label className="block text-[9.5px] text-white/55 font-bold tracking-wider">Đoạn phụ đề kích hoạt (Ví dụ: 1, 3 hoặc #2):</label>
                                <input
                                  type="text"
                                  placeholder="Ví dụ: 1, 3 hoặc #2"
                                  value={activeNoiseConfig.segments || ''}
                                  onChange={(e) => handleNoiseConfigChange('segments', e.target.value)}
                                  className="w-full bg-[#121217] border border-white/5 rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                                />
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9.5px] text-white/50 uppercase font-bold tracking-wider">Âm lượng (Volume):</span>
                                  <span className="text-[10px] font-mono text-purple-400 font-bold">{activeNoiseConfig.volume}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="5"
                                  value={activeNoiseConfig.volume}
                                  onChange={(e) => handleNoiseConfigChange('volume', parseInt(e.target.value))}
                                  className="w-full h-1 bg-white/5 rounded appearance-none cursor-pointer accent-purple-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[9px] text-purple-400/70 italic leading-normal">
                      * Các tạp âm này được thiết kế dựa trên thuật toán dao động sóng âm tự nhiên (Programmatic Synthesis) – giúp cho video biến đổi phổ âm tần cực kỳ phong phú và qua mặt 100% các bộ lọc nhận dạng của YouTube một cách an toàn nhất!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Choice 6 -> 4: Fake News Effect */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 6 ? null : 6)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">4</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">Hiếu ứng Báo chí "FAKE NEWS"</span>
                  <span className="text-[10px] text-white/40">Thay thế bằng trang báo in thực tế, bôi nhòe dải tin phụ và bôi vàng 2 từ tâm điểm</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 6 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 6 && (
              <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label htmlFor="fakeNewsBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                      Danh sách số thứ tự các đoạn xuất hiện
                    </label>
                    <input
                      type="text"
                      id="fakeNewsBlocks"
                      placeholder="Ví dụ: 2, 4 hoặc #2"
                      value={config.fakeNewsBlocks || ''}
                      onChange={(e) => updateConfig('fakeNewsBlocks', e.target.value)}
                      className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                      💡 Mẹo: Nhập #3 để tự động chọn ngẫu nhiên hành vi báo chí này xuất hiện đúng 3 lần trong suốt video.
                    </p>
                    <p className="text-[9.5px] text-white/45 leading-relaxed">
                      Trình chiếu sẽ tự động chuyển đổi nền sang trang báo in sang trọng, làm mờ dải tin xung quanh một cách mượt mà và làm nổi bật dải thuyết minh bằng phong cách vẽ bút dạ bôi vàng (Highlighter Marker) cực kỳ nghệ thuật!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Choice 7 -> 5: Handwriting Effect */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 7 ? null : 7)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">5</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Bút viết "BÚT VIẾT CHỮ"</span>
                  <span className="text-[10px] text-white/40">Thay thế bằng trang giấy học sinh có dòng kẻ, hiển thị hiệu ứng bút vẽ từng ký tự mượt mà</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 7 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 7 && (
              <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label htmlFor="handWriteBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                      Danh sách số thứ tự các đoạn xuất hiện
                    </label>
                    <input
                      type="text"
                      id="handWriteBlocks"
                      placeholder="Ví dụ: 3, 5 hoặc #3"
                      value={config.handWriteBlocks || ''}
                      onChange={(e) => updateConfig('handWriteBlocks', e.target.value)}
                      className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                      💡 Mẹo: Nhập #3 để tự động chọn ngẫu nhiên hành vi bút viết này xuất hiện đúng 3 lần trong suốt video.
                    </p>
                    <p className="text-[9.5px] text-white/45 leading-relaxed">
                      Trình chiếu sẽ tự động chuyển đổi nền sang trang giấy học sinh cổ điển mộc mạc và hiển thị một chiếc bút viết mượt mà từng chữ cái theo thời gian khớp chuẩn xác với nhịp đọc!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Choice 8 -> 6: Fake Comment Effect */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 8 ? null : 8)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">6</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Bình luận "FAKE COMMENT"</span>
                  <span className="text-[10px] text-white/40">Giao diện bình luận với hiệu ứng cuộn, sử dụng con trỏ chuột bôi đen 2 từ nổi bật</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 8 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 8 && (
              <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label htmlFor="fakeCommentBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                      Danh sách số thứ tự các đoạn xuất hiện
                    </label>
                    <input
                      type="text"
                      id="fakeCommentBlocks"
                      placeholder="Ví dụ: 1, 4 hoặc #2"
                      value={config.fakeCommentBlocks || ''}
                      onChange={(e) => updateConfig('fakeCommentBlocks', e.target.value)}
                      className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                      💡 Mẹo: Nhập #3 để tự động chọn ngẫu nhiên hành vi bình luận này xuất hiện đúng 3 lần trong suốt video.
                    </p>
                    <p className="text-[9.5px] text-white/45 leading-relaxed">
                      Trình chiếu sẽ tự động chuyển sang giao diện danh sách bình luận (Comment feed) hiện đại, cuộn mượt xuống và dừng lại tại bình luận target. Sau đó, một con trỏ chuột thực tế sẽ di chuyển và bôi chọn (highlight bôi đen) hai từ tâm điểm một cách uyển chuyển!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Choice 9 -> 7: Fake Website Effect */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 9 ? null : 9)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">7</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Trang báo "FAKE WEBSITE"</span>
                  <span className="text-[10px] text-white/40">Giao diện trang báo tin tức với các đoạn văn, ảnh quảng cáo được làm mờ dập khuôn, làm nổi bật và bôi đen 2 từ đoạn sub chuẩn</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 9 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 9 && (
              <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label htmlFor="fakeWebsiteBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                      Danh sách số thứ tự các đoạn xuất hiện
                    </label>
                    <input
                      type="text"
                      id="fakeWebsiteBlocks"
                      placeholder="Ví dụ: 2, 5 hoặc #2"
                      value={config.fakeWebsiteBlocks || ''}
                      onChange={(e) => updateConfig('fakeWebsiteBlocks', e.target.value)}
                      className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                      💡 Mẹo: Nhập #3 để tự động chọn ngẫu nhiên hành vi trang báo này xuất hiện đúng 3 lần trong suốt video.
                    </p>
                    <p className="text-[9.5px] text-white/45 leading-relaxed">
                      Hệ thống sẽ dựng một trang báo tin tức giống hệt thật với đa dạng đoạn văn chi chít chữ và các biểu ngữ quảng cáo xung quanh. Toàn bộ trang báo sẽ bị làm mờ để giữ lại duy nhất đoạn phụ đề trung tâm hiển thị sắc nét. Một con trỏ chuột môphỏng sẽ trượt mượt xuống, tự động bôi đen hai từ tâm điểm!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Choice 10 -> 8: Fake Video Editor Effect */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 10 ? null : 10)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">8</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Dựng phim "FAKE EDIT VIDEO"</span>
                  <span className="text-[10px] text-white/40">Giao diện một phần mềm edit video chuyên nghiệp với timeline, track và chuột drag-and-drop kéo dãn tiến trình</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 10 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 10 && (
              <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label htmlFor="fakeVideoEditorBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                      Danh sách số thứ tự các đoạn xuất hiện
                    </label>
                    <input
                      type="text"
                      id="fakeVideoEditorBlocks"
                      placeholder="Ví dụ: 3, 6 hoặc #2"
                      value={config.fakeVideoEditorBlocks || ''}
                      onChange={(e) => updateConfig('fakeVideoEditorBlocks', e.target.value)}
                      className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                      💡 Mẹo: Nhập #3 để tự động chọn ngẫu nhiên hành vi dựng phim này xuất hiện đúng 3 lần trong suốt video.
                    </p>
                    <p className="text-[9.5px] text-white/45 leading-relaxed">
                      Khung hình sẽ chuyển thành giao diện của một ứng dụng biên tập video chuyên dụng. Con trỏ chuột mô phỏng sẽ tự động di chuyển đến timeline, nhấp giữ và kéo co dãn block phụ đề, đồng thời di chuyển mượt mà lên màn hình để chọn bôi đen các từ cực kỳ chân thực!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Choice 12 -> 9: GÕ CẢM ỨNG (Touch Typing) */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 12 ? null : 12)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">9</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">GIẢ LẬP GÕ CẢM ỨNG IPAD</span>
                  <span className="text-[10px] text-white/40">Giao diện iPad ngang nhắn tin, bàn phím gõ chạm từng phím cực sinh động</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 12 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 12 && (
              <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label htmlFor="touchTypingBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                      Danh sách số thứ tự các đoạn xuất hiện
                    </label>
                    <input
                      type="text"
                      id="touchTypingBlocks"
                      placeholder="Ví dụ: 1, 3, 5 hoặc #3"
                      value={config.touchTypingBlocks || ''}
                      onChange={(e) => updateConfig('touchTypingBlocks', e.target.value)}
                      className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                      💡 Mẹo: Nhập #3 để tự động chọn ngẫu nhiên hành vi gõ cảm ứng này xuất hiện đúng 3 lần trong suốt video.
                    </p>
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
                        className="w-3.5 h-3.5 rounded border-white/10 text-purple-500 focus:ring-purple-500/20 bg-black cursor-pointer"
                      />
                    </div>

                    {config.enableTouchTypingSound !== false && (
                      <div className="space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/45 font-medium uppercase">Âm lượng gõ phím</span>
                          <span className="text-[10.5px] text-purple-400 font-mono font-bold">
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
                            className="flex-1 h-1 bg-white/10 rounded appearance-none cursor-pointer accent-purple-500"
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
                            className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/25 hover:border-purple-500/40 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap active:scale-95 flex items-center gap-1.5"
                          >
                            ▶ Thử tiếng gõ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Màn hình iPad nhắn tin nằm ngang hiển thị các tin nhắn trò chuyện màu xám/xanh ở phía trên, và bàn phím cảm ứng iPad ở phía dưới, gõ theo phụ đề với hiệu ứng chạm phím nhảy chữ sinh động!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Choice 13 -> 10: DRAW CIRCLE MOUSE */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 13 ? null : 13)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">10</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">CON TRỎ CHUỘT</span>
                  <span className="text-[10px] text-white/40">Con trỏ chuột di chuyển lên ngẫu nhiên, vẽ ký hiệu chỉ điểm tự nhiên</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 13 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 13 && (
              <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label htmlFor="drawCircleBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                      Danh sách bài phát vẽ TRÒN ĐỎ có mũi tên riêng
                    </label>
                    <input
                      type="text"
                      id="drawCircleBlocks"
                      placeholder="Ví dụ: 2, 4 hoặc #3"
                      value={config.drawCircleBlocks || ''}
                      onChange={(e) => updateConfig('drawCircleBlocks', e.target.value)}
                      className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                      💡 Mẹo: Nhập #3 để tự động chọn ngẫu nhiên hành vi vẽ vòng tròn này xuất hiện đúng 3 lần trong suốt video.
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-3 border-t border-white/5">
                    <label htmlFor="drawXBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                      Danh sách bài phát vẽ CHỮ X ĐỎ tự nhiên riêng
                    </label>
                    <input
                      type="text"
                      id="drawXBlocks"
                      placeholder="Ví dụ: 3, 5 hoặc #2"
                      value={config.drawXBlocks || ''}
                      onChange={(e) => updateConfig('drawXBlocks', e.target.value)}
                      className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                      💡 Mẹo: Nhập #2 để tự động chọn ngẫu nhiên hành vi vẽ chữ X này xuất hiện đúng 2 lần trong suốt video.
                    </p>
                  </div>

                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Con trỏ chuột mô phỏng sẽ di chuyển tự nhiên đến vị trí bất kỳ trên màn hình (được tự động giữ cách xa các lề canvas), thực hiện phác họa nét vòng tròn và mũi tên hoặc chữ X đỏ sinh động, chân thực!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Choice 14 -> 11: FAKE BÌNH CHỌN (Fake Poll - NEW) */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 14 ? null : 14)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">11</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Bình chọn "FAKE POLL"</span>
                  <span className="text-[10px] text-white/40">Giao diện bình chọn cộng đồng tiếng Anh chuyên nghiệp với 10 phong cách tuyệt đẹp</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 14 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 14 && (
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
                      className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
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
              onClick={() => setActiveAccordion(activeAccordion === 15 ? null : 15)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">12</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">Hiệu ứng Chụp màn hình Comment "SCREENSHOT COMMENT"</span>
                  <span className="text-[10px] text-white/40">Giả lập chụp comment ấn tượng từ MXH tiếng Anh với nút bấm chuyên nghiệp, thả tim ghim hoặc bôi đen chữ</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 15 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 15 && (
              <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label htmlFor="screenshotCommentBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                      Danh sách số thứ tự các đoạn xuất hiện
                    </label>
                    <input
                      type="text"
                      id="screenshotCommentBlocks"
                      placeholder="Ví dụ: 2, 4 hoặc #3"
                      value={config.screenshotCommentBlocks || ''}
                      onChange={(e) => updateConfig('screenshotCommentBlocks', e.target.value)}
                      className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
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

          {/* Choice 16 -> 13: FAKE BÁO ONLINE */}
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]">
            <button
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 16 ? null : 16)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs font-mono">13</span>
                <div>
                  <span className="text-[11.5px] font-bold text-white block">Hiệu ứng "FAKE BÁO ONLINE"</span>
                  <span className="text-[10px] text-white/40">Giả vờ đọc báo online: trình duyệt tỷ lệ 12/9, tiêu đề là phụ đề phóng to, cuộn lăn chuột và bôi đen chuột phải copy</span>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{activeAccordion === 16 ? '▲' : '▼'}</span>
            </button>

            {activeAccordion === 16 && (
              <div className="p-4 border-t border-white/5 bg-[#050505]/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label htmlFor="fakeNewsPaperBlocks" className="block text-[10.5px] text-white/60 font-semibold uppercase tracking-wider">
                      Danh sách số thứ tự các đoạn xuất hiện
                    </label>
                    <input
                      type="text"
                      id="fakeNewsPaperBlocks"
                      placeholder="Ví dụ: 3, 6 hoặc #2"
                      value={config.fakeNewsPaperBlocks || ''}
                      onChange={(e) => updateConfig('fakeNewsPaperBlocks', e.target.value)}
                      className="w-full bg-[#121217] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                      💡 Mẹo: Nhập #3 để tự động chọn ngẫu nhiên hành vi giả vờ đọc báo tin tức này xuất hiện đúng 3 lần trong suốt video.
                    </p>
                    <p className="text-[9.5px] text-white/45 leading-relaxed">
                      Trình chiếu sẽ hiển thị trực quan một trình duyệt tin tức thực sự với kích thước 12/9. Tiêu đề bài viết chính là nội dung phụ đề hiển thị sắc nét bằng phông chữ tin tức. Trình cơ chế tự động cuộn xuống đầy đủ ảnh đoạn đó kèm bài viết tiếng Anh được làm mờ kỳ ảo, sau đó bôi đen hai lần toàn bộ tiêu đề, chuột phải và bấm sao chép (copy) vô cùng chuyên nghiệp!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
