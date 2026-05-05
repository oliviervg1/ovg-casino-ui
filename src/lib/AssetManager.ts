import { GoogleGenAI } from "@google/genai";
import { get, set, keys, del } from 'idb-keyval';

const ASSET_PROMPTS: Record<string, string> = {
  // Sweets
  roulette_sweets: "A picture of a cute candy-themed avatar playing roulette in the style of a 2d game.",
  slots_sweets: "A picture of a cute candy-themed avatar playing a slot machine in the style of a 2d game.",
  bingo_sweets: "A picture of a cute candy-themed avatar playing bingo in the style of a 2d game.",
  sweets_1: "A vibrant 2D game asset of a colorful swirl lollipop, flat vector style, solid dark background, high quality",
  sweets_2: "A vibrant 2D game asset of a frosted pink cupcake with sprinkles, flat vector style, solid dark background, high quality",
  sweets_3: "A vibrant 2D game asset of a glossy wrapped candy, flat vector style, solid dark background, high quality",
  sweets_4: "A vibrant 2D game asset of a glazed chocolate donut, flat vector style, solid dark background, high quality",
  bg_roulette_sweets: "A vibrant 2D game style background of a candy-themed casino. Cute avatar characters are gathered around a massive roulette wheel made of sweets and lollipops. Detailed environment, colorful, high quality 2D art.",
  bg_slots_sweets: "A vibrant 2D game style background of a candy-themed casino. Cute avatar characters are playing colorful slot machines made of sweets and frosting. Detailed environment, colorful, high quality 2D art.",
  bg_bingo_sweets: "A vibrant 2D game style background of a candy-themed casino. Cute avatar characters are sitting at tables playing bingo with gummy bear markers. Detailed environment, colorful, high quality 2D art.",

  // Egypt
  roulette_egypt: "A picture of an ancient Egyptian adventurer avatar playing roulette in the style of a 2d game.",
  slots_egypt: "A picture of an ancient Egyptian adventurer avatar playing a slot machine in the style of a 2d game.",
  bingo_egypt: "A picture of an ancient Egyptian adventurer avatar playing bingo in the style of a 2d game.",
  egypt_1: "A vibrant 2D game asset of an Egyptian pharaoh mask, flat vector style, solid dark background, high quality",
  egypt_2: "A vibrant 2D game asset of an Egyptian pyramid, flat vector style, solid dark background, high quality",
  egypt_3: "A vibrant 2D game asset of the Eye of Horus, flat vector style, solid dark background, high quality",
  egypt_4: "A vibrant 2D game asset of an Egyptian scarab beetle, flat vector style, solid dark background, high quality",
  bg_roulette_egypt: "A detailed 2D game style background of an ancient Egyptian casino inside a golden temple. Adventurer avatar characters are gathered around a stone and gold roulette wheel. Detailed environment, cinematic lighting, high quality 2D art.",
  bg_slots_egypt: "A detailed 2D game style background of an ancient Egyptian casino inside a golden temple. Adventurer avatar characters are playing ornate slot machines adorned with pharaoh motifs. Detailed environment, cinematic lighting, high quality 2D art.",
  bg_bingo_egypt: "A detailed 2D game style background of an ancient Egyptian casino inside a golden temple. Adventurer avatar characters are sitting at stone tables playing bingo with scarab markers. Detailed environment, cinematic lighting, high quality 2D art.",

  // Space
  roulette_space: "A picture of a sci-fi astronaut avatar playing roulette in the style of a 2d game.",
  slots_space: "A picture of a sci-fi astronaut avatar playing a slot machine in the style of a 2d game.",
  bingo_space: "A picture of a sci-fi astronaut avatar playing bingo in the style of a 2d game.",
  space_1: "A vibrant 2D game asset of a glowing rocket ship, flat vector style, solid dark background, high quality",
  space_2: "A vibrant 2D game asset of a green alien head, flat vector style, solid dark background, high quality",
  space_3: "A vibrant 2D game asset of a ringed planet, flat vector style, solid dark background, high quality",
  space_4: "A vibrant 2D game asset of a glowing comet, flat vector style, solid dark background, high quality",
  bg_roulette_space: "A vibrant 2D game style background of a sci-fi space casino. Astronaut avatar characters gathered around a futuristic neon roulette wheel. Detailed environment, colorful, high quality 2D art.",
  bg_slots_space: "A vibrant 2D game style background of a sci-fi space casino. Astronaut avatar characters playing holographic slot machines. Detailed environment, colorful, high quality 2D art.",
  bg_bingo_space: "A vibrant 2D game style background of a sci-fi space casino. Astronaut avatar characters playing bingo with glowing orbs. Detailed environment, colorful, high quality 2D art.",

  // West
  roulette_west: "A picture of a wild west cowboy avatar playing roulette in the style of a 2d game.",
  slots_west: "A picture of a wild west cowboy avatar playing a slot machine in the style of a 2d game.",
  bingo_west: "A picture of a wild west cowboy avatar playing bingo in the style of a 2d game.",
  west_1: "A vibrant 2D game asset of a cowboy hat, flat vector style, solid dark background, high quality",
  west_2: "A vibrant 2D game asset of a green cactus, flat vector style, solid dark background, high quality",
  west_3: "A vibrant 2D game asset of a golden horseshoe, flat vector style, solid dark background, high quality",
  west_4: "A vibrant 2D game asset of a silver sheriff star badge, flat vector style, solid dark background, high quality",
  bg_roulette_west: "A vibrant 2D game style background of a wild west saloon casino. Cowboy avatar characters gathered around a wooden wagon wheel roulette. Detailed environment, colorful, high quality 2D art.",
  bg_slots_west: "A vibrant 2D game style background of a wild west saloon casino. Cowboy avatar characters playing vintage slot machines. Detailed environment, colorful, high quality 2D art.",
  bg_bingo_west: "A vibrant 2D game style background of a wild west saloon casino. Cowboy avatar characters playing bingo with bullets. Detailed environment, colorful, high quality 2D art.",

  // Ocean
  roulette_ocean: "A picture of an underwater mermaid or diver avatar playing roulette in the style of a 2d game.",
  slots_ocean: "A picture of an underwater mermaid or diver avatar playing a slot machine in the style of a 2d game.",
  bingo_ocean: "A picture of an underwater mermaid or diver avatar playing bingo in the style of a 2d game.",
  ocean_1: "A vibrant 2D game asset of a great white shark, flat vector style, solid dark background, high quality",
  ocean_2: "A vibrant 2D game asset of a purple octopus, flat vector style, solid dark background, high quality",
  ocean_3: "A vibrant 2D game asset of a pink seashell, flat vector style, solid dark background, high quality",
  ocean_4: "A vibrant 2D game asset of a golden trident, flat vector style, solid dark background, high quality",
  bg_roulette_ocean: "A vibrant 2D game style background of an underwater Atlantis casino. Mermaid and diver avatar characters gathered around a seashell roulette wheel. Detailed environment, colorful, high quality 2D art.",
  bg_slots_ocean: "A vibrant 2D game style background of an underwater Atlantis casino. Mermaid and diver avatar characters playing coral slot machines. Detailed environment, colorful, high quality 2D art.",
  bg_bingo_ocean: "A vibrant 2D game style background of an underwater Atlantis casino. Mermaid and diver avatar characters playing bingo with pearls. Detailed environment, colorful, high quality 2D art.",

  // Jungle
  roulette_jungle: "A picture of a jungle explorer avatar playing roulette in the style of a 2d game.",
  slots_jungle: "A picture of a jungle explorer avatar playing a slot machine in the style of a 2d game.",
  bingo_jungle: "A picture of a jungle explorer avatar playing bingo in the style of a 2d game.",
  jungle_1: "A vibrant 2D game asset of a brown monkey, flat vector style, solid dark background, high quality",
  jungle_2: "A vibrant 2D game asset of a green snake, flat vector style, solid dark background, high quality",
  jungle_3: "A vibrant 2D game asset of an Aztec stone idol, flat vector style, solid dark background, high quality",
  jungle_4: "A vibrant 2D game asset of a tropical palm tree, flat vector style, solid dark background, high quality",
  bg_roulette_jungle: "A vibrant 2D game style background of a hidden jungle temple casino. Explorer avatar characters gathered around a stone calendar roulette wheel. Detailed environment, colorful, high quality 2D art.",
  bg_slots_jungle: "A vibrant 2D game style background of a hidden jungle temple casino. Explorer avatar characters playing stone idol slot machines. Detailed environment, colorful, high quality 2D art.",
  bg_bingo_jungle: "A vibrant 2D game style background of a hidden jungle temple casino. Explorer avatar characters playing bingo with carved stones. Detailed environment, colorful, high quality 2D art.",

  // Vampire
  roulette_vampire: "A picture of a gothic vampire avatar playing roulette in the style of a 2d game.",
  slots_vampire: "A picture of a gothic vampire avatar playing a slot machine in the style of a 2d game.",
  bingo_vampire: "A picture of a gothic vampire avatar playing bingo in the style of a 2d game.",
  vampire_1: "A vibrant 2D game asset of a black bat, flat vector style, solid dark background, high quality",
  vampire_2: "A vibrant 2D game asset of a pale vampire with fangs, flat vector style, solid dark background, high quality",
  vampire_3: "A vibrant 2D game asset of a vial of red blood, flat vector style, solid dark background, high quality",
  vampire_4: "A vibrant 2D game asset of a glass of red wine, flat vector style, solid dark background, high quality",
  bg_roulette_vampire: "A vibrant 2D game style background of a gothic vampire castle casino. Vampire avatar characters gathered around a blood-red roulette wheel. Detailed environment, colorful, high quality 2D art.",
  bg_slots_vampire: "A vibrant 2D game style background of a gothic vampire castle casino. Vampire avatar characters playing coffin slot machines. Detailed environment, colorful, high quality 2D art.",
  bg_bingo_vampire: "A vibrant 2D game style background of a gothic vampire castle casino. Vampire avatar characters playing bingo with blood drops. Detailed environment, colorful, high quality 2D art.",

  // Ninja
  roulette_ninja: "A picture of a ninja avatar playing roulette in the style of a 2d game.",
  slots_ninja: "A picture of a ninja avatar playing a slot machine in the style of a 2d game.",
  bingo_ninja: "A picture of a ninja avatar playing bingo in the style of a 2d game.",
  ninja_1: "A vibrant 2D game asset of a black ninja mask, flat vector style, solid dark background, high quality",
  ninja_2: "A vibrant 2D game asset of a sharp katana sword, flat vector style, solid dark background, high quality",
  ninja_3: "A vibrant 2D game asset of a pink cherry blossom flower, flat vector style, solid dark background, high quality",
  ninja_4: "A vibrant 2D game asset of a Japanese castle, flat vector style, solid dark background, high quality",
  bg_roulette_ninja: "A vibrant 2D game style background of a feudal Japan dojo casino. Ninja avatar characters gathered around a shuriken roulette wheel. Detailed environment, colorful, high quality 2D art.",
  bg_slots_ninja: "A vibrant 2D game style background of a feudal Japan dojo casino. Ninja avatar characters playing pagoda slot machines. Detailed environment, colorful, high quality 2D art.",
  bg_bingo_ninja: "A vibrant 2D game style background of a feudal Japan dojo casino. Ninja avatar characters playing bingo with cherry blossoms. Detailed environment, colorful, high quality 2D art.",

  // Backgrounds
  bg_main: "A highly realistic, luxurious online casino background, dark and moody atmosphere, glowing neon lights, blurred roulette wheels and poker chips, cinematic lighting, 8k resolution, depth of field",
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_CONCURRENT = 5;
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

async function generateWithRetry(prompt: string, aspectRatio: string = "1:1", retries = 3, backoff = 5000): Promise<string> {
  if (quotaExceeded) {
    throw new Error('Quota exceeded');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: "512"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64Data = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/jpeg';
        return `data:${mimeType};base64,${base64Data}`;
      }
    }
    throw new Error('No image data returned from model');
  } catch (error: any) {
    if (error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429')) {
      if (retries > 0) {
        console.warn(`Rate limit hit, retrying in ${backoff}ms...`);
        await delay(backoff);
        return generateWithRetry(prompt, aspectRatio, retries - 1, backoff * 2);
      }
      throw new Error('Quota exceeded');
    }
    if (error?.status === 'PERMISSION_DENIED' || error?.message?.includes('403')) {
       throw new Error('Gemini API Permission Denied');
    }
    throw error;
  }
}

