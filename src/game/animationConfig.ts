const staticCharacterTextures = new Set(['character-startail']);

const mongleCharacterTextures = new Set([
  'character-roseglass',
  'character-moonhare',
  'character-dunehorn',
]);

export function animationFrameRate(texture: string): number {
  if (staticCharacterTextures.has(texture)) return 1;
  if (mongleCharacterTextures.has(texture)) return 2;
  return texture.includes('boss') ? 5 : 7;
}

export function animationEndFrame(texture: string): number {
  return staticCharacterTextures.has(texture) ? 0 : 3;
}
