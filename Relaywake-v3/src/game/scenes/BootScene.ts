import Phaser from 'phaser';
import { animationFrameRate } from '../animationConfig';
import { phaserAssets } from '../assets';
import { consumePendingRunOptions } from '../runtimeContext';

export class BootScene extends Phaser.Scene {
  public constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    for (const asset of phaserAssets) {
      if ('frame' in asset) {
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frame.width,
          frameHeight: asset.frame.height,
          endFrame: asset.frame.count - 1,
        });
      } else {
        this.load.image(asset.key, asset.path);
      }
    }
  }

  public create(): void {
    const animatedTextures = [
      ['character-sprout', 'character-sprout-walk'],
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
        frames: this.anims.generateFrameNumbers(texture, { start: 0, end: 3 }),
        frameRate: animationFrameRate(texture),
        repeat: -1,
      });
    }

    this.scene.start('SurvivorScene', consumePendingRunOptions());
  }
}
