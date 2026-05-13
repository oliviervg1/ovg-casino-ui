// Suffix appended to character/scene prompts to keep Gemini from rendering
// HUD overlays it learned from real casino game screenshots — credit balances,
// jackpot displays, button labels, menus, score readouts. The positive
// "animation production art" framing is the strongest lever per Google's
// docs ("describe the desired positive scene rather than what to avoid").
const NO_UI_SUFFIX =
  ' Pure illustrated scene in the style of animation production art — no on-screen text overlays, no credit balances, no jackpot displays, no score readouts, no button labels, no menus, no HUD chrome.';

export const ASSET_PROMPTS: Record<string, string> = {
  // Sweets
  roulette_sweets: 'A cute candy-themed avatar character standing beside a stylized lollipop-and-frosting roulette wheel sculpture in a candy-themed casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  slots_sweets:    'A cute candy-themed avatar character standing beside an ornate cupcake-and-candy slot-machine cabinet sculpture in a candy-themed casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  bingo_sweets:    'A cute candy-themed avatar character holding a decorative gummy-bear-marker bingo card in a candy-themed casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  sweets_1: 'A vibrant 2D illustration of a colorful swirl lollipop, flat vector style, solid dark background, high quality.',
  sweets_2: 'A vibrant 2D illustration of a frosted pink cupcake with sprinkles, flat vector style, solid dark background, high quality.',
  sweets_3: 'A vibrant 2D illustration of a glossy wrapped candy, flat vector style, solid dark background, high quality.',
  sweets_4: 'A vibrant 2D illustration of a glazed chocolate donut, flat vector style, solid dark background, high quality.',
  bg_roulette_sweets: 'A vibrant wide-shot 2D illustration of a candy-themed casino interior. Cute candy avatar characters gathered around a massive roulette wheel sculpture made of sweets and lollipops. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_slots_sweets:    'A vibrant wide-shot 2D illustration of a candy-themed casino interior. Cute candy avatar characters gathered among ornate slot-machine cabinet sculptures sculpted from sweets and frosting. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_bingo_sweets:    'A vibrant wide-shot 2D illustration of a candy-themed casino interior. Cute candy avatar characters seated at tables holding decorative bingo cards with gummy bear markers. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,

  // Egypt
  roulette_egypt: 'An ancient Egyptian adventurer character standing beside a stylized stone-and-gold roulette wheel sculpture in an Egyptian-themed casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  slots_egypt:    'An ancient Egyptian adventurer character standing beside an ornate slot-machine cabinet sculpture adorned with pharaoh motifs in an Egyptian-themed casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  bingo_egypt:    'An ancient Egyptian adventurer character holding a decorative scarab-marker bingo card in an Egyptian-themed casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  egypt_1: 'A vibrant 2D illustration of an Egyptian pharaoh mask, flat vector style, solid dark background, high quality.',
  egypt_2: 'A vibrant 2D illustration of an Egyptian pyramid, flat vector style, solid dark background, high quality.',
  egypt_3: 'A vibrant 2D illustration of the Eye of Horus, flat vector style, solid dark background, high quality.',
  egypt_4: 'A vibrant 2D illustration of an Egyptian scarab beetle, flat vector style, solid dark background, high quality.',
  bg_roulette_egypt: 'A detailed wide-shot 2D illustration of an ancient Egyptian casino interior inside a golden temple. Adventurer avatar characters gathered around a stone-and-gold roulette wheel sculpture. Detailed environment, cinematic lighting, animation production background art.' + NO_UI_SUFFIX,
  bg_slots_egypt:    'A detailed wide-shot 2D illustration of an ancient Egyptian casino interior inside a golden temple. Adventurer avatar characters gathered among ornate slot-machine cabinet sculptures adorned with pharaoh motifs. Detailed environment, cinematic lighting, animation production background art.' + NO_UI_SUFFIX,
  bg_bingo_egypt:    'A detailed wide-shot 2D illustration of an ancient Egyptian casino interior inside a golden temple. Adventurer avatar characters seated at stone tables holding decorative bingo cards with scarab markers. Detailed environment, cinematic lighting, animation production background art.' + NO_UI_SUFFIX,

  // Space
  roulette_space: 'A sci-fi astronaut character standing beside a stylized neon roulette wheel sculpture in a sci-fi space casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  slots_space:    'A sci-fi astronaut character standing beside an ornate holographic slot-machine cabinet sculpture in a sci-fi space casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  bingo_space:    'A sci-fi astronaut character holding a decorative glowing-orb-marker bingo card in a sci-fi space casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  space_1: 'A vibrant 2D illustration of a glowing rocket ship, flat vector style, solid dark background, high quality.',
  space_2: 'A vibrant 2D illustration of a green alien head, flat vector style, solid dark background, high quality.',
  space_3: 'A vibrant 2D illustration of a ringed planet, flat vector style, solid dark background, high quality.',
  space_4: 'A vibrant 2D illustration of a glowing comet, flat vector style, solid dark background, high quality.',
  bg_roulette_space: 'A vibrant wide-shot 2D illustration of a sci-fi space casino interior. Astronaut avatar characters gathered around a futuristic neon roulette wheel sculpture. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_slots_space:    'A vibrant wide-shot 2D illustration of a sci-fi space casino interior. Astronaut avatar characters gathered among ornate holographic slot-machine cabinet sculptures. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_bingo_space:    'A vibrant wide-shot 2D illustration of a sci-fi space casino interior. Astronaut avatar characters holding decorative bingo cards with glowing-orb markers. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,

  // West
  roulette_west: 'A wild west cowboy character standing beside a stylized wooden wagon-wheel roulette sculpture in a wild west saloon casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  slots_west:    'A wild west cowboy character standing beside an ornate vintage slot-machine cabinet sculpture in a wild west saloon casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  bingo_west:    'A wild west cowboy character holding a decorative bullet-marker bingo card in a wild west saloon casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  west_1: 'A vibrant 2D illustration of a cowboy hat, flat vector style, solid dark background, high quality.',
  west_2: 'A vibrant 2D illustration of a green cactus, flat vector style, solid dark background, high quality.',
  west_3: 'A vibrant 2D illustration of a golden horseshoe, flat vector style, solid dark background, high quality.',
  west_4: 'A vibrant 2D illustration of a silver sheriff star badge, flat vector style, solid dark background, high quality.',
  bg_roulette_west: 'A vibrant wide-shot 2D illustration of a wild west saloon casino interior. Cowboy avatar characters gathered around a wooden wagon-wheel roulette sculpture. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_slots_west:    'A vibrant wide-shot 2D illustration of a wild west saloon casino interior. Cowboy avatar characters gathered among ornate vintage slot-machine cabinet sculptures. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_bingo_west:    'A vibrant wide-shot 2D illustration of a wild west saloon casino interior. Cowboy avatar characters holding decorative bingo cards with bullet markers. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,

  // Ocean
  roulette_ocean: 'An underwater mermaid or diver character standing beside a stylized seashell roulette wheel sculpture in an underwater Atlantis casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  slots_ocean:    'An underwater mermaid or diver character standing beside an ornate coral slot-machine cabinet sculpture in an underwater Atlantis casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  bingo_ocean:    'An underwater mermaid or diver character holding a decorative pearl-marker bingo card in an underwater Atlantis casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  ocean_1: 'A vibrant 2D illustration of a great white shark, flat vector style, solid dark background, high quality.',
  ocean_2: 'A vibrant 2D illustration of a purple octopus, flat vector style, solid dark background, high quality.',
  ocean_3: 'A vibrant 2D illustration of a pink seashell, flat vector style, solid dark background, high quality.',
  ocean_4: 'A vibrant 2D illustration of a golden trident, flat vector style, solid dark background, high quality.',
  bg_roulette_ocean: 'A vibrant wide-shot 2D illustration of an underwater Atlantis casino interior. Mermaid and diver avatar characters gathered around a seashell roulette wheel sculpture. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_slots_ocean:    'A vibrant wide-shot 2D illustration of an underwater Atlantis casino interior. Mermaid and diver avatar characters gathered among ornate coral slot-machine cabinet sculptures. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_bingo_ocean:    'A vibrant wide-shot 2D illustration of an underwater Atlantis casino interior. Mermaid and diver avatar characters holding decorative bingo cards with pearl markers. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,

  // Jungle
  roulette_jungle: 'A jungle explorer character standing beside a stylized stone-calendar roulette wheel sculpture in a hidden jungle temple casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  slots_jungle:    'A jungle explorer character standing beside an ornate stone-idol slot-machine cabinet sculpture in a hidden jungle temple casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  bingo_jungle:    'A jungle explorer character holding a decorative carved-stone-marker bingo card in a hidden jungle temple casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  jungle_1: 'A vibrant 2D illustration of a brown monkey, flat vector style, solid dark background, high quality.',
  jungle_2: 'A vibrant 2D illustration of a green snake, flat vector style, solid dark background, high quality.',
  jungle_3: 'A vibrant 2D illustration of an Aztec stone idol, flat vector style, solid dark background, high quality.',
  jungle_4: 'A vibrant 2D illustration of a tropical palm tree, flat vector style, solid dark background, high quality.',
  bg_roulette_jungle: 'A vibrant wide-shot 2D illustration of a hidden jungle temple casino interior. Explorer avatar characters gathered around a stone-calendar roulette wheel sculpture. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_slots_jungle:    'A vibrant wide-shot 2D illustration of a hidden jungle temple casino interior. Explorer avatar characters gathered among ornate stone-idol slot-machine cabinet sculptures. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_bingo_jungle:    'A vibrant wide-shot 2D illustration of a hidden jungle temple casino interior. Explorer avatar characters holding decorative bingo cards with carved-stone markers. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,

  // Vampire
  roulette_vampire: 'A gothic vampire character standing beside a stylized blood-red roulette wheel sculpture in a gothic vampire castle casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  slots_vampire:    'A gothic vampire character standing beside an ornate coffin-shaped slot-machine cabinet sculpture in a gothic vampire castle casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  bingo_vampire:    'A gothic vampire character holding a decorative blood-drop-marker bingo card in a gothic vampire castle casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  vampire_1: 'A vibrant 2D illustration of a black bat, flat vector style, solid dark background, high quality.',
  vampire_2: 'A vibrant 2D illustration of a pale vampire with fangs, flat vector style, solid dark background, high quality.',
  vampire_3: 'A vibrant 2D illustration of a vial of red blood, flat vector style, solid dark background, high quality.',
  vampire_4: 'A vibrant 2D illustration of a glass of red wine, flat vector style, solid dark background, high quality.',
  bg_roulette_vampire: 'A vibrant wide-shot 2D illustration of a gothic vampire castle casino interior. Vampire avatar characters gathered around a blood-red roulette wheel sculpture. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_slots_vampire:    'A vibrant wide-shot 2D illustration of a gothic vampire castle casino interior. Vampire avatar characters gathered among ornate coffin-shaped slot-machine cabinet sculptures. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_bingo_vampire:    'A vibrant wide-shot 2D illustration of a gothic vampire castle casino interior. Vampire avatar characters holding decorative bingo cards with blood-drop markers. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,

  // Ninja
  roulette_ninja: 'A ninja character standing beside a stylized shuriken roulette wheel sculpture in a feudal Japan dojo casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  slots_ninja:    'A ninja character standing beside an ornate pagoda slot-machine cabinet sculpture in a feudal Japan dojo casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  bingo_ninja:    'A ninja character holding a decorative cherry-blossom-marker bingo card in a feudal Japan dojo casino lobby. 2D illustration, stylized character art.' + NO_UI_SUFFIX,
  ninja_1: 'A vibrant 2D illustration of a black ninja mask, flat vector style, solid dark background, high quality.',
  ninja_2: 'A vibrant 2D illustration of a sharp katana sword, flat vector style, solid dark background, high quality.',
  ninja_3: 'A vibrant 2D illustration of a pink cherry blossom flower, flat vector style, solid dark background, high quality.',
  ninja_4: 'A vibrant 2D illustration of a Japanese castle, flat vector style, solid dark background, high quality.',
  bg_roulette_ninja: 'A vibrant wide-shot 2D illustration of a feudal Japan dojo casino interior. Ninja avatar characters gathered around a shuriken roulette wheel sculpture. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_slots_ninja:    'A vibrant wide-shot 2D illustration of a feudal Japan dojo casino interior. Ninja avatar characters gathered among ornate pagoda slot-machine cabinet sculptures. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,
  bg_bingo_ninja:    'A vibrant wide-shot 2D illustration of a feudal Japan dojo casino interior. Ninja avatar characters holding decorative bingo cards with cherry-blossom markers. Detailed environment, colorful, animation production background art.' + NO_UI_SUFFIX,

  // Backgrounds
  bg_main: 'A highly realistic, luxurious casino interior. Dark and moody atmosphere, glowing neon lights, blurred roulette wheels and poker chips on felt tables, cinematic lighting, 8k resolution, depth of field.' + NO_UI_SUFFIX,
};

