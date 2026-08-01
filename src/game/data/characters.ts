import { z } from 'zod';
import { CharacterDefinitionSchema, type CharacterDefinition } from './schemas';

export const characters = z.array(CharacterDefinitionSchema).parse([
  {
    // Stable legacy ID retained so existing local profiles and run rows remain readable.
    id: 'blue',
    name: {
      ko: '로즈글라스 스카우트',
      en: 'Roseglass Scout',
      ja: 'ローズグラス・スカウト',
      'zh-Hans': '玫镜侦察兵',
      es: 'Exploradora Roseglass',
      fr: 'Éclaireuse Roseglass',
    },
    description: {
      ko: '분홍 장발과 청록 안경을 쓴 균형형 정찰자. AK-47로 시작합니다.',
      en: 'A balanced scout with rose hair and teal glasses. Starts with the AK-47.',
      ja: 'ローズ色の長髪とティールの眼鏡が特徴のバランス型スカウト。AK-47で開始します。',
      'zh-Hans': '一名留着玫瑰色长发、佩戴青绿色眼镜的均衡型侦察兵。初始武器为AK-47。',
      es: 'Una exploradora equilibrada de cabello rosa y gafas verde azulado. Empieza con el AK-47.',
      fr: 'Une éclaireuse équilibrée aux cheveux roses et aux lunettes turquoise. Commence avec l’AK-47.',
    },
    spriteKey: 'character-roseglass', maxHp: 100, armor: 0, moveSpeed: 184, acceleration: 920,
    luck: 1, pickupRadius: 78, startingAbility: 'machineGun',
  },
  {
    // Stable legacy ID retained so existing local profiles and run rows remain readable.
    id: 'purple',
    name: {
      ko: '별꼬리 시프',
      en: 'Star-Tail Thief',
      ja: 'スターテイル・シーフ',
      'zh-Hans': '星尾盗贼',
      es: 'Ladrona Cola Estelar',
      fr: 'Voleuse Queue-d’Étoile',
    },
    description: {
      ko: '별 핀을 단 빠르고 운 좋은 도적. 수리검으로 시작합니다.',
      en: 'A fast, lucky thief marked by a star pin. Starts with Shuriken.',
      ja: '星のピンを付けた、素早く幸運なシーフ。手裏剣で開始します。',
      'zh-Hans': '一名佩戴星形发夹、敏捷又幸运的盗贼。初始武器为手里剑。',
      es: 'Una ladrona rápida y afortunada con un pasador de estrella. Empieza con Shuriken.',
      fr: 'Une voleuse rapide et chanceuse portant une barrette étoilée. Commence avec Shuriken.',
    },
    spriteKey: 'character-startail', maxHp: 90, armor: 0, moveSpeed: 204, acceleration: 980,
    luck: 1.15, pickupRadius: 88, startingAbility: 'shuriken',
  },
  {
    // Stable legacy ID retained so existing local profiles and run rows remain readable.
    id: 'white',
    name: {
      ko: '달토끼 워든',
      en: 'Moonhare Warden',
      ja: 'ムーンヘア・ウォーデン',
      'zh-Hans': '月兔守卫',
      es: 'Guardián Liebre Lunar',
      fr: 'Gardien Lièvre-Lune',
    },
    description: {
      ko: '달빛 귀와 목도리를 두른 튼튼한 수호자. 회전 도끼로 시작합니다.',
      en: 'A durable moon-eared guardian in a scarf. Starts with the orbiting axe.',
      ja: '月光の耳とマフラーをまとった頑丈な守護者。回転斧で開始します。',
      'zh-Hans': '一名围着围巾、长着月光兔耳的坚韧守卫。初始武器为环绕斧。',
      es: 'Un guardián resistente con orejas lunares y bufanda. Empieza con el hacha orbital.',
      fr: 'Un gardien robuste aux oreilles lunaires, enveloppé d’une écharpe. Commence avec la hache orbitale.',
    },
    spriteKey: 'character-moonhare', maxHp: 112, armor: 1, moveSpeed: 174, acceleration: 860,
    luck: 1, pickupRadius: 76, startingAbility: 'axe',
  },
  {
    // Stable legacy ID retained so existing local profiles and run rows remain readable.
    id: 'gray',
    name: {
      ko: '모래뿔 브루저',
      en: 'Dunehorn Bruiser',
      ja: 'デューンホーン・ブルーザー',
      'zh-Hans': '沙角斗士',
      es: 'Luchador Cuerno de Duna',
      fr: 'Cogneur Corne-des-Dunes',
    },
    description: {
      ko: '느리지만 강인한 모래빛 뿔 투사. 방망이로 시작합니다.',
      en: 'A slow but resilient dune-horned fighter. Starts with the Bat.',
      ja: '動きは遅いものの頑丈な、砂色の角を持つ戦士。バットで開始します。',
      'zh-Hans': '一名行动缓慢但坚韧的沙色角斗士。初始武器为球棒。',
      es: 'Un luchador de cuernos arenosos, lento pero resistente. Empieza con el bate.',
      fr: 'Un combattant aux cornes couleur sable, lent mais résistant. Commence avec la batte.',
    },
    spriteKey: 'character-dunehorn', maxHp: 125, armor: 2, moveSpeed: 164, acceleration: 820,
    luck: 0.95, pickupRadius: 72, startingAbility: 'bat',
  },
  {
    id: 'fire',
    name: {
      ko: '파이어 마스터',
      en: 'Fire Master',
      ja: 'ファイアマスター',
      'zh-Hans': '火焰大师',
      es: 'Maestro del Fuego',
      fr: 'Maître du Feu',
    },
    description: {
      ko: '회전 화염핵으로 시작합니다. 화염 피해 +25%, 재사용 대기시간 -15%, 지속시간 +20%.',
      en: 'Starts with the Orbiting Fire Core. +25% fire damage, -15% fire cooldown, +20% fire duration.',
      ja: '回転火炎核で開始します。炎ダメージ+25%、炎のクールダウン-15%、持続時間+20%。',
      'zh-Hans': '初始武器为环绕火核。火焰伤害+25%，火焰冷却时间-15%，持续时间+20%。',
      es: 'Empieza con el Núcleo de Fuego Orbital. +25 % de daño de fuego, -15 % de recarga de fuego y +20 % de duración.',
      fr: 'Commence avec le Noyau de feu orbital. +25 % de dégâts de feu, -15 % de recharge du feu et +20 % de durée.',
    },
    spriteKey: 'character-fire', displayScale: 1.35,
    maxHp: 96, armor: 0, moveSpeed: 192, acceleration: 940,
    luck: 1.08, pickupRadius: 82,
    fireDamageMultiplier: 1.25, fireCooldownMultiplier: 0.85, fireDurationMultiplier: 1.2,
    startingAbility: 'fireOrb',
  },
]);

export type CharacterId = CharacterDefinition['id'];
export const characterById = new Map<CharacterId, CharacterDefinition>(characters.map((character) => [character.id, character]));

export function getCharacter(id: CharacterId): CharacterDefinition {
  const character = characterById.get(id);
  if (!character) throw new Error(`Unknown character: ${id}`);
  return character;
}
