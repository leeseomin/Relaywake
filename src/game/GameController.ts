import Phaser from 'phaser';
import type { AbilityId } from './data/schemas';
import type { StartRunOptions } from './core/types';
import { BootScene } from './scenes/BootScene';
import { SurvivorScene } from './scenes/SurvivorScene';
import { clearPendingRunOptions, setPendingRunOptions } from './runtimeContext';
import { getActiveScene } from './sceneBridge';

class GameController {
  private game: Phaser.Game | null = null;
  private touchX = 0;
  private touchY = 0;

  public mount(parent: HTMLElement, options: StartRunOptions): void {
    this.destroy();
    setPendingRunOptions(options);
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 1280,
      height: 720,
      backgroundColor: '#070a12',
      render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true,
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720,
      },
      scene: [BootScene, SurvivorScene],
      banner: false,
      audio: { disableWebAudio: false },
    });
  }

  public chooseAbility(id: AbilityId): void {
    getActiveScene()?.chooseAbility(id);
  }

  public pause(): void {
    this.touchX = 0;
    this.touchY = 0;
    const scene = getActiveScene();
    scene?.setTouchVector(0, 0);
    scene?.setPaused(true);
  }

  public resume(): void {
    getActiveScene()?.setPaused(false);
  }

  public togglePause(): void {
    getActiveScene()?.togglePause();
  }

  public setTouchVector(x: number, y: number): void {
    this.touchX = x;
    this.touchY = y;
    getActiveScene()?.setTouchVector(x, y);
  }

  public syncTouchVector(): void {
    getActiveScene()?.setTouchVector(this.touchX, this.touchY);
  }

  public destroy(): void {
    this.touchX = 0;
    this.touchY = 0;
    this.game?.destroy(true);
    this.game = null;
    clearPendingRunOptions();
  }
}

export const gameController = new GameController();