export const MUSIC_PROMPTS: Record<string, string> = {
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
  // World pages — ambient lobby/exploration tracks, distinct from the
  // upbeat game tracks above. Auto-played when the operator opens
  // /world/<theme> to browse the 3 games for that theme.
  sweets_world: "A dreamy, ambient music-box melody for browsing a candy-themed casino lobby. Soft chimes, gentle bells, light pastel atmosphere, slow tempo.",
  egypt_world: "A mystical, ambient track with sitar and oud for exploring an ancient Egyptian temple casino lobby. Slow, atmospheric, sand-swept, evocative of vast tomb chambers.",
  space_world: "An ambient, ethereal synthwave track for floating through a sci-fi space casino lobby. Spacious pads, distant pulses, weightless atmosphere.",
  west_world: "A gentle acoustic guitar ballad with harmonica for entering a wild west saloon casino lobby. Warm, dusty, evocative of late-afternoon plains.",
  ocean_world: "A dreamy, ambient track with bubbles and distant whale song for exploring an underwater Atlantis casino lobby. Slow, vast, mysterious.",
  jungle_world: "An ambient, atmospheric track with distant tribal drums and tropical bird calls for exploring a hidden jungle temple casino lobby. Slow tempo, mossy, humid.",
  vampire_world: "A slow, gothic ambient track with cathedral organ and choir whispers for entering a vampire castle casino lobby. Eerie, regal, unsettling.",
  ninja_world: "A peaceful, meditative track with shakuhachi flute and koto for browsing a feudal Japan dojo casino lobby. Zen, reflective, restrained.",
};
