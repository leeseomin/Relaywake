import { z } from 'zod';
import { CharacterDefinitionSchema, type CharacterDefinition } from './schemas';

export const characters = z.array(CharacterDefinitionSchema).parse([
  {
    // Stable legacy ID retained so existing local profiles and run rows remain readable.
    id: 'blue',
    name: { ko: '새싹 러너', en: 'Sprout Runner' },
    description: {
      ko: '균형 잡힌 새싹 정찰자. AK-47로 시작합니다.',
      en: 'A balanced sprout scout. Starts with the AK-47.',
    },
    spriteKey: 'character-sprout', maxHp: 100, armor: 0, moveSpeed: 184, acceleration: 920,
    luck: 1, pickupRadius: 78, startingAbility: 'machineGun',
  },
  {
    // Stable legacy ID retained so existing local profiles and run rows remain readable.
    id: 'purple',
    name: { ko: '별꼬리 시프', en: 'Star-Tail Thief' },
    description: {
      ko: '별 핀을 단 빠르고 운 좋은 도적. 수리검으로 시작합니다.',
      en: 'A fast, lucky thief marked by a star pin. Starts with Shuriken.',
    },
    spriteKey: 'character-startail', maxHp: 90, armor: 0, moveSpeed: 204, acceleration: 980,
    luck: 1.15, pickupRadius: 88, startingAbility: 'shuriken',
  },
  {
    // Stable legacy ID retained so existing local profiles and run rows remain readable.
    id: 'white',
    name: { ko: '달토끼 워든', en: 'Moonhare Warden' },
    description: {
      ko: '달빛 귀와 목도리를 두른 튼튼한 수호자. 회전 도끼로 시작합니다.',
      en: 'A durable moon-eared guardian in a scarf. Starts with the orbiting axe.',
    },
    spriteKey: 'character-moonhare', maxHp: 112, armor: 1, moveSpeed: 174, acceleration: 860,
    luck: 1, pickupRadius: 76, startingAbility: 'axe',
  },
  {
    // Stable legacy ID retained so existing local profiles and run rows remain readable.
    id: 'gray',
    name: { ko: '모래뿔 브루저', en: 'Dunehorn Bruiser' },
    description: {
      ko: '느리지만 강인한 모래빛 뿔 투사. 방망이로 시작합니다.',
      en: 'A slow but resilient dune-horned fighter. Starts with the Bat.',
    },
    spriteKey: 'character-dunehorn', maxHp: 125, armor: 2, moveSpeed: 164, acceleration: 820,
    luck: 0.95, pickupRadius: 72, startingAbility: 'bat',
  },
  {
    id: 'fire',
    name: { ko: '파이어 마스터', en: 'Fire Master' },
    description: {
      ko: '회전 화염핵으로 시작합니다. 화염 피해 +25%, 재사용 대기시간 -15%, 지속시간 +20%.',
      en: 'Starts with the Orbiting Fire Core. +25% fire damage, -15% fire cooldown, +20% fire duration.',
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
