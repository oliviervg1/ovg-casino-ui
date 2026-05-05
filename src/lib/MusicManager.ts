import { GoogleGenAI, Modality } from "@google/genai";
import { get, set, keys, del } from 'idb-keyval';

const MUSIC_PROMPTS: Record<string, string> = {
  // Sweets
  sweets_roulette: "A cheerful, upbeat chiptune track for a candy-themed roulette game.",
  sweets_slots: "A bouncy, energetic track with sweet bell sounds for a candy-themed slot machine game.",
  sweets_bingo: "A relaxing, happy melody with xylophone for a candy-themed bingo game.",
  // Egypt
  egypt_roulette: "An adventurous, cinematic track with Middle Eastern instruments for an ancient Egyptian roulette game.",
  egypt_slots: "A mysterious, rhythmic track with percussion for an ancient Egyptian slot machine game.",
  egypt_bingo: "A slow, atmospheric track with flutes for an ancient Egyptian bingo game.",
  // Space
  space_roulette: "A futuristic, electronic synthwave track for a sci-fi space roulette game.",
  space_slots: "An upbeat, techno track with laser sounds for a sci-fi space slot machine game.",
  space_bingo: "A ambient, cosmic track with deep bass for a sci-fi space bingo game.",
  // West
  west_roulette: "A lively, acoustic country track with guitars for a wild west roulette game.",
  west_slots: "A fast-paced, saloon piano track for a wild west slot machine game.",
  west_bingo: "A slow, acoustic guitar track for a wild west bingo game.",
  // Ocean
  ocean_roulette: "A tropical, calypso track with steel drums for an underwater roulette game.",
  ocean_slots: "A bubbly, upbeat track with marimbas for an underwater slot machine game.",
  ocean_bingo: "A relaxing, ambient track with harp sounds for an underwater bingo game.",
  // Jungle
  jungle_roulette: "An energetic, tribal track with heavy percussion for a jungle roulette game.",
  jungle_slots: "A rhythmic, upbeat track with animal sounds for a jungle slot machine game.",
  jungle_bingo: "A calm, ambient track with bird sounds for a jungle bingo game.",
  // Vampire
  vampire_roulette: "A dark, gothic orchestral track with organs for a vampire roulette game.",
  vampire_slots: "A spooky, intense track with strings for a vampire slot machine game.",
  vampire_bingo: "A slow, eerie track with harpsichord for a vampire bingo game.",
  // Ninja
  ninja_roulette: "A fast-paced, traditional Japanese track with shamisen for a ninja roulette game.",
  ninja_slots: "An energetic, rhythmic track with taiko drums for a ninja slot machine game.",
  ninja_bingo: "A peaceful, ambient track with shakuhachi flute for a ninja bingo game.",
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_CONCURRENT = 1;
let activeGenerations = 0;
const pendingQueue: (() => void)[] = [];

async function acquireSlot() {
  if (activeGenerations < MAX_CONCURRENT) {
    activeGenerations++;
    return;
  }
  return new Promise<void>(resolve => pendingQueue.push(resolve));
}

function releaseSlot() {
  if (pendingQueue.length > 0) {
    const next = pendingQueue.shift();
    next?.();
  } else {
    activeGenerations--;
  }
}

let quotaExceeded = false;

async function generateMusicWithRetry(prompt: string, retries = 3, backoff = 10000): Promise<string> {
  if (quotaExceeded) {
    throw new Error('Quota exceeded');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContentStream({
      model: "lyria-3-pro-preview",
      contents: prompt,
      config: {
        responseModalities: [Modality.AUDIO],
      }
    });

    let audioBase64 = "";
    let mimeType = "audio/wav";

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
      }
    }

    if (!audioBase64) {
      throw new Error('No audio data returned from model');
    }

    // Return base64 for caching
    return `data:${mimeType};base64,${audioBase64}`;
  } catch (error: any) {
    if (error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429')) {
      if (retries > 0) {
        console.warn(`Rate limit hit for music, retrying in ${backoff}ms...`);
        await delay(backoff);
        return generateMusicWithRetry(prompt, retries - 1, backoff * 2);
      }
      throw new Error('Quota exceeded');
    }
    throw error;
  }
}

function base64ToBlobUrl(dataUrl: string): string {
  const [header, base64] = dataUrl.split(',');
  const mimeType = header.split(':')[1].split(';')[0];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export async function getMusic(theme: string, gameType: string): Promise<string | null> {
  const key = `${theme}_${gameType}`;
  const prompt = MUSIC_PROMPTS[key];
  if (!prompt) return null;

  try {
    const cached = await get(`music_v1_${key}`);
    if (cached) {
      return base64ToBlobUrl(cached as string);
    }

    if (!quotaExceeded) {
      console.log(`Queuing music generation: ${key}...`);
    }

    await acquireSlot();
    let dataUrl: string;
    try {
      if (!quotaExceeded) {
        console.log(`Generating music: ${key}...`);
      }
      dataUrl = await generateMusicWithRetry(prompt);
      await delay(5000); 
    } finally {
      releaseSlot();
    }

    await set(`music_v1_${key}`, dataUrl);
    return base64ToBlobUrl(dataUrl);
  } catch (error: any) {
    if (error?.message !== 'Quota exceeded') {
      console.error(`Failed to generate music ${key}:`, error);
    }
    return null;
  }
}
