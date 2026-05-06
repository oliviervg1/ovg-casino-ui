import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
    },
  })),
  Modality: { AUDIO: 'AUDIO' },
}));

describe('gemini.generateImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the raw image bytes from the first inline data part', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ inlineData: { data: 'aGVsbG8=', mimeType: 'image/png' } }] } }],
    });
    const { generateImage } = await import('./gemini.js');
    const out = await generateImage({ apiKey: 'k', prompt: 'test', aspectRatio: '1:1' });
    expect(out.bytes).toEqual(Buffer.from('hello'));
    expect(out.mimeType).toBe('image/png');
  });

  it('throws when the response has no inline image data', async () => {
    mockGenerateContent.mockResolvedValueOnce({ candidates: [{ content: { parts: [{ text: 'sorry' }] } }] });
    const { generateImage } = await import('./gemini.js');
    await expect(generateImage({ apiKey: 'k', prompt: 'test', aspectRatio: '1:1' }))
      .rejects.toThrow(/no image data/i);
  });
});

describe('gemini.generateMusic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('concatenates audio chunks from the stream into a single Buffer', async () => {
    async function* stream() {
      yield { candidates: [{ content: { parts: [{ inlineData: { data: 'aGVsbG8=', mimeType: 'audio/wav' } }] } }] };
      yield { candidates: [{ content: { parts: [{ inlineData: { data: 'd29ybGQ=', mimeType: 'audio/wav' } }] } }] };
    }
    mockGenerateContentStream.mockResolvedValueOnce(stream());
    const { generateMusic } = await import('./gemini.js');
    const out = await generateMusic({ apiKey: 'k', prompt: 'jazzy' });
    expect(out.bytes).toEqual(Buffer.concat([Buffer.from('hello'), Buffer.from('world')]));
    expect(out.mimeType).toBe('audio/wav');
  });
});
