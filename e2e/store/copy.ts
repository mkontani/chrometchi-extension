import type { FormId } from '../../src/core/types';
import type { EffectId, IconId } from '../../src/ui/assets';

/**
 * Store screenshot copy. Rules from the owner: sell the experience of keeping a pet in the
 * browser, never print counts (forms, foods, minutes) that would go stale, and only promise what
 * the game does today.
 */
export type Lang = 'en' | 'ja';
export type Text = Record<Lang, string>;

export type Theme = 'pink' | 'mint' | 'yellow' | 'lavender' | 'night';

export type Visual =
  | { kind: 'growth'; steps: ReadonlyArray<{ sprite: string; label: Text }> }
  | { kind: 'chips'; items: ReadonlyArray<{ icon: IconId; text: Text }> }
  | { kind: 'branch'; from: FormId; to: readonly FormId[]; secret: FormId; note: Text };

export interface Slide {
  /** Headline lines; text inside [brackets] gets the marker highlight. */
  title: Record<Lang, readonly string[]>;
  /** "\n" forces a line break (Japanese only breaks at punctuation on the slide). */
  sub: Text;
  visual: Visual;
  theme: Theme;
  deco: readonly EffectId[];
}

const t = (ja: string, en: string): Text => ({ ja, en });

export const SLIDES: readonly Slide[] = [
  {
    title: { ja: ['ブラウザで、', '[ペットを飼おう。]'], en: ['Keep a tiny pet', '[in your browser]'] },
    sub: t(
      'たまごから育てる、ドット絵のちいさな相棒。\nツールバーから、いつでも会えます。',
      'Hatch an egg and raise a pixel companion. It lives in your toolbar, one click away whenever you need a break.',
    ),
    visual: {
      kind: 'growth',
      steps: [
        { sprite: 'sprites/egg/plain/idle0.png', label: t('たまご', 'Egg') },
        { sprite: 'sprites/baby_puni/idle0.png', label: t('あかちゃん', 'Baby') },
        { sprite: 'sprites/child_hoshi/idle0.png', label: t('こども', 'Kid') },
        { sprite: 'sprites/young_hinoko/idle0.png', label: t('わかもの', 'Teen') },
        { sprite: 'sprites/adult_dragon/idle0.png', label: t('おとな', 'Adult') },
      ],
    },
    theme: 'pink',
    deco: ['sparkle', 'note'],
  },
  {
    title: { ja: ['お世話するほど、', '[すくすく育つ]'], en: ['A little care', '[goes a long way]'] },
    sub: t(
      'すきま時間のお世話で、ペットは元気いっぱい。\nなでると、うれしそうに笑います。',
      'A moment of care between tabs keeps your pet healthy. Give it a pat and watch it light up.',
    ),
    visual: {
      kind: 'chips',
      items: [
        { icon: 'feed', text: t('ごはんとおやつ', 'Meals and treats') },
        { icon: 'clean', text: t('うんちのおそうじ', 'Clean up after it') },
        { icon: 'medicine', text: t('びょうきには、くすり', 'Medicine when it is sick') },
        { icon: 'lights', text: t('夜は電気を消してあげる', 'Lights out at bedtime') },
      ],
    },
    theme: 'mint',
    deco: ['sparkle'],
  },
  {
    title: { ja: ['いっしょに遊んで、', '[ごきげんアップ]'], en: ['Play together,', '[lift its mood]'] },
    sub: t(
      'ミニゲームで遊ぶと、ペットは大よろこび。\nいい運動になって、よく遊ぶゲームで\n進化先も変わります。',
      'Mini-games make your pet happy and keep it fit. The games you play most even shape what it grows into.',
    ),
    visual: {
      kind: 'chips',
      items: [
        { icon: 'game_catch', text: t('キャッチ:おやつを受けとめよう', 'Catch: grab the falling treats') },
        { icon: 'game_cups', text: t('カップあて:ボールはどこ?', 'Cups: find the hidden ball') },
        { icon: 'game_stop', text: t('ストップ:ぴったりで止めよう', 'Stop: hit the target') },
      ],
    },
    theme: 'yellow',
    deco: ['note', 'sparkle'],
  },
  {
    title: { ja: ['育て方で、', '[進化が変わる]'], en: ['Raise it your way,', '[see what it becomes]'] },
    sub: t(
      '何を食べ、何で遊び、どう大事にされたか。\nお世話のしかたで、大人の姿が決まります。',
      'What it eats, how you play and how well you look after it decide its adult form.',
    ),
    visual: {
      kind: 'branch',
      from: 'young_hinoko',
      to: ['adult_dragon', 'adult_beast'],
      secret: 'adult_phoenix',
      note: t('ひみつの姿も。出会った姿は図鑑にずっと残ります。', 'Some forms are secret. Every one you meet stays in your collection.'),
    },
    theme: 'lavender',
    deco: ['sparkle'],
  },
  {
    title: { ja: ['Chromeを閉じたら、', '[時間もおやすみ]'], en: ['Close Chrome,', '[and time stops too]'] },
    sub: t(
      '時間が進むのは、ブラウザを開いている間だけ。\nいそがしい日も、あわてず育てられます。',
      'Time only passes while your browser is open, so a busy day will not catch you off guard.',
    ),
    visual: {
      kind: 'chips',
      items: [
        { icon: 'lights', text: t('夜はぐっすり眠ります', 'It sleeps through the night') },
        { icon: 'heart_full', text: t('困ったときは通知でお知らせ', 'A notification when it needs you') },
        { icon: 'settings', text: t('登録不要。データはこのPCの中だけ', 'No sign-up, data stays local') },
      ],
    },
    theme: 'night',
    deco: ['zzz'],
  },
];
