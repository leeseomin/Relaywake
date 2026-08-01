import type { StartRunOptions } from '../core/types';
import { getActiveScene, type ActiveGameScene } from '../sceneBridge';
import type { C2TestBridge, GameTestSnapshot } from './types';

interface TestEnemy {
  active: boolean;
  hp: number;
  definition: { id: string };
}

interface TestSceneAccess extends ActiveGameScene {
  options: StartRunOptions;
  player: {
    characterId: GameTestSnapshot['characterId'];
    hp: number;
    maxHp: number;
    invulnerability: number;
    x: number;
    y: number;
  };
  enemies: TestEnemy[];
  projectiles: Array<{ active: boolean }>;
  orbiters: Map<unknown, unknown[]>;
  elapsedSeconds: number;
  touchX: number;
  touchY: number;
  level: number;
  paused: boolean;
  levelUpOpen: boolean;
  ended: boolean;
  audioPaused: boolean;
  anims: { paused: boolean };
  tweens: { paused: boolean };
  gainExperience: (amount: number) => void;
  damagePlayer: (amount: number) => void;
  spawnEnemy: (id: 'crawler' | 'finalBoss', preferredDistance?: number) => void;
  damageEnemy: (
    enemy: TestEnemy,
    amount: number,
    knockback: number,
    sourceX: number,
    sourceY: number,
    allowLifesteal: boolean,
  ) => void;
  finishRun: (victory: boolean) => void;
}

function activeTestScene(): TestSceneAccess {
  const scene = getActiveScene();
  if (!scene) throw new Error('The E2E bridge was used without an active game scene.');
  return scene as unknown as TestSceneAccess;
}

function snapshot(): GameTestSnapshot {
  const scene = activeTestScene();
  return {
    ready: true,
    paused: scene.paused,
    characterId: scene.player.characterId,
    fieldThemeId: scene.options.fieldThemeId,
    hp: scene.player.hp,
    maxHp: scene.player.maxHp,
    level: scene.level,
    enemies: scene.enemies.filter((enemy) => enemy.active).length,
    projectiles: scene.projectiles.filter((projectile) => projectile.active).length,
    orbiters: [...scene.orbiters.values()].reduce((total, group) => total + group.length, 0),
    elapsedSeconds: scene.elapsedSeconds,
    touchX: scene.touchX,
    touchY: scene.touchY,
    presentationPaused: scene.anims.paused && scene.tweens.paused,
    audioPaused: scene.audioPaused,
    screen: scene.ended
      ? 'gameOver'
      : scene.levelUpOpen
        ? 'levelUp'
        : scene.paused
          ? 'paused'
          : 'playing',
  };
}

export function installTestBridge(): () => void {
  if (!__E2E__) throw new Error('The E2E bridge cannot be installed in a production build.');

  const bridge: C2TestBridge = {
    ready: true,
    snapshot,
    grantXp: (amount) => activeTestScene().gainExperience(Math.max(0, amount)),
    damagePlayer: (amount) => {
      const scene = activeTestScene();
      scene.player.invulnerability = 0;
      scene.damagePlayer(Math.max(0, amount));
    },
    spawnEnemy: () => activeTestScene().spawnEnemy('crawler', 145),
    testKillFinalBoss: () => {
      const scene = activeTestScene();
      if (scene.ended) return;
      let boss = scene.enemies.find(
        (enemy) => enemy.active && enemy.definition.id === 'finalBoss',
      );
      if (!boss) {
        scene.spawnEnemy('finalBoss', 180);
        boss = scene.enemies.find(
          (enemy) => enemy.active && enemy.definition.id === 'finalBoss',
        );
      }
      if (boss) {
        scene.damageEnemy(boss, boss.hp, 0, scene.player.x, scene.player.y, false);
      }
    },
    finishRun: (victory) => activeTestScene().finishRun(victory),
  };

  window.__C2_GAME__ = bridge;
  return () => {
    if (window.__C2_GAME__ === bridge) delete window.__C2_GAME__;
  };
}
