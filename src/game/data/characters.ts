import { z } from 'zod';
import { CharacterDefinitionSchema, type CharacterDefinition } from './schemas';

export const characters = z.array(CharacterDefinitionSchema).parse([
  {
    id: 'blue',
    name: { ko: '블루 러너', en: 'Blue Runner' },
    description: { ko: '균형 잡힌 사수. AK-47로 시작합니다.', en: 'Balanced gunner. Starts with the AK-47.' },
    spriteKey: 'character-blue', maxHp: 100, armor: 0, moveSpeed: 184, acceleration: 920,
    luck: 1, pickupRadius: 78, startingAbility: 'machineGun',
  },
  {
    id: 'purple',
    name: { ko: '퍼플 시프', en: 'Purple Thief' },
    description: { ko: '빠르고 운이 좋습니다. 수리검으로 시작합니다.', en: 'Fast and lucky. Starts with Shuriken.' },
    spriteKey: 'character-purple', maxHp: 90, armor: 0, moveSpeed: 204, acceleration: 980,
    luck: 1.15, pickupRadius: 88, startingAbility: 'shuriken',
  },
  {
    id: 'white',
    name: { ko: '화이트 워든', en: 'White Warden' },
    description: { ko: '튼튼한 근접형. 회전 도끼로 시작합니다.', en: 'Durable close-range fighter. Starts with the orbiting axe.' },
    spriteKey: 'character-white', maxHp: 112, armor: 1, moveSpeed: 174, acceleration: 860,
    luck: 1, pickupRadius: 76, startingAbility: 'axe',
  },
  {
    id: 'gray',
    name: { ko: '그레이 브루저', en: 'Gray Bruiser' },
    description: { ko: '느리지만 강인합니다. 방망이로 시작합니다.', en: 'Slower, but resilient. Starts with the Bat.' },
    spriteKey: 'character-gray', maxHp: 125, armor: 2, moveSpeed: 164, acceleration: 820,
    luck: 0.95, pickupRadius: 72, startingAbility: 'bat',
  },
]);

export type CharacterId = CharacterDefinition['id'];
export const characterById = new Map<CharacterId, CharacterDefinition>(characters.map((character) => [character.id, character]));

export function getCharacter(id: CharacterId): CharacterDefinition {
  const character = characterById.get(id);
  if (!character) throw new Error(`Unknown character: ${id}`);
  return character;
}
