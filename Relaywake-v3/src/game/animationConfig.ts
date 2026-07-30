const mongleCharacterTextures = new Set([
  'character-sprout',
  'character-startail',
  'character-moonhare',
  'character-dunehorn',
]);

export function animationFrameRate(texture: string): number {
  if (mongleCharacterTextures.has(texture)) return 2;
  return texture.includes('boss') ? 5 : 7;
}
