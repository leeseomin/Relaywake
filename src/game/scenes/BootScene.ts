import Phaser from 'phaser';
import { assetPaths } from '../assets';
import { consumePendingRunOptions } from '../runtimeContext';

export class BootScene extends Phaser.Scene {
  public constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    this.load.image('background-dirt', assetPaths.background);
    this.load.image('background-dirt-red', assetPaths.backgroundRed);

    this.load.spritesheet('character-blue', assetPaths.characterBlue, { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('character-purple', assetPaths.characterPurple, { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('character-white', assetPaths.characterWhite, { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('character-gray', assetPaths.characterGray, { frameWidth: 24, frameHeight: 24 });

    this.load.spritesheet('enemy-alien', assetPaths.enemyAlien, { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('enemy-crab', assetPaths.enemyCrab, { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('enemy-brute', assetPaths.enemyBrute, { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('enemy-wizard', assetPaths.enemyWizard, { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('enemy-nailhead', assetPaths.enemyNailhead, { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('enemy-gravity', assetPaths.enemyGravity, { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('enemy-miniboss', assetPaths.enemyMiniboss, { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('enemy-boss', assetPaths.enemyBoss, { frameWidth: 48, frameHeight: 48 });

    this.load.image('weapon-machine-gun', assetPaths.machineGun);
    this.load.image('weapon-shuriken', assetPaths.shuriken);
    this.load.image('weapon-bat', assetPaths.bat);
    this.load.image('weapon-dagger', assetPaths.dagger);
    this.load.image('weapon-sword', assetPaths.sword);
    this.load.image('weapon-grenade', assetPaths.grenade);
    this.load.image('weapon-molotov', assetPaths.molotov);
    this.load.image('weapon-lightsaber', assetPaths.lightsaber);
    this.load.image('weapon-machete', assetPaths.machete);
    this.load.image('weapon-bazooka', assetPaths.bazooka);
    this.load.image('weapon-bomb', assetPaths.bomb);
    this.load.image('enemy-boomerang', assetPaths.enemyBoomerang);
    this.load.image('enemy-gravity-grenade', assetPaths.gravityGrenade);

    this.load.spritesheet('pickup-gems', assetPaths.gems, { frameWidth: 7, frameHeight: 12 });
    this.load.image('pickup-gem-dark', assetPaths.gemDarkBlue);
    this.load.image('pickup-gem-light', assetPaths.gemLightBlue);
    this.load.image('pickup-coin', assetPaths.coin);
    this.load.image('pickup-coin-10', assetPaths.coin10);
    this.load.image('pickup-magnet', assetPaths.magnet);
    this.load.image('pickup-potion', assetPaths.potion);
    this.load.image('ui-circle', assetPaths.uiCircle);
    this.load.image('ui-circle-outline', assetPaths.uiCircleOutline);
    this.load.image('ui-square', assetPaths.uiSquare);
    this.load.image('ui-pause', assetPaths.uiPause);
    this.load.image('ui-play', assetPaths.uiPlay);
  }

  public create(): void {
    const animatedTextures = [
      ['character-blue', 'character-blue-walk'],
      ['character-purple', 'character-purple-walk'],
      ['character-white', 'character-white-walk'],
      ['character-gray', 'character-gray-walk'],
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
        frameRate: texture.includes('boss') ? 5 : 7,
        repeat: -1,
      });
    }

    this.scene.start('SurvivorScene', consumePendingRunOptions());
  }
}