export async function getAsset(key: keyof typeof ASSET_PROMPTS): Promise<string> {
  try {
    // Check IndexedDB cache first
    let cached = null;
    try {
      cached = await get(`asset_v3_${key}`);
    } catch (cacheError) {
      console.warn("Could not read from IndexedDB cache:", cacheError);
    }
    if (cached) {
      return cached as string;
    }

    if (!quotaExceeded) {
      console.log(`Queuing asset generation: ${key}...`);
    }
    
    const aspectRatio = key.startsWith('bg_') ? "16:9" : "1:1";

    // Enqueue the generation to prevent hitting rate limits with parallel requests
    await acquireSlot();
    let dataUrl: string;
    try {
      if (!quotaExceeded) {
        console.log(`Generating asset: ${key}...`);
      }
      dataUrl = await generateWithRetry(ASSET_PROMPTS[key], aspectRatio);
      
      // Add a small delay between successful generations to respect RPM limits
      await delay(2000); 
    } finally {
      releaseSlot();
    }

    // Cache in IndexedDB
    try {
      await set(`asset_v3_${key}`, dataUrl);
    } catch (cacheError) {
      console.warn("Could not write to IndexedDB cache:", cacheError);
    }
    return dataUrl;
  } catch (error: any) {
    if (error?.message !== 'Quota exceeded' && error?.message !== 'Gemini API Permission Denied') {
      console.error(`Failed to generate asset ${key}:`, error);
    } else if (error?.message === 'Gemini API Permission Denied') {
      console.warn(`Gemini API Permission denied when generating asset ${key}. Falling back to placeholder.`);
    }
    // Return a fallback placeholder if generation fails
    return `https://picsum.photos/seed/${key}/512/512`;
  }
}

export async function preloadAssets(keys: (keyof typeof ASSET_PROMPTS)[]) {
  const promises = keys.map(key => getAsset(key));
  return Promise.all(promises);
}

export async function clearAllAssets() {
  try {
    const allKeys = await keys();
    for (const key of allKeys) {
      if (typeof key === 'string' && (key.startsWith('asset_') || key.startsWith('asset_v2_') || key.startsWith('asset_v3_'))) {
        await del(key);
      }
    }
  } catch (err) {
    console.warn("Could not clear IndexedDB:", err);
  }
}
