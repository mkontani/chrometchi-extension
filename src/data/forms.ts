import type { EvolutionCondition, Family, FormDef, FormId, Stage } from '@/core/types';

function form(
  id: FormId,
  stage: Stage,
  family: Family,
  from: FormId[],
  when: EvolutionCondition,
  priority: number,
  motif: string,
): FormDef {
  return { id, stage, family, from, when, priority, motif };
}

const CHILD_FROM = ['baby_puni'];
/** The children that grow up in a room (spec 9.2). */
const ROOM_CHILDREN = ['child_pico', 'child_awa', 'child_tane', 'child_ame', 'child_yuki'];
/** Every child: the decor young forms can come from any of them (spec 9.3). */
const ALL_CHILDREN = ['child_kemu', 'child_dango', 'child_hoshi', 'child_mochi', ...ROOM_CHILDREN];

/** Each family's two young forms: its adults come from either (spec 9.3). */
const SOLAR = ['young_hinoko', 'young_tomoshi'];
const WATER = ['young_shizuku', 'young_kingyo'];
const EARTH = ['young_mebuki', 'young_kogane'];
const WIND = ['young_fuwari', 'young_kumo'];
const METAL = ['young_gear', 'young_kaminari'];
const LUNAR = ['young_kage', 'young_obake'];
const ETHER = ['young_kirari', 'young_tsurara'];
const HEAVY = ['young_poyo', 'young_koishi'];

/**
 * Priorities (spec 9.2-9.4). Children: kemu 90, dango 80, the rooms 75, hoshi 70. Young: kirari 100,
 * kage 90, poyo 80, the decor kinds 60, the foods 50. Adults: the rares, morning care, light weight, the games.
 */
const ROOM = 75;
const DECOR_KIND = 60;
const RARE = 100;
const MORNING = 70;
const LIGHT_WEIGHT = 60;
const PLAY = 50;

