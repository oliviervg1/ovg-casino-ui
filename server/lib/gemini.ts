import { GoogleGenAI } from '@google/genai';

export interface ImageRequest {
  apiKey: string;
  prompt: string;
  aspectRatio: '1:1' | '16:9';
}

export interface MusicRequest {
  apiKey: string;
  prompt: string;
}

export interface GeneratedAsset {
  bytes: Buffer;
  mimeType: string;
}

export async function generateImage(req: ImageRequest): Promise<GeneratedAsset> {
  const ai = new GoogleGenAI({ apiKey: req.apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: { parts: [{ text: req.prompt }] },
    config: {
      // imageSize '512' is supported per the SDK's internal ImageConfig_2
      // type (~5x cheaper than the publicly-documented '1K'/'2K'/'4K').
      imageConfig: { aspectRatio: req.aspectRatio, imageSize: '512' },
    },
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        bytes: Buffer.from(part.inlineData.data, 'base64'),
        mimeType: part.inlineData.mimeType ?? 'image/png',
      };
    }
  }
  throw new Error('No image data in Gemini response');
}

export async function generateMusic(req: MusicRequest): Promise<GeneratedAsset> {
  const ai = new GoogleGenAI({ apiKey: req.apiKey });
  const stream = await ai.models.generateContentStream({
    model: 'lyria-3-pro-preview',
    contents: req.prompt,
  });
  const chunks: Buffer[] = [];
  let mimeType = 'audio/wav';
  for await (const chunk of stream) {
    const parts = chunk.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        chunks.push(Buffer.from(part.inlineData.data, 'base64'));
        if (part.inlineData.mimeType) mimeType = part.inlineData.mimeType;
      }
    }
  }
  if (chunks.length === 0) throw new Error('No audio data in Gemini response');
  return { bytes: Buffer.concat(chunks), mimeType };
}
