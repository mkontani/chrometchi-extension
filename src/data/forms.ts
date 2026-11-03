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

export const FORMS: readonly FormDef[] = [
  form('egg', 'egg', 'none', [], {}, 0, 'light blue egg with a star pattern and a tiny crack'),
  form('baby_puni', 'baby', 'none', ['egg'], {}, 0, 'tiny round squishy jelly blob baby creature with tiny stubby feet'),

  // Children
  form('child_kemu', 'child', 'lunar', CHILD_FROM, { minStageMistakes: 3 }, 90, 'small fluffy purple smoke puff creature with sleepy half-moon eyes'),
  form('child_dango', 'child', 'heavy', CHILD_FROM, { weight: 'heavy' }, 80, 'plump round dumpling creature with chubby cheeks and tiny arms'),
  form('child_hoshi', 'child', 'ether', CHILD_FROM, { maxStageMistakes: 0 }, 70, 'small cream creature shaped like a star with sparkling eyes'),
  form('child_mochi', 'child', 'none', CHILD_FROM, {}, 0, 'soft white rice cake creature with pink cheeks and stubby ears'),

  // Young
  form('young_kirari', 'young', 'ether', ['child_hoshi'], { maxStageMistakes: 0, chance: 0.5 }, 100, 'graceful creature with crystal shard wings and a glittering star crown'),
  form('young_kage', 'young', 'lunar', ['child_mochi', 'child_kemu', 'child_dango'], { minStageMistakes: 3 }, 90, 'slender shadow creature with glowing yellow eyes and a wispy tail'),
  form('young_poyo', 'young', 'heavy', ['child_dango', 'child_mochi'], { weight: 'heavy' }, 80, 'big bouncy round pudgy creature with a wide happy smile'),
  form('young_hinoko', 'young', 'solar', ['child_hoshi', 'child_mochi', 'child_dango'], { dominantFood: ['meat'] }, 50, 'small orange lizard-like creature with a flame on its tail'),
  form('young_shizuku', 'young', 'water', ['child_hoshi', 'child_mochi', 'child_kemu'], { dominantFood: ['fish'] }, 50, 'blue droplet-shaped creature with fin ears and bubbly cheeks'),
  form('young_mebuki', 'young', 'earth', ['child_mochi', 'child_kemu', 'child_dango'], { dominantFood: ['veggie', 'grain'] }, 50, 'green sprout creature with leaf ears and a budding flower'),
  form('young_fuwari', 'young', 'wind', ['child_hoshi', 'child_mochi'], { dominantFood: ['sweet'] }, 50, 'fluffy cloud-like bird creature with soft feathery wings'),
  form('young_gear', 'young', 'metal', ['child_hoshi', 'child_mochi', 'child_kemu', 'child_dango'], {}, 0, 'small boxy machine creature with spinning gear cheeks and antenna'),

  // Adults: solar
  form('adult_dragon', 'adult', 'solar', ['young_hinoko'], { dominantGame: 'catch' }, 50, 'mighty red dragon with large wings and fiery breath'),
  form('adult_beast', 'adult', 'solar', ['young_hinoko'], { dominantGame: 'cups' }, 50, 'muscular lion-like beast with a blazing mane and sharp claws'),
  form('adult_salamander', 'adult', 'solar', ['young_hinoko'], {}, 0, 'sleek orange salamander with glowing ember spots along its back'),
  form('adult_phoenix', 'adult', 'solar', ['young_hinoko'], { maxStageMistakes: 0, chance: 0.3 }, 100, 'radiant golden firebird with long flowing flame feathers'),

  // Adults: water
  form('adult_serpent', 'adult', 'water', ['young_shizuku'], { dominantGame: 'catch' }, 50, 'long blue sea serpent coiling with shimmering scales'),
  form('adult_turtle', 'adult', 'water', ['young_shizuku'], { dominantGame: 'cups' }, 50, 'ancient giant sea turtle with a coral-covered shell'),
  form('adult_kraken', 'adult', 'water', ['young_shizuku'], {}, 0, 'huge purple octopus creature with many curling tentacles'),

  // Adults: earth
  form('adult_golem', 'adult', 'earth', ['young_mebuki'], { dominantGame: 'catch' }, 50, 'towering stone giant with moss growing on its shoulders'),
  form('adult_mole', 'adult', 'earth', ['young_mebuki'], { dominantGame: 'cups' }, 50, 'stout brown mole creature with big digging claws and tiny eyes'),
  form('adult_tree', 'adult', 'earth', ['young_mebuki'], {}, 0, 'wise walking tree creature with a leafy canopy and glowing fruit'),

  // Adults: wind
  form('adult_griffin', 'adult', 'wind', ['young_fuwari'], { dominantGame: 'catch' }, 50, 'proud eagle-headed lion creature with broad sky-blue wings'),
  form('adult_owl', 'adult', 'wind', ['young_fuwari'], { dominantGame: 'cups' }, 50, 'round wise owl creature with huge round eyes and fluffy feathers'),
  form('adult_pegasus', 'adult', 'wind', ['young_fuwari'], {}, 0, 'white winged horse creature with a flowing cloud mane'),

  // Adults: metal
  form('adult_robot', 'adult', 'metal', ['young_gear'], { dominantGame: 'catch' }, 50, 'sturdy retro robot with a square head and piston arms'),
  form('adult_ufo', 'adult', 'metal', ['young_gear'], { dominantGame: 'cups' }, 50, 'saucer-shaped flying machine creature with blinking lights and a dome'),
  form('adult_cyborg', 'adult', 'metal', ['young_gear'], {}, 0, 'half-organic half-mechanical creature with a glowing red eye plate'),

  // Adults: lunar
  form('adult_ghost', 'adult', 'lunar', ['young_kage'], { dominantGame: 'catch' }, 50, 'pale floating ghost creature with a trailing sheet-like body'),
  form('adult_alien', 'adult', 'lunar', ['young_kage'], { dominantGame: 'cups' }, 50, 'slim grey-green alien creature with huge black eyes and a long skull'),
  form('adult_bat', 'adult', 'lunar', ['young_kage'], {}, 0, 'dark purple bat creature with wide leathery wings and big ears'),
  form('adult_vampire', 'adult', 'lunar', ['young_kage'], { minStageMistakes: 6, hours: [18, 22] }, 100, 'elegant caped night creature with fangs and crimson eyes'),

  // Adults: ether
  form('adult_unicorn', 'adult', 'ether', ['young_kirari'], { dominantGame: 'catch' }, 50, 'pearly white horned horse creature with a sparkling rainbow mane'),
  form('adult_comet', 'adult', 'ether', ['young_kirari'], { dominantGame: 'cups' }, 50, 'streaking fox-like creature with a glittering comet tail of stars'),
  form('adult_nexus', 'adult', 'ether', ['young_kirari'], {}, 0, 'floating crystal orb creature surrounded by orbiting gem shards'),
  form('adult_astra', 'adult', 'ether', ['young_kirari'], { maxTotalMistakes: 0, chance: 0.5 }, 100, 'celestial angelic creature with a galaxy cloak and a halo of stars'),

  // Adults: heavy
  form('adult_bear', 'adult', 'heavy', ['young_poyo'], { dominantGame: 'catch' }, 50, 'huge cuddly brown bear creature with a big round belly'),
  form('adult_hippo', 'adult', 'heavy', ['young_poyo'], { dominantGame: 'cups' }, 50, 'giant pink hippo creature with a wide open yawning mouth'),
  form('adult_pudding', 'adult', 'heavy', ['young_poyo'], {}, 0, 'round wobbly custard pudding creature with a caramel top and happy face'),
  form('adult_grandpudding', 'adult', 'heavy', ['young_poyo'], { weight: 'heavy', chance: 0.3 }, 100, 'huge crowned custard pudding creature with a caramel cape'),
];
