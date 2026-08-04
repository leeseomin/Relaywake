const staticCharacterTextures = new Set(['character-startail']);
const threeFrameEnemyTextures = new Set(['enemy-alien']);

const mongleCharacterTextures = new Set([
  'character-roseglass',
  'character-moonhare',
  'character-dunehorn',
]);

export function animationFrameRate(texture: string): number {
  if (staticCharacterTextures.has(texture)) return 1;
  if (mongleCharacterTextures.has(texture)) return 2;
  if (threeFrameEnemyTextures.has(texture)) return 6;
  return texture.includes('boss') ? 5 : 7;
}

export function animationEndFrame(texture: string): number {
  if (staticCharacterTextures.has(texture)) return 0;
  return threeFrameEnemyTextures.has(texture) ? 2 : 3;
}
