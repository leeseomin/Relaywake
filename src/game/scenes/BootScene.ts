import Phaser from 'phaser';
import { animationEndFrame, animationFrameRate } from '../animationConfig';
import { assetPath, phaserAssets } from '../assets';
import { consumePendingRunOptions } from '../runtimeContext';

export class BootScene extends Phaser.Scene {
  public constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    for (const asset of phaserAssets) {
      if ('frame' in asset) {
        this.load.spritesheet(asset.key, assetPath(asset.key), {
          frameWidth: asset.frame.width,
          frameHeight: asset.frame.height,
          endFrame: asset.frame.count - 1,
        });
      } else {
        this.load.image(asset.key, assetPath(asset.key));
      }
    }
  }

  public create(): void {
    const animatedTextures = [
      ['character-roseglass', 'character-roseglass-walk'],
      ['character-startail', 'character-startail-walk'],
      ['character-moonhare', 'character-moonhare-walk'],
      ['character-dunehorn', 'character-dunehorn-walk'],
      ['character-fire', 'character-fire-walk'],
      ['enemy-alien', 'enemy-alien-walk'],
      ['enemy-crab', 'enemy-crab-walk'],
      ['enemy-brute', 'enemy-brute-walk'],
      ['enemy-wizard', 'enemy-wizard-walk'],
      ['enemy-nailhead', 'enemy-nailhead-walk'],
      ['enemy-gravity', 'enemy-gravity-walk'],
      ['enemy-miniboss', 'enemy-miniboss-walk'],
      ['enemy-boss', 'enemy-boss-walk'],
    ] as const;

    for (const [texture, animation] of animatedTextures) {
      if (this.anims.exists(animation)) continue;
      this.anims.create({
        key: animation,
        frames: this.anims.generateFrameNumbers(texture, { start: 0, end: animationEndFrame(texture) }),
        frameRate: animationFrameRate(texture),
        repeat: -1,
      });
    }

    this.scene.start('SurvivorScene', consumePendingRunOptions());
  }
}
