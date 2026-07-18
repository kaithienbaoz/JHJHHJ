import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Storage Polyfill for sandboxed iframe environments (to avoid SecurityError on localStorage)
if (typeof window !== 'undefined') {
  let isLocalStorageAvailable = false;
  try {
    const testKey = '__vsync_storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    isLocalStorageAvailable = true;
  } catch (e) {
    console.warn("⚠️ localStorage is blocked or throws SecurityError inside iframe. Initializing memory fallback...", e);
  }

  if (!isLocalStorageAvailable) {
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem(key: string): string | null {
        return store[key] !== undefined ? store[key] : null;
      },
      setItem(key: string, value: string): void {
        store[key] = String(value);
      },
      removeItem(key: string): void {
        delete store[key];
      },
      clear(): void {
        for (const key of Object.keys(store)) {
          delete store[key];
        }
      },
      get length(): number {
        return Object.keys(store).length;
      },
      key(index: number): string | null {
        return Object.keys(store)[index] || null;
      }
    };

    try {
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
        enumerable: true
      });
      console.log("✓ Successfully redefined window.localStorage with memory polyfill");
    } catch (err1) {
      try {
        const WindowProto = Object.getPrototypeOf(window);
        if (WindowProto) {
          Object.defineProperty(WindowProto, 'localStorage', {
            get() { return mockLocalStorage; },
            configurable: true,
            enumerable: true
          });
          console.log("✓ Successfully redefined Window.prototype.localStorage with memory polyfill getter");
        }
      } catch (err2) {
        console.error("❌ Failed to polyfill window.localStorage. Some storage operations may fail in sandbox.", err2);
      }
    }
  }
}

import App from './App.tsx';
import './index.css';

// Add robust global runtime error reporting for iframe sandbox environments
if (typeof window !== 'undefined') {
  const handleError = (error: any) => {
    console.error("Caught global runtime error:", error);
    
    // Prevent rendering multiple error overlays
    if (document.getElementById('global-error-overlay')) return;
    
    const errorMsg = error?.message || error?.reason?.message || String(error);
    const errorStack = error?.stack || error?.reason?.stack || '';
    
    const overlay = document.createElement('div');
    overlay.id = 'global-error-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(17, 19, 21, 0.95)';
    overlay.style.color = '#e0e0e0';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '24px';
    overlay.style.boxSizing = 'border-box';
    overlay.style.fontFamily = 'Inter, system-ui, sans-serif';
    
    overlay.innerHTML = `
      <div style="max-w: 600px; width: 100%; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); background-color: #1e2226;">
        <div style="display: flex; align-items: center; gap: 16px; color: #ef4444; margin-bottom: 24px;">
          <div style="padding: 12px; background-color: rgba(239, 68, 68, 0.1); border-radius: 12px; font-weight: bold; font-size: 24px;">⚠️</div>
          <div>
            <h1 style="margin: 0; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Lỗi Tải Ứng Dụng (Runtime Error)</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.5);">Trình duyệt hoặc hệ thống phát hiện sự cố nghiêm trọng.</p>
          </div>
        </div>
        
        <div style="margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.8);">Chi tiết lỗi:</p>
          <div style="padding: 16px; background-color: #141618; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); font-family: monospace; font-size: 12px; color: #f87171; overflow: auto; max-height: 200px; white-space: pre-wrap; word-break: break-all; line-height: 1.6;">
            ${errorMsg}
            ${errorStack ? '\n\nStack Trace:\n' + errorStack : ''}
          </div>
        </div>
        
        <div style="display: flex; gap: 12px;">
          <button id="error-btn-reload" style="flex: 1; padding: 12px; background-color: #2563eb; color: white; border: none; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background-color 0.2s;">Tải lại trang (Reload)</button>
          <button id="error-btn-reset" style="flex: 1; padding: 12px; background-color: #27272a; color: #d4d4d8; border: none; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background-color 0.2s;">Xóa cấu hình lỗi (Reset)</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('error-btn-reload')?.addEventListener('click', () => {
      window.location.reload();
    });
    
    document.getElementById('error-btn-reset')?.addEventListener('click', () => {
      if (confirm("Bạn có chắc chắn muốn đặt lại dữ liệu? Thao tác này sẽ xóa cache localStorage để khắc phục xung đột.")) {
        try {
          localStorage.clear();
        } catch (e) {
          console.warn("Could not clear localStorage:", e);
        }
        window.location.reload();
      }
    });
  };

  window.addEventListener('error', (event) => {
    // Standard error event
    handleError(event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Unhandled promise rejections
    handleError(event.reason || 'Unhandled Promise Rejection');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