export const FORMS: readonly FormDef[] = [
  form('egg', 'egg', 'none', [], {}, 0, 'light blue egg with a star pattern and a tiny crack'),
  form('baby_puni', 'baby', 'none', ['egg'], {}, 0, 'tiny round squishy jelly blob baby creature with tiny stubby feet'),

  // Children
  form('child_kemu', 'child', 'lunar', CHILD_FROM, { minStageMistakes: 3 }, 90, 'small fluffy purple smoke puff creature with sleepy half-moon eyes'),
  form('child_dango', 'child', 'heavy', CHILD_FROM, { weight: 'heavy' }, 80, 'plump round dumpling creature with chubby cheeks and tiny arms'),
  form('child_hoshi', 'child', 'ether', CHILD_FROM, { maxStageMistakes: 0 }, 70, 'small cream creature shaped like a star with sparkling eyes'),
  form('child_mochi', 'child', 'none', CHILD_FROM, {}, 0, 'soft white rice cake creature with pink cheeks and stubby ears'),
  form('child_pico', 'child', 'none', CHILD_FROM, { room: 'garden' }, ROOM, 'tiny round yellow feather-puff chick creature with a head curl'),
  form('child_awa', 'child', 'none', CHILD_FROM, { room: 'beach' }, ROOM, 'small round soap bubble creature with a pastel shimmer'),
  form('child_tane', 'child', 'none', CHILD_FROM, { room: 'forest' }, ROOM, 'small round acorn creature with a little cap'),
  form('child_ame', 'child', 'none', CHILD_FROM, { room: 'sweets' }, ROOM, 'small round candy drop creature in a twisted wrapper'),
  form('child_yuki', 'child', 'none', CHILD_FROM, { room: 'snowfield' }, ROOM, 'small round white snowball creature with a tiny twig sprout'),

  // Young
  form('young_kirari', 'young', 'ether', ['child_hoshi'], { maxStageMistakes: 0, chance: 0.5 }, 100, 'graceful creature with crystal shard wings and a glittering star crown'),
  form('young_kage', 'young', 'lunar', ['child_mochi', 'child_kemu', 'child_dango', ...ROOM_CHILDREN], { minStageMistakes: 3 }, 90, 'slender shadow creature with glowing yellow eyes and a wispy tail'),
  form('young_poyo', 'young', 'heavy', ['child_dango', 'child_mochi', ...ROOM_CHILDREN], { weight: 'heavy' }, 80, 'big bouncy round pudgy creature with a wide happy smile'),
  form('young_tomoshi', 'young', 'solar', ALL_CHILDREN, { decorKind: 'light' }, DECOR_KIND, 'small candle flame creature with a soft wax body'),
  form('young_kingyo', 'young', 'water', ALL_CHILDREN, { decorKind: 'water' }, DECOR_KIND, 'small round red goldfish creature with a flowing fan tail'),
  form('young_kogane', 'young', 'earth', ALL_CHILDREN, { decorKind: 'plant' }, DECOR_KIND, 'small round golden beetle creature with shiny wing cases'),
  form('young_kumo', 'young', 'wind', ALL_CHILDREN, { decorKind: 'sky' }, DECOR_KIND, 'small fluffy grey rain cloud creature with tiny raindrops'),
  form('young_kaminari', 'young', 'metal', ALL_CHILDREN, { decorKind: 'gadget' }, DECOR_KIND, 'small yellow thunder puff creature with a zigzag lightning tail'),
  form('young_obake', 'young', 'lunar', ALL_CHILDREN, { decorKind: 'night' }, DECOR_KIND, 'small round shy white ghost creature holding a tiny lantern'),
  form('young_tsurara', 'young', 'ether', ALL_CHILDREN, { decorKind: 'sparkle' }, DECOR_KIND, 'small icy blue crystal creature shaped like an icicle'),
  form('young_koishi', 'young', 'heavy', ALL_CHILDREN, { decorKind: 'cozy' }, DECOR_KIND, 'small round pebble creature with a patch of green moss'),
  form('young_hinoko', 'young', 'solar', ['child_hoshi', 'child_mochi', 'child_dango', ...ROOM_CHILDREN], { dominantFood: ['meat'] }, 50, 'small orange lizard-like creature with a flame on its tail'),
  form('young_shizuku', 'young', 'water', ['child_hoshi', 'child_mochi', 'child_kemu', ...ROOM_CHILDREN], { dominantFood: ['fish'] }, 50, 'blue droplet-shaped creature with fin ears and bubbly cheeks'),
  form('young_mebuki', 'young', 'earth', ['child_mochi', 'child_kemu', 'child_dango', ...ROOM_CHILDREN], { dominantFood: ['veggie', 'grain'] }, 50, 'green sprout creature with leaf ears and a budding flower'),
  form('young_fuwari', 'young', 'wind', ['child_hoshi', 'child_mochi', ...ROOM_CHILDREN], { dominantFood: ['sweet'] }, 50, 'fluffy cloud-like bird creature with soft feathery wings'),
  form('young_gear', 'young', 'metal', ['child_hoshi', 'child_mochi', 'child_kemu', 'child_dango', ...ROOM_CHILDREN], {}, 0, 'small boxy machine creature with spinning gear cheeks and antenna'),

  // Adults: solar
  form('adult_dragon', 'adult', 'solar', SOLAR, { dominantGame: 'catch' }, PLAY, 'mighty red dragon with large wings and fiery breath'),
  form('adult_beast', 'adult', 'solar', SOLAR, { dominantGame: 'cups' }, PLAY, 'muscular lion-like beast with a blazing mane and sharp claws'),
  form('adult_salamander', 'adult', 'solar', SOLAR, {}, 0, 'sleek orange salamander with glowing ember spots along its back'),
  form('adult_phoenix', 'adult', 'solar', SOLAR, { maxStageMistakes: 0, chance: 0.3 }, RARE, 'radiant golden firebird with long flowing flame feathers'),
  form('adult_hedgehog', 'adult', 'solar', SOLAR, { dominantGame: 'stop' }, PLAY, 'round hedgehog with glowing orange ember quills on its back'),
  form('adult_ferret', 'adult', 'solar', SOLAR, { weight: 'light' }, LIGHT_WEIGHT, 'slim orange ferret creature with a flickering flame-tipped tail'),
  form('adult_rooster', 'adult', 'solar', SOLAR, { morningCare: true }, MORNING, 'proud little rooster creature with a sunrise-red comb and golden tail feathers'),

  // Adults: water
  form('adult_serpent', 'adult', 'water', WATER, { dominantGame: 'catch' }, PLAY, 'long blue sea serpent coiling with shimmering scales'),
  form('adult_turtle', 'adult', 'water', WATER, { dominantGame: 'cups' }, PLAY, 'ancient giant sea turtle with a coral-covered shell'),
  form('adult_kraken', 'adult', 'water', WATER, {}, 0, 'huge purple octopus creature with many curling tentacles'),
  form('adult_seal', 'adult', 'water', WATER, { dominantGame: 'stop' }, PLAY, 'chubby white seal pup with tiny flippers and whiskers'),
  form('adult_otter', 'adult', 'water', WATER, { weight: 'light' }, LIGHT_WEIGHT, 'sleek little sea otter creature hugging a pink seashell'),
  form('adult_dolphin', 'adult', 'water', WATER, { morningCare: true }, MORNING, 'cheerful sky-blue dolphin creature with a sunrise-pink belly'),
  form('adult_whale', 'adult', 'water', WATER, { wearing: 'necklace', chance: 0.5 }, RARE, 'majestic sky-blue whale with a forehead pearl and water spout'),

  // Adults: earth
  form('adult_golem', 'adult', 'earth', EARTH, { dominantGame: 'catch' }, PLAY, 'towering stone giant with moss growing on its shoulders'),
  form('adult_mole', 'adult', 'earth', EARTH, { dominantGame: 'cups' }, PLAY, 'stout brown mole creature with big digging claws and tiny eyes'),
  form('adult_tree', 'adult', 'earth', EARTH, {}, 0, 'wise walking tree creature with a leafy canopy and glowing fruit'),
  form('adult_mushroom', 'adult', 'earth', EARTH, { dominantGame: 'stop' }, PLAY, 'plump mushroom with a red spotted cap and tiny feet'),
  form('adult_bunny', 'adult', 'earth', EARTH, { weight: 'light' }, LIGHT_WEIGHT, 'long-eared bunny creature with a leaf sprout and clover tail'),
  form('adult_sunflower', 'adult', 'earth', EARTH, { morningCare: true }, MORNING, 'sunflower creature with a big yellow petal mane and two leaf arms'),
  form('adult_stag', 'adult', 'earth', EARTH, { wearing: 'flowercrown', chance: 0.5 }, RARE, 'gentle forest stag with mossy antlers sprouting tiny flowers'),

  // Adults: wind
  form('adult_griffin', 'adult', 'wind', WIND, { dominantGame: 'catch' }, PLAY, 'proud eagle-headed lion creature with broad sky-blue wings'),
  form('adult_owl', 'adult', 'wind', WIND, { dominantGame: 'cups' }, PLAY, 'round wise owl creature with huge round eyes and fluffy feathers'),
  form('adult_pegasus', 'adult', 'wind', WIND, {}, 0, 'white winged horse creature with a flowing cloud mane'),
  form('adult_butterfly', 'adult', 'wind', WIND, { dominantGame: 'stop' }, PLAY, 'fuzzy butterfly with big pastel wings and curly antennae'),
  form('adult_dandelion', 'adult', 'wind', WIND, { weight: 'light' }, LIGHT_WEIGHT, 'fluffy white dandelion puff creature with a tiny green leaf'),
  form('adult_swallow', 'adult', 'wind', WIND, { morningCare: true }, MORNING, 'swift little swallow bird creature with a forked tail'),
  form('adult_stormbird', 'adult', 'wind', WIND, { wearing: 'scarf', chance: 0.5 }, RARE, 'white storm bird with a golden lightning crest and swirling tail'),

  // Adults: metal
  form('adult_robot', 'adult', 'metal', METAL, { dominantGame: 'catch' }, PLAY, 'sturdy retro robot with a square head and piston arms'),
  form('adult_ufo', 'adult', 'metal', METAL, { dominantGame: 'cups' }, PLAY, 'saucer-shaped flying machine creature with blinking lights and a dome'),
  form('adult_cyborg', 'adult', 'metal', METAL, {}, 0, 'half-organic half-mechanical creature with a glowing red eye plate'),
  form('adult_clock', 'adult', 'metal', METAL, { dominantGame: 'stop' }, PLAY, 'round clockwork creature with a clock face belly and a wind-up key'),
  form('adult_drone', 'adult', 'metal', METAL, { weight: 'light' }, LIGHT_WEIGHT, 'small round drone creature with four tiny propellers and an antenna'),
  form('adult_toaster', 'adult', 'metal', METAL, { morningCare: true }, MORNING, 'cheerful silver toaster creature with two golden toast slices popping out'),
  form('adult_mecha', 'adult', 'metal', METAL, { wearing: 'medal', chance: 0.5 }, RARE, 'golden armored mecha knight with a glowing blue chest core'),

  // Adults: lunar
  form('adult_ghost', 'adult', 'lunar', LUNAR, { dominantGame: 'catch' }, PLAY, 'pale floating ghost creature with a trailing sheet-like body'),
  form('adult_alien', 'adult', 'lunar', LUNAR, { dominantGame: 'cups' }, PLAY, 'slim grey-green alien creature with huge black eyes and a long skull'),
  form('adult_bat', 'adult', 'lunar', LUNAR, {}, 0, 'dark purple bat creature with wide leathery wings and big ears'),
  form('adult_vampire', 'adult', 'lunar', LUNAR, { minStageMistakes: 6, hours: [18, 22] }, RARE, 'elegant caped night creature with fangs and crimson eyes'),
  form('adult_pumpkin', 'adult', 'lunar', LUNAR, { dominantGame: 'stop' }, PLAY, 'round orange pumpkin with a curly vine and witch hat'),
  form('adult_blackcat', 'adult', 'lunar', LUNAR, { weight: 'light' }, LIGHT_WEIGHT, 'slim black cat creature with glowing yellow eyes and a curly tail'),
  form('adult_koala', 'adult', 'lunar', LUNAR, { morningCare: true }, MORNING, 'sleepy grey koala creature wearing a blue striped nightcap'),

  // Adults: ether
  form('adult_unicorn', 'adult', 'ether', ETHER, { dominantGame: 'catch' }, PLAY, 'pearly white horned horse creature with a sparkling rainbow mane'),
  form('adult_comet', 'adult', 'ether', ETHER, { dominantGame: 'cups' }, PLAY, 'streaking fox-like creature with a glittering comet tail of stars'),
  form('adult_nexus', 'adult', 'ether', ETHER, {}, 0, 'floating crystal orb creature surrounded by orbiting gem shards'),
  form('adult_astra', 'adult', 'ether', ETHER, { maxTotalMistakes: 0, chance: 0.5 }, RARE, 'celestial angelic creature with a galaxy cloak and a halo of stars'),
  form('adult_jellyfish', 'adult', 'ether', ETHER, { dominantGame: 'stop' }, PLAY, 'pastel jellyfish with a starry bell and ribbon tentacles'),
  form('adult_fairy', 'adult', 'ether', ETHER, { weight: 'light' }, LIGHT_WEIGHT, 'tiny sparkly fairy creature with dragonfly wings and a star wand'),
  form('adult_rainbow', 'adult', 'ether', ETHER, { morningCare: true }, MORNING, 'soft white cloud creature with a small pastel rainbow over its back'),

  // Adults: heavy
  form('adult_bear', 'adult', 'heavy', HEAVY, { dominantGame: 'catch' }, PLAY, 'huge cuddly brown bear creature with a big round belly'),
  form('adult_hippo', 'adult', 'heavy', HEAVY, { dominantGame: 'cups' }, PLAY, 'giant pink hippo creature with a wide open yawning mouth'),
  form('adult_pudding', 'adult', 'heavy', HEAVY, {}, 0, 'round wobbly custard pudding creature with a caramel top and happy face'),
  form('adult_grandpudding', 'adult', 'heavy', HEAVY, { weight: 'heavy', chance: 0.3 }, RARE, 'huge crowned custard pudding creature with a caramel cape'),
  form('adult_elephant', 'adult', 'heavy', HEAVY, { dominantGame: 'stop' }, PLAY, 'round grey baby elephant with big floppy ears and a curled trunk'),
  form('adult_balloon', 'adult', 'heavy', HEAVY, { weight: 'light' }, LIGHT_WEIGHT, 'round floating pink balloon creature with a curly string tail'),
  form('adult_pancake', 'adult', 'heavy', HEAVY, { morningCare: true }, MORNING, 'fluffy stack of pancakes creature with a butter pat and syrup drips'),
];
