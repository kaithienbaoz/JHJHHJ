/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with a generous body limit
  app.use(express.json({ limit: '20mb' }));

  // Shared server-side Gemini client
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey 
    ? new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      })
    : null;

  // Standard API health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasApiKey: !!apiKey });
  });

  // AI Subtitle word/association analyzer endpoint with Gemini Mime-response
  app.post('/api/gemini/suggest-keywords', async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ 
          error: 'GEMINI_API_KEY is not set. Please configure it in your Secrets panel.' 
        });
      }

      const { subtitles, characters } = req.body;

      if (!subtitles || !Array.isArray(subtitles)) {
        return res.status(400).json({ error: 'Missing or invalid "subtitles" array.' });
      }

      if (!characters || !Array.isArray(characters)) {
        return res.status(400).json({ error: 'Missing or invalid "characters" list.' });
      }

      // If no characters exist yet, suggest standard key attributes or nothing
      const charDescription = characters.map(c => 
        `- Character: "${c.name}", valid keywords: [${(c.keywords || []).map((k: string) => `"${k}"`).join(', ')}]`
      ).join('\n');

      const systemInstruction = `You are an expert creative assistant for subtitle-to-image matching in video production.
Your task is to analyze subtitle lines (subtexts) and identify the most appropriate characters (and which keywords to select) from a list of valid characters.

Even if the subtext doesn't directly contain the exact keyword word, read between the lines, analyze the dialogue, the sentiments, pronouns, and typical references (e.g., if a stepdaughter or wife is mentioned, cross-reference valid character relationships if possible).
Return EXACTLY matching keyword strings from the available keywords list for each character.
Output up to 3 distinct valid keywords per subtitle block based on character importance or references in the sentence. Match values must be in lower case.`;

      const prompt = `Available Characters and Keywords:
${charDescription}

Subtitles to Analyze:
${JSON.stringify(subtitles.map(s => ({ id: s.id, text: s.text })))}

Predict the best-matched keywords for each subtitle block. Use ONLY keywords that exist in the available characters valid keywords list above! If absolutely no character fits, return an empty array for suggestedKeywords.`;

      // Call the Google GenAI SDK with structured rules
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER, description: 'The original subtitle block ID' },
                    suggestedKeywords: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'List of matching valid lowercase keyword strings that belong to the appropriate characters. Max 3 keywords.'
                    },
                    explanation: { type: Type.STRING, description: 'Brief Vietnamese explanation of why this character keyword is suggested (e.g. \"Ridge được nhắc đến qua vai trò bố dượng, Hope là con riêng\").' }
                  },
                  required: ['id', 'suggestedKeywords']
                }
              }
            },
            required: ['suggestions']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        return res.status(500).json({ error: 'No response text received from Gemini.' });
      }

      const parsedJSON = JSON.parse(responseText.trim());
      res.json(parsedJSON);

    } catch (error: any) {
      console.error('Error suggesting keywords with Gemini:', error);
      let clientMsg = error.message || 'Failed to analyze subtitles with AI.';
      if (typeof clientMsg === 'string' && (clientMsg.includes('leaked') || clientMsg.includes('API key') || clientMsg.includes('403') || clientMsg.includes('PERMISSION_DENIED'))) {
        clientMsg = 'Khóa API Gemini (GEMINI_API_KEY) hiện tại của bạn đã bị lỗi bảo mật (bị khóa bởi Google do phát hiện rò rỉ - Leaked Key). Vui lòng vào Google AI Studio, lấy một API Key mới HOÀN TOÀN MIỄN PHÍ, tiếp đó cập nhật vào phần Settings / Secrets của ứng dụng.';
      }
      res.status(500).json({ error: clientMsg });
    }
  });

  // Stop words for keyword extraction
  const STOP_WORDS = new Set([
    'at', 'of', 'and', 'the', 'with', 'or', 'in', 'to', 'on', 'by', 'for', 'an', 'is', 'it', 'about', 'from', 'as', 
    'this', 'that', 'these', 'those', 'then', 'here', 'there', 'who', 'whom', 'where', 'when', 'why', 'how', 'which',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'not', 'no', 'yes', 'so', 'if', 'your',
    'my', 'their', 'our', 'his', 'her', 'its', 'me', 'you', 'he', 'she', 'they', 'we', 'us', 'him', 'them',
    'cua', 'va', 'trong', 'cho', 'nhu', 'nhung', 'co', 'nay', 'do', 'kia', 'của', 'và', 'trong', 'cho', 'như', 'những', 'có', 'này', 'đó', 'kia',
    'gh', 'thì', 'là', 'mà', 'gì', 'nào', 'với', 'về', 'để', 'cũng', 'đã', 'đang', 'sẽ', 'được', 'từ', 'qua', 'bởi', 'tại', 'ra', 'vào', 'lên', 'xuống', 'lại', 'thêm'
  ]);

  // Helper to recursively scan a folder
  function scanDirectory(dir: string, baseDir: string, list: any[] = []) {
    if (!fs.existsSync(dir)) return list;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDirectory(fullPath, baseDir, list);
        } else if (stat.isFile()) {
          const ext = path.extname(file).toLowerCase();
          const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(ext);
          const isVideo = ['.mp4', '.mov', '.avi', '.webm', '.mkv'].includes(ext);
          
          if (isImage || isVideo) {
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            const pathParts = relativePath.split('/');
            
            // Direct parent directory name if in a subdirectory
            let characterName = 'Không có nhân vật';
            if (pathParts.length > 1) {
              characterName = pathParts[pathParts.length - 2];
            }

            // Extract keywords
            const keywordsSet = new Set<string>();
            const processSegment = (segment: string) => {
              const nameWithoutExt = segment.substring(0, segment.lastIndexOf('.')) || segment;
              const words = nameWithoutExt.split(/[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+/i);
              words.forEach(w => {
                const trimmed = w.trim();
                if (trimmed.length >= 2 && !/^\d+$/.test(trimmed) && !STOP_WORDS.has(trimmed.toLowerCase())) {
                  keywordsSet.add(trimmed);
                }
              });
            };

            processSegment(file);
            if (pathParts.length > 1) {
              for (let i = 0; i < pathParts.length - 1; i++) {
                processSegment(pathParts[i]);
              }
            }

            list.push({
              id: 'local_' + Buffer.from(fullPath).toString('base64'),
              name: file,
              path: fullPath,
              url: `/api/local-folder/file?path=${encodeURIComponent(fullPath)}`,
              keywords: Array.from(keywordsSet),
              characterName,
              isVideo
            });
          }
        }
      } catch (e) {
        console.warn("Error scanning local file:", fullPath, e);
      }
    }
    return list;
  }

  // Scan folder endpoint
  app.post('/api/local-folder/scan', (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ error: 'Thiếu đường dẫn thư mục folderPath' });
    }

    try {
      const resolvedPath = path.resolve(folderPath);
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ error: 'Đường dẫn thư mục không tồn tại trên máy tính.' });
      }

      const stat = fs.statSync(resolvedPath);
      if (!stat.isDirectory()) {
        return res.status(400).json({ error: 'Đường dẫn được cung cấp không phải là một thư mục.' });
      }

      const list = scanDirectory(resolvedPath, resolvedPath);
      res.json({ success: true, count: list.length, items: list });
    } catch (err: any) {
      console.error('Error scanning folder:', err);
      res.status(500).json({ error: err.message || 'Lỗi quét thư mục.' });
    }
  });

  // Serve local file endpoint
  app.get('/api/local-folder/file', (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'Thiếu tham số path' });
    }

    try {
      const resolvedPath = path.resolve(filePath);
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ error: 'File không tồn tại.' });
      }
      res.sendFile(resolvedPath);
    } catch (err: any) {
      console.error('Error sending local file:', err);
      res.status(500).json({ error: 'Lỗi tải file cục bộ.' });
    }
  });

  // Serve static assets correctly using Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[V-Sync Server] Application server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[V-Sync Server] Failed to bootstrap application server:', err);
});
