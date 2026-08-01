import Phaser from 'phaser';
import { gameEvents } from '../../app/gameEvents';
import { assetDisplayScale, iconUrl } from '../assets';
import {
  FINAL_BOSS_COIN_REWARD,
  resolveDamage,
  resolveSideSlashPattern,
  type SlashSide,
} from '../core/combat';
import { applyExperience, xpRequiredForLevel } from '../core/xp';
import { circleOverlap, clamp, distanceSquared, normalize } from '../core/math';
import { applyCharacterAbilityModifiers } from '../core/mastery';
import { SeededRandom } from '../core/rng';
import type {
  AbilityChoiceView,
  HudSnapshot,
  RunSummary,
  StartRunOptions,
} from '../core/types';
import { getAbility } from '../data/abilities';
import { getCharacter, type CharacterId } from '../data/characters';
import { getEnemy, type EnemyId } from '../data/enemies';
import { fieldBackgroundLayers, getFieldTheme } from '../data/fieldThemes';
import { levelOne, regularEnemyOrder } from '../data/level';
import { t } from '../data/localization';
import type { AbilityId, EnemyDefinition, WeaponStats } from '../data/schemas';
import { attachActiveScene, detachActiveScene } from '../sceneBridge';
import { AbilityDirector } from '../systems/AbilityDirector';
import { ObjectPool } from '../systems/ObjectPool';
import { syncPresentationPause } from '../systems/PresentationPause';
import { SpatialHashGrid, type SpatialPoint } from '../systems/SpatialHashGrid';
import { separateSpatialCircles } from '../systems/SpatialSeparation';
import { SpawnDirector } from '../systems/SpawnDirector';

type PickupKind = 'gem' | 'coin' | 'health' | 'magnet' | 'bomb' | 'chest';
type ProjectileOwner = 'player' | 'enemy';
type ProjectileExpiry = 'none' | 'explosion' | 'fire' | 'gravity';
type ZoneKind = 'fire' | 'gravity';

interface PlayerRuntime {
  sprite: Phaser.GameObjects.Sprite;
  characterId: CharacterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  armor: number;
  moveSpeed: number;
  acceleration: number;
  luck: number;
  pickupRadius: number;
  facingAngle: number;
  invulnerability: number;
}

interface EnemyRuntime extends SpatialPoint {
  definition: EnemyDefinition;
  sprite: Phaser.GameObjects.Sprite;
  textureKey: string;
  hp: number;
  maxHp: number;
  radius: number;
  attackTimer: number;
  flashTimer: number;
  knockbackX: number;
  knockbackY: number;
  bleedDamage: number;
  bleedTimer: number;
  bleedTickTimer: number;
  burnDamage: number;
  burnTimer: number;
  burnTickTimer: number;
}

interface BossSafeView {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

interface FinalBossEncounterState {
  enemyId: number | null;
  outOfRangeDuration: number;
  warningRemaining: number;
  repositionCooldown: number;
}

interface ProjectileRuntime {
  id: number;
  active: boolean;
  owner: ProjectileOwner;
  sprite: Phaser.GameObjects.Sprite;
  textureKey: string;
  sourceAbility: AbilityId | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  ttl: number;
  totalTtl: number;
  pierce: number;
  knockback: number;
  rotationSpeed: number;
  expiry: ProjectileExpiry;
  explosionRadius: number;
  zoneDuration: number;
  fragments: number;
  directCollision: boolean;
  boomerang: boolean;
  reversed: boolean;
  hitIds: Set<number>;
}

interface PickupRuntime {
  id: number;
  active: boolean;
  sprite: Phaser.GameObjects.Sprite;
  textureKey: string;
  kind: PickupKind;
  x: number;
  y: number;
  value: number;
  attracted: boolean;
  age: number;
}

interface ZoneRuntime {
  id: number;
  active: boolean;
  kind: ZoneKind;
  owner: ProjectileOwner;
  visual: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  damage: number;
  knockback: number;
  ttl: number;
  tickTimer: number;
  tickInterval: number;
}

interface MeleeRuntime {
  id: number;
  active: boolean;
  visual: Phaser.GameObjects.Sprite;
  textureKey: string;
  sourceAbility: AbilityId;
  angle: number;
  angularVelocity: number;
  arcHalfAngle: number;
  radius: number;
  damage: number;
  knockback: number;
  ttl: number;
  totalTtl: number;
  hitIds: Set<number>;
}

interface OrbiterRuntime {
  visual: Phaser.GameObjects.Sprite;
  echoes: Phaser.GameObjects.Sprite[];
  glow: Phaser.GameObjects.Arc | null;
  textureKey: string;
  lastHitAt: Map<number, number>;
}

const PLAYER_RADIUS = 18;
const ENEMY_CAP = 420;
const E2E_ENEMY_CAP = 90;
const HUD_INTERVAL = 0.08;
const COMPACT_INTERVAL = 0.7;
const BOSS_HUD_SAFE_TOP_PX = 120;
const BOSS_EDGE_MARGIN_PX = 24;
const FINAL_BOSS_CATCH_UP_MARGIN = 80;
const FINAL_BOSS_FAR_DISTANCE_MULTIPLIER = 1.5;
const FINAL_BOSS_RETURN_DISTANCE_MULTIPLIER = 1.35;
const FINAL_BOSS_OUT_OF_RANGE_SECONDS = 2;
const FINAL_BOSS_WARNING_SECONDS = 0.8;
const FINAL_BOSS_REPOSITION_COOLDOWN_SECONDS = 8;
const FINAL_BOSS_ATTACK_GRACE_SECONDS = 1.2;

export class SurvivorScene extends Phaser.Scene {
  private options!: StartRunOptions;
  private rng!: SeededRandom;
  private player!: PlayerRuntime;
  private abilities!: AbilityDirector;
  private spawns!: SpawnDirector;
  private background!: Phaser.GameObjects.TileSprite;
  private backgroundTint!: Phaser.GameObjects.TileSprite;
  private backgroundNoise!: Phaser.GameObjects.TileSprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keys: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key> | null = null;

  private readonly enemyGrid = new SpatialHashGrid<EnemyRuntime>(96);
  private readonly enemies: EnemyRuntime[] = [];
  private readonly projectiles: ProjectileRuntime[] = [];
  private readonly pickups: PickupRuntime[] = [];
  private readonly zones: ZoneRuntime[] = [];
  private readonly meleeEffects: MeleeRuntime[] = [];
  private readonly orbiters = new Map<AbilityId, OrbiterRuntime[]>();
  private readonly spritePools = new Map<string, ObjectPool<Phaser.GameObjects.Sprite>>();
  private readonly finalBossEncounter: FinalBossEncounterState = {
    enemyId: null,
    outOfRangeDuration: 0,
    warningRemaining: 0,
    repositionCooldown: 0,
  };

  private nextEntityId = 1;
  private elapsedSeconds = 0;
  private durationSeconds = levelOne.durationSeconds;
  private miniBossSeconds = levelOne.miniBossTimeSeconds;
  private nextChestTime = levelOne.chestIntervalSeconds;
  private hudTimer = 0;
  private compactTimer = 0;
  private magnetTimer = 0;
  private recoveryTimer = 0;
  private level = 1;
  private xp = 0;
  private xpRequired = 5;
  private pendingLevelUps = 0;
  private levelUpOpen = false;
  private paused = false;
  private ended = false;
  private kills = 0;
  private coins = 0;
  private damageDealt = 0;
  private touchX = 0;
  private touchY = 0;
  private macheteSide: SlashSide = 1;
  private audioContext: AudioContext | null = null;
  private audioPaused = false;
  private readonly activeTones = new Map<OscillatorNode, GainNode>();

  public constructor() {
    super({ key: 'SurvivorScene' });
  }

  public init(options: StartRunOptions): void {
    this.options = options;
    this.durationSeconds = __E2E__ && options.e2e ? 24 : levelOne.durationSeconds;
    this.miniBossSeconds = __E2E__ && options.e2e ? 10 : levelOne.miniBossTimeSeconds;
    this.finalBossEncounter.enemyId = null;
    this.finalBossEncounter.outOfRangeDuration = 0;
    this.finalBossEncounter.warningRemaining = 0;
    this.finalBossEncounter.repositionCooldown = 0;
    this.rng = new SeededRandom(options.seed ?? Date.now());
    this.abilities = new AbilityDirector(this.rng);
    this.spawns = new SpawnDirector(this.rng, this.durationSeconds, this.miniBossSeconds);
  }

  public create(): void {
    this.createBackground();
    this.createPlayer();
    this.bindInput();
    this.spawnInitialPickups();

    this.cameras.main.roundPixels = true;
    this.cameras.main.startFollow(this.player.sprite, true, 0.085, 0.085);
    this.cameras.main.setZoom(__E2E__ && this.options.e2e ? 1.05 : 1);

    attachActiveScene(this);
    this.events.once('shutdown', this.handleShutdown, this);
    gameEvents.emit('ready', undefined);
    this.emitHud(true);
  }

  public override update(_time: number, deltaMs: number): void {
    if (this.paused || this.ended) return;
    const delta = Math.min(0.05, deltaMs / 1000);
    this.elapsedSeconds += delta;
    this.hudTimer -= delta;
    this.compactTimer -= delta;
    this.magnetTimer = Math.max(0, this.magnetTimer - delta);
    this.player.invulnerability = Math.max(0, this.player.invulnerability - delta);

    this.updateBackground();
    this.updatePlayer(delta);
    this.abilities.tick(delta);
    this.updateRecovery(delta);
    this.updateSpawning(delta);
    this.updateEnemies(delta);
    this.updateFinalBossEncounter(delta);
    separateSpatialCircles(this.enemies, this.enemyGrid);
    this.syncEnemyPositions();
    this.updateOrbiters(delta);
    this.updateWeapons();
    this.updateMelee(delta);
    this.updateProjectiles(delta);
    this.updateZones(delta);
    this.updatePickups(delta);

    if (this.compactTimer <= 0) {
      this.compactTimer = COMPACT_INTERVAL;
      this.compactEntities();
    }
    this.emitHud(false);
  }

  public chooseAbility(id: AbilityId): void {
    if (!this.levelUpOpen || this.ended) return;
    const state = this.abilities.grant(id);
    gameEvents.emit('toast', `${getAbility(id).name[this.options.preferences.locale]} · Lv.${state.level}`);
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    this.levelUpOpen = false;
    if (this.pendingLevelUps > 0) {
      if (!this.openLevelUp()) {
        this.applyPausedState(false);
        gameEvents.emit('paused', false);
        this.emitHud(true);
      }
    } else {
      this.applyPausedState(false);
      gameEvents.emit('paused', false);
      this.emitHud(true);
    }
    if (!this.paused) this.tone(640, 0.08);
  }

  public setPaused(paused: boolean): void {
    if (this.ended || this.levelUpOpen || this.paused === paused) return;
    this.applyPausedState(paused);
    gameEvents.emit('paused', paused);
    this.emitHud(true);
  }

  public togglePause(): void {
    this.setPaused(!this.paused);
  }

  public setTouchVector(x: number, y: number): void {
    const direction = normalize(x, y);
    const magnitude = clamp(Math.hypot(x, y), 0, 1);
    this.touchX = direction.x * magnitude;
    this.touchY = direction.y * magnitude;
  }

  private createBackground(): void {
    const fieldTheme = getFieldTheme(this.options.fieldThemeId);
    this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, fieldTheme.assetKey)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-1000);
    this.backgroundTint = this.add.tileSprite(
      0,
      0,
      this.scale.width,
      this.scale.height,
      fieldBackgroundLayers.tintAssetKey,
    )
      .setOrigin(0)
      .setScrollFactor(0)
      .setAlpha(0.11)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-999);
    this.backgroundNoise = this.add.tileSprite(
      0,
      0,
      this.scale.width,
      this.scale.height,
      fieldBackgroundLayers.noiseAssetKey,
    )
      .setOrigin(0)
      .setScrollFactor(0)
      .setAlpha(0.08)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(-998);

    const dust = this.add.graphics().setDepth(-997);
    dust.fillStyle(0x91a4c8, 0.06);
    for (let index = 0; index < 120; index += 1) {
      const x = this.rng.between(-1800, 1800);
      const y = this.rng.between(-1800, 1800);
      dust.fillCircle(x, y, this.rng.between(1, 3));
    }
  }

  private createPlayer(): void {
    const character = getCharacter(this.options.characterId);
    const sprite = this.add.sprite(0, 0, character.spriteKey, 0)
      .setScale(character.displayScale)
      .setDepth(100)
      .play(`${character.spriteKey}-walk`);
    // Phaser's default 'safeAuto' mode skips pixel snapping for any scaled sprite, so the camera's
    // roundPixels never reaches the player. Forcing it is only safe at integer scales, where
    // rounding the quad corners preserves a uniform texel grid instead of wobbling its width.
    if (Number.isInteger(character.displayScale)) sprite.vertexRoundMode = 'fullAuto';
    this.player = {
      sprite,
      characterId: character.id,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      hp: character.maxHp,
      maxHp: character.maxHp,
      armor: character.armor,
      moveSpeed: character.moveSpeed,
      acceleration: character.acceleration,
      luck: character.luck,
      pickupRadius: character.pickupRadius,
      facingAngle: 0,
      invulnerability: 0,
    };
    this.abilities.grant(character.startingAbility);
    this.xpRequired = xpRequiredForLevel(1);
  }

  private bindInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  }

  private spawnInitialPickups(): void {
    for (let index = 0; index < levelOne.initialGemCount; index += 1) {
      const angle = this.rng.between(0, Math.PI * 2);
      const radius = this.rng.between(150, 680);
      this.spawnPickup('gem', Math.cos(angle) * radius, Math.sin(angle) * radius, 1);
    }
  }

  private updateBackground(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    if (this.background.width !== width || this.background.height !== height) {
      this.background.setSize(width, height);
      this.backgroundTint.setSize(width, height);
      this.backgroundNoise.setSize(width, height);
    }
    this.background.tilePositionX = this.player.x * 0.28;
    this.background.tilePositionY = this.player.y * 0.28;
    this.backgroundTint.tilePositionX = this.player.x * 0.18;
    this.backgroundTint.tilePositionY = this.player.y * 0.18;
    this.backgroundNoise.tilePositionX = this.background.tilePositionX;
    this.backgroundNoise.tilePositionY = this.background.tilePositionY;
  }

  private updatePlayer(delta: number): void {
    const keyboardX = (this.cursors?.right.isDown || this.keys?.D.isDown ? 1 : 0)
      - (this.cursors?.left.isDown || this.keys?.A.isDown ? 1 : 0);
    const keyboardY = (this.cursors?.down.isDown || this.keys?.S.isDown ? 1 : 0)
      - (this.cursors?.up.isDown || this.keys?.W.isDown ? 1 : 0);
    const rawX = keyboardX !== 0 || keyboardY !== 0 ? keyboardX : this.touchX;
    const rawY = keyboardX !== 0 || keyboardY !== 0 ? keyboardY : this.touchY;
    const direction = normalize(rawX, rawY);
    const speedMultiplier = this.abilities.globalModifiers().moveSpeed;
    const targetX = direction.x * this.player.moveSpeed * speedMultiplier;
    const targetY = direction.y * this.player.moveSpeed * speedMultiplier;
    const step = this.player.acceleration * delta;

    this.player.vx = Phaser.Math.Linear(this.player.vx, targetX, clamp(step / Math.max(1, Math.abs(targetX - this.player.vx)), 0, 1));
    this.player.vy = Phaser.Math.Linear(this.player.vy, targetY, clamp(step / Math.max(1, Math.abs(targetY - this.player.vy)), 0, 1));
    if (direction.x === 0) this.player.vx = this.approach(this.player.vx, 0, step);
    if (direction.y === 0) this.player.vy = this.approach(this.player.vy, 0, step);

    this.player.x += this.player.vx * delta;
    this.player.y += this.player.vy * delta;
    this.player.sprite.setPosition(this.player.x, this.player.y);

    if (Math.abs(this.player.vx) + Math.abs(this.player.vy) > 2) {
      this.player.facingAngle = Math.atan2(this.player.vy, this.player.vx);
      this.player.sprite.setFlipX(this.player.vx < 0);
      if (!this.player.sprite.anims.isPlaying) this.player.sprite.play(`${getCharacter(this.player.characterId).spriteKey}-walk`);
    } else {
      this.player.sprite.anims.stop();
      this.player.sprite.setFrame(0);
    }
    if (this.player.invulnerability <= 0) this.player.sprite.clearTint();
    else this.player.sprite.setAlpha(Math.floor(this.player.invulnerability * 18) % 2 === 0 ? 0.45 : 1);
    if (this.player.invulnerability <= 0) this.player.sprite.setAlpha(1);
  }

  private updateRecovery(delta: number): void {
    const state = this.abilities.get('recovery');
    if (!state) return;
    this.recoveryTimer -= delta;
    if (this.recoveryTimer > 0) return;
    const stats = this.abilities.effectiveStats('recovery');
    this.recoveryTimer = Math.max(1, stats.cooldown);
    this.healPlayer(stats.recovery);
  }

  private updateSpawning(delta: number): void {
    const tick = this.spawns.update(delta, this.elapsedSeconds);
    const cap = __E2E__ && this.options.e2e ? E2E_ENEMY_CAP : ENEMY_CAP;
    for (const id of tick.regularEnemies) {
      if (this.enemies.filter((enemy) => enemy.active).length >= cap) break;
      this.spawnEnemy(id);
    }
    if (tick.spawnMiniBoss) {
      this.spawnEnemy('miniBoss');
      gameEvents.emit('toast', t(this.options.preferences.locale, 'miniBossIncoming'));
    }
    if (tick.spawnFinalBoss) {
      this.spawnFinalBoss();
      gameEvents.emit('toast', t(this.options.preferences.locale, 'finalBossIncoming'));
    }

    while (this.elapsedSeconds >= this.nextChestTime && this.nextChestTime < this.durationSeconds) {
      this.nextChestTime += levelOne.chestIntervalSeconds;
      for (let index = 0; index < 2; index += 1) {
        const angle = this.rng.between(0, Math.PI * 2);
        const radius = this.rng.between(280, 430);
        this.spawnPickup('chest', this.player.x + Math.cos(angle) * radius, this.player.y + Math.sin(angle) * radius, 1);
      }
    }
  }

  private spawnFinalBoss(): EnemyRuntime {
    const position = this.chooseFinalBossPosition();
    return this.spawnEnemyAt(
      'finalBoss',
      position.x,
      position.y,
      FINAL_BOSS_ATTACK_GRACE_SECONDS,
    );
  }

  private spawnEnemy(id: EnemyId, fixedDistance?: number): EnemyRuntime {
    const angle = this.rng.between(0, Math.PI * 2);
    const viewportRadius = Math.max(this.scale.width, this.scale.height) * 0.57;
    const radius = fixedDistance ?? viewportRadius + this.rng.between(110, 260);
    const x = this.player.x + Math.cos(angle) * radius;
    const y = this.player.y + Math.sin(angle) * radius;
    return this.spawnEnemyAt(id, x, y);
  }

  private spawnEnemyAt(
    id: EnemyId,
    x: number,
    y: number,
    attackGraceSeconds = 0,
  ): EnemyRuntime {
    const definition = getEnemy(id);
    const sprite = this.acquireSprite(definition.spriteKey)
      .setPosition(x, y)
      .setScale(definition.displayScale)
      .setDepth(definition.boss ? 75 : 60)
      .play(definition.animationKey);
    const spawnIndex = regularEnemyOrder.indexOf(id as (typeof regularEnemyOrder)[number]);
    const hpMultiplier = spawnIndex >= 0 ? this.spawns.hpMultiplier(spawnIndex, this.elapsedSeconds) : 1;
    const maxHp = definition.hp * hpMultiplier;
    const enemy: EnemyRuntime = {
      id: this.nextId(),
      active: true,
      definition,
      sprite,
      textureKey: definition.spriteKey,
      x,
      y,
      hp: maxHp,
      maxHp,
      radius: definition.radius,
      attackTimer: Math.max(
        attackGraceSeconds,
        this.rng.between(0.15, definition.attackCooldown),
      ),
      flashTimer: 0,
      knockbackX: 0,
      knockbackY: 0,
      bleedDamage: 0,
      bleedTimer: 0,
      bleedTickTimer: 0,
      burnDamage: 0,
      burnTimer: 0,
      burnTickTimer: 0,
    };
    this.enemies.push(enemy);
    if (id === 'finalBoss') {
      this.finalBossEncounter.enemyId = enemy.id;
      this.finalBossEncounter.outOfRangeDuration = 0;
      this.finalBossEncounter.warningRemaining = 0;
      this.finalBossEncounter.repositionCooldown = 0;
    }
    return enemy;
  }

  private updateEnemies(delta: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      enemy.attackTimer -= delta;
      enemy.flashTimer = Math.max(0, enemy.flashTimer - delta);
      if (enemy.flashTimer <= 0) enemy.sprite.clearTint();
      this.updateBleed(enemy, delta);
      this.updateBurn(enemy, delta);
      if (!enemy.active) continue;

      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const directionX = dx / distance;
      const directionY = dy / distance;
      const finalBossOffscreen = (
        enemy.definition.id === 'finalBoss'
        && !this.isInsideBossSafeView(enemy)
      );
      let moveDirection = 1;
      if (!finalBossOffscreen && enemy.definition.behavior !== 'melee' && distance < enemy.definition.attackRange * 0.68) moveDirection = -0.55;
      if (!finalBossOffscreen && enemy.definition.behavior !== 'melee' && distance < enemy.definition.attackRange * 1.05 && distance >= enemy.definition.attackRange * 0.68) moveDirection = 0;

      const damping = Math.exp(-7 * delta);
      enemy.knockbackX *= damping;
      enemy.knockbackY *= damping;
      const moveSpeed = finalBossOffscreen
        ? Math.max(
          enemy.definition.speed,
          this.player.moveSpeed * this.abilities.globalModifiers().moveSpeed
            + FINAL_BOSS_CATCH_UP_MARGIN,
        )
        : enemy.definition.speed;
      enemy.x += (directionX * moveSpeed * moveDirection + enemy.knockbackX) * delta;
      enemy.y += (directionY * moveSpeed * moveDirection + enemy.knockbackY) * delta;

      enemy.sprite.setFlipX(directionX < 0);
      if (distance > 2200 && !enemy.definition.boss) {
        this.deactivateEnemy(enemy, false);
        continue;
      }

      if (enemy.definition.behavior === 'melee') {
        if (distance <= enemy.radius + PLAYER_RADIUS + 5 && enemy.attackTimer <= 0) {
          enemy.attackTimer = enemy.definition.attackCooldown;
          this.damagePlayer(enemy.definition.damage);
        }
      } else if (distance <= enemy.definition.attackRange && enemy.attackTimer <= 0) {
        enemy.attackTimer = enemy.definition.attackCooldown;
        this.fireEnemyWeapon(enemy, directionX, directionY);
      }
    }
  }

  private updateFinalBossEncounter(delta: number): void {
    const encounter = this.finalBossEncounter;
    encounter.repositionCooldown = Math.max(0, encounter.repositionCooldown - delta);
    const boss = this.activeFinalBoss();
    if (!boss) {
      encounter.outOfRangeDuration = 0;
      encounter.warningRemaining = 0;
      return;
    }

    const distance = Math.hypot(this.player.x - boss.x, this.player.y - boss.y);
    const worldView = this.cameras.main.worldView;
    const cameraDiagonal = Math.hypot(worldView.width, worldView.height);
    if (cameraDiagonal <= Number.EPSILON) return;
    const farDistance = cameraDiagonal * FINAL_BOSS_FAR_DISTANCE_MULTIPLIER;
    const returnDistance = cameraDiagonal * FINAL_BOSS_RETURN_DISTANCE_MULTIPLIER;

    if (encounter.warningRemaining > 0) {
      if (distance <= returnDistance) {
        encounter.warningRemaining = 0;
        encounter.outOfRangeDuration = 0;
        return;
      }
      encounter.warningRemaining = Math.max(0, encounter.warningRemaining - delta);
      if (encounter.warningRemaining === 0) this.repositionFinalBoss(boss);
      return;
    }

    if (encounter.repositionCooldown > 0) {
      encounter.outOfRangeDuration = 0;
      return;
    }
    if (distance > farDistance) {
      encounter.outOfRangeDuration += delta;
    } else if (distance <= returnDistance) {
      encounter.outOfRangeDuration = 0;
    }
    if (encounter.outOfRangeDuration < FINAL_BOSS_OUT_OF_RANGE_SECONDS) return;

    encounter.outOfRangeDuration = 0;
    encounter.warningRemaining = FINAL_BOSS_WARNING_SECONDS;
    gameEvents.emit('toast', t(this.options.preferences.locale, 'finalBossReacquired'));
  }

  private activeFinalBoss(): EnemyRuntime | null {
    const encounterId = this.finalBossEncounter.enemyId;
    const knownBoss = encounterId === null
      ? null
      : this.enemies.find((enemy) => (
        enemy.id === encounterId
        && enemy.active
        && enemy.definition.id === 'finalBoss'
      )) ?? null;
    if (knownBoss) return knownBoss;

    const boss = this.enemies.find((enemy) => (
      enemy.active && enemy.definition.id === 'finalBoss'
    )) ?? null;
    this.finalBossEncounter.enemyId = boss?.id ?? null;
    return boss;
  }

  private repositionFinalBoss(boss: EnemyRuntime): void {
    const position = this.chooseFinalBossPosition();
    boss.x = position.x;
    boss.y = position.y;
    boss.knockbackX = 0;
    boss.knockbackY = 0;
    boss.attackTimer = Math.max(boss.attackTimer, FINAL_BOSS_ATTACK_GRACE_SECONDS);
    this.finalBossEncounter.outOfRangeDuration = 0;
    this.finalBossEncounter.warningRemaining = 0;
    this.finalBossEncounter.repositionCooldown = FINAL_BOSS_REPOSITION_COOLDOWN_SECONDS;
  }

  private chooseFinalBossPosition(): { x: number; y: number } {
    const definition = getEnemy('finalBoss');
    const safeView = this.bossSafeView(definition.radius);
    const forward = this.playerForwardDirection();
    const directPosition = this.rayExitFromSafeView(
      this.player.x,
      this.player.y,
      forward.x,
      forward.y,
      safeView,
    );
    const safeDiagonal = Math.hypot(safeView.width, safeView.height);
    const minimumDistance = Math.min(
      safeDiagonal * 0.35,
      definition.attackRange * 1.1,
    );
    if (
      directPosition
      && Math.hypot(
        directPosition.x - this.player.x,
        directPosition.y - this.player.y,
      ) >= minimumDistance
    ) {
      return directPosition;
    }

    const centerX = (safeView.left + safeView.right) / 2;
    const centerY = (safeView.top + safeView.bottom) / 2;
    const edgePositions = [
      { x: safeView.left, y: safeView.top },
      { x: centerX, y: safeView.top },
      { x: safeView.right, y: safeView.top },
      { x: safeView.right, y: centerY },
      { x: safeView.right, y: safeView.bottom },
      { x: centerX, y: safeView.bottom },
      { x: safeView.left, y: safeView.bottom },
      { x: safeView.left, y: centerY },
    ];
    if (directPosition) edgePositions.push(directPosition);
    const forwardPositions = edgePositions.filter((position) => (
      (position.x - this.player.x) * forward.x
      + (position.y - this.player.y) * forward.y
    ) >= 0);
    const candidates = forwardPositions.length > 0 ? forwardPositions : edgePositions;

    let selected = candidates[0] ?? { x: centerX, y: centerY };
    let selectedDistance = -1;
    for (const candidate of candidates) {
      const candidateDistance = distanceSquared(candidate, this.player);
      if (candidateDistance <= selectedDistance) continue;
      selected = candidate;
      selectedDistance = candidateDistance;
    }
    return selected;
  }

  private playerForwardDirection(): { x: number; y: number } {
    if (Math.hypot(this.player.vx, this.player.vy) > 2) {
      return normalize(this.player.vx, this.player.vy);
    }
    return {
      x: Math.cos(this.player.facingAngle),
      y: Math.sin(this.player.facingAngle),
    };
  }

  private rayExitFromSafeView(
    originX: number,
    originY: number,
    directionX: number,
    directionY: number,
    safeView: BossSafeView,
  ): { x: number; y: number } | null {
    const intersections: Array<{ x: number; y: number; distance: number }> = [];
    const epsilon = 0.0001;
    if (Math.abs(directionX) > epsilon) {
      for (const x of [safeView.left, safeView.right]) {
        const distance = (x - originX) / directionX;
        const y = originY + directionY * distance;
        if (
          distance > 0
          && y >= safeView.top - epsilon
          && y <= safeView.bottom + epsilon
        ) {
          intersections.push({ x, y, distance });
        }
      }
    }
    if (Math.abs(directionY) > epsilon) {
      for (const y of [safeView.top, safeView.bottom]) {
        const distance = (y - originY) / directionY;
        const x = originX + directionX * distance;
        if (
          distance > 0
          && x >= safeView.left - epsilon
          && x <= safeView.right + epsilon
        ) {
          intersections.push({ x, y, distance });
        }
      }
    }
    let exit: (typeof intersections)[number] | null = null;
    for (const intersection of intersections) {
      if (!exit || intersection.distance > exit.distance) exit = intersection;
    }
    return exit ? { x: exit.x, y: exit.y } : null;
  }

  private bossSafeView(bossRadius: number): BossSafeView {
    const camera = this.cameras.main;
    const worldView = camera.worldView;
    const zoom = Math.max(0.001, camera.zoom);
    const edgeInset = bossRadius + BOSS_EDGE_MARGIN_PX / zoom;
    const topInset = bossRadius + BOSS_HUD_SAFE_TOP_PX / zoom;
    let left = worldView.x + edgeInset;
    let right = worldView.x + worldView.width - edgeInset;
    let top = worldView.y + topInset;
    let bottom = worldView.y + worldView.height - edgeInset;

    if (left > right) {
      left = worldView.centerX;
      right = worldView.centerX;
    }
    if (top > bottom) {
      top = worldView.centerY;
      bottom = worldView.centerY;
    }
    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }

  private isInsideBossSafeView(boss: EnemyRuntime): boolean {
    const safeView = this.bossSafeView(boss.radius);
    return (
      boss.x >= safeView.left
      && boss.x <= safeView.right
      && boss.y >= safeView.top
      && boss.y <= safeView.bottom
    );
  }

  private syncEnemyPositions(): void {
    for (const enemy of this.enemies) {
      if (enemy.active) enemy.sprite.setPosition(enemy.x, enemy.y);
    }
  }

  private updateBleed(enemy: EnemyRuntime, delta: number): void {
    if (enemy.bleedTimer <= 0) return;
    enemy.bleedTimer -= delta;
    enemy.bleedTickTimer -= delta;
    if (enemy.bleedTickTimer <= 0) {
      enemy.bleedTickTimer = 0.75;
      this.damageEnemy(enemy, enemy.bleedDamage, 0, enemy.x, enemy.y, false);
    }
  }

  private updateBurn(enemy: EnemyRuntime, delta: number): void {
    if (enemy.burnTimer <= 0) return;
    enemy.burnTimer -= delta;
    enemy.burnTickTimer -= delta;
    if (enemy.burnTickTimer <= 0) {
      enemy.burnTickTimer = 0.55;
      this.damageEnemy(enemy, enemy.burnDamage, 0, enemy.x, enemy.y, false);
    }
  }

  private igniteEnemy(enemy: EnemyRuntime, damage: number, duration: number): void {
    if (!enemy.active || damage <= 0 || duration <= 0) return;
    const wasBurning = enemy.burnTimer > 0;
    enemy.burnDamage = wasBurning ? Math.max(enemy.burnDamage, damage) : damage;
    enemy.burnTimer = Math.max(enemy.burnTimer, duration);
    enemy.burnTickTimer = wasBurning ? Math.min(enemy.burnTickTimer, 0.25) : 0.18;
  }

  private fireEnemyWeapon(enemy: EnemyRuntime, directionX: number, directionY: number): void {
    if (enemy.definition.behavior === 'ranged') {
      this.spawnProjectile({
        owner: 'enemy', textureKey: 'weapon-grenade', sourceAbility: null,
        x: enemy.x, y: enemy.y, vx: directionX * enemy.definition.projectileSpeed, vy: directionY * enemy.definition.projectileSpeed,
        damage: enemy.definition.damage, radius: 9, ttl: 2.2, pierce: 1, knockback: 0,
        rotationSpeed: 4, expiry: 'none', explosionRadius: 0, zoneDuration: 0, fragments: 0,
        directCollision: true, boomerang: false,
      });
      return;
    }
    if (enemy.definition.behavior === 'boomerang') {
      this.spawnProjectile({
        owner: 'enemy', textureKey: 'enemy-boomerang', sourceAbility: null,
        x: enemy.x, y: enemy.y, vx: directionX * enemy.definition.projectileSpeed, vy: directionY * enemy.definition.projectileSpeed,
        damage: enemy.definition.damage, radius: 11, ttl: 2.4, pierce: 2, knockback: 0,
        rotationSpeed: 8, expiry: 'none', explosionRadius: 0, zoneDuration: 0, fragments: 0,
        directCollision: true, boomerang: true,
      });
      return;
    }
    this.spawnProjectile({
      owner: 'enemy', textureKey: 'enemy-gravity-grenade', sourceAbility: null,
      x: enemy.x, y: enemy.y, vx: directionX * enemy.definition.projectileSpeed, vy: directionY * enemy.definition.projectileSpeed,
      damage: enemy.definition.damage, radius: 10, ttl: 1.25, pierce: 1, knockback: 0,
      rotationSpeed: 5, expiry: 'gravity', explosionRadius: 92, zoneDuration: 2.6, fragments: 0,
      directCollision: false, boomerang: false,
    });
  }

  private effectiveAbilityStats(id: AbilityId): WeaponStats {
    return applyCharacterAbilityModifiers(
      getCharacter(this.player.characterId),
      id,
      this.abilities.effectiveStats(id),
    );
  }

  private updateWeapons(): void {
    for (const state of this.abilities.owned()) {
      const definition = getAbility(state.id);
      if (definition.category !== 'active' || definition.behavior === 'orbit') continue;
      if (!this.abilities.isReady(state.id)) continue;
      const stats = this.effectiveAbilityStats(state.id);
      const target = this.nearestEnemy(850);
      if (!target && !['meleeFan', 'beam', 'sideSlash'].includes(definition.behavior)) continue;

      switch (definition.behavior) {
        case 'projectile':
        case 'spreadProjectile':
          if (target) this.firePlayerProjectiles(state.id, stats, target, definition.behavior === 'spreadProjectile');
          break;
        case 'meleeFan':
          this.createMelee(state.id, stats, this.player.facingAngle, Math.PI * 0.43, 0);
          break;
        case 'grenade':
          if (target) this.fireGrenade(state.id, stats, target);
          break;
        case 'molotov':
          if (target) this.fireMolotov(stats, target);
          break;
        case 'beam':
          this.createMelee(state.id, stats, this.player.facingAngle, 0.22, Math.PI * 2.4);
          break;
        case 'sideSlash':
          this.fireSideSlash(state.id, stats);
          break;
        default:
          break;
      }
      this.abilities.trigger(state.id, Math.max(0.06, stats.cooldown));
    }
  }

  private firePlayerProjectiles(id: AbilityId, stats: WeaponStats, target: EnemyRuntime, spread: boolean): void {
    const baseAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const count = Math.max(1, stats.count);
    const spreadWidth = spread ? Math.min(0.42, 0.08 * Math.max(1, count - 1)) : 0.18;
    for (let index = 0; index < count; index += 1) {
      const offset = count === 1 ? 0 : (index / (count - 1) - 0.5) * spreadWidth;
      const angle = baseAngle + offset + this.rng.between(-0.025, 0.025);
      const textureKey = id === 'dagger' ? 'weapon-dagger' : id === 'shuriken' ? 'weapon-shuriken' : 'weapon-machine-gun';
      this.spawnProjectile({
        owner: 'player', textureKey, sourceAbility: id,
        x: this.player.x, y: this.player.y,
        vx: Math.cos(angle) * stats.projectileSpeed, vy: Math.sin(angle) * stats.projectileSpeed,
        damage: stats.damage, radius: stats.radius, ttl: Math.max(0.25, stats.duration),
        pierce: stats.pierce, knockback: stats.knockback, rotationSpeed: id === 'shuriken' ? 12 : 0,
        expiry: 'none', explosionRadius: 0, zoneDuration: 0, fragments: 0,
        directCollision: true, boomerang: false,
      });
    }
    this.tone(id === 'machineGun' ? 160 : 320, 0.025);
  }

  private fireGrenade(id: AbilityId, stats: WeaponStats, target: EnemyRuntime): void {
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const direction = normalize(dx, dy);
    const travelTime = id === 'bazooka' ? Math.max(0.4, stats.duration) : 0.72;
    this.spawnProjectile({
      owner: 'player', textureKey: id === 'bazooka' ? 'weapon-bazooka' : 'weapon-grenade', sourceAbility: id,
      x: this.player.x, y: this.player.y,
      vx: direction.x * stats.projectileSpeed, vy: direction.y * stats.projectileSpeed,
      damage: stats.damage, radius: 10, ttl: travelTime, pierce: 1, knockback: stats.knockback,
      rotationSpeed: 7, expiry: 'explosion', explosionRadius: stats.radius, zoneDuration: 0,
      fragments: id === 'grenade' ? 6 : 0, directCollision: id === 'bazooka', boomerang: false,
    });
  }

  private fireMolotov(stats: WeaponStats, target: EnemyRuntime): void {
    const direction = normalize(target.x - this.player.x, target.y - this.player.y);
    this.spawnProjectile({
      owner: 'player', textureKey: 'weapon-molotov', sourceAbility: 'molotov',
      x: this.player.x, y: this.player.y,
      vx: direction.x * stats.projectileSpeed, vy: direction.y * stats.projectileSpeed,
      damage: stats.damage, radius: 9, ttl: 0.78, pierce: 1, knockback: stats.knockback,
      rotationSpeed: 4, expiry: 'fire', explosionRadius: stats.radius, zoneDuration: stats.duration,
      fragments: 0, directCollision: false, boomerang: false,
    });
  }

  private fireSideSlash(id: AbilityId, stats: WeaponStats): void {
    if (id !== 'sword' && id !== 'machete') return;
    const pattern = resolveSideSlashPattern(id, this.player.facingAngle, this.macheteSide);
    this.macheteSide = pattern.nextSide;
    const arcHalfAngle = id === 'sword' ? Math.PI * 0.34 : Math.PI * 0.45;
    for (const angle of pattern.angles) {
      this.createMelee(id, stats, angle, arcHalfAngle, pattern.angularVelocity);
    }
  }

  private createMelee(id: AbilityId, stats: WeaponStats, angle: number, arcHalfAngle: number, angularVelocity: number): void {
    const textureKey = id === 'bat' ? 'weapon-bat' : id === 'lightsaber' ? 'weapon-lightsaber' : id === 'machete' ? 'weapon-machete' : 'weapon-sword';
    const visual = this.acquireSprite(textureKey)
      .setPosition(this.player.x, this.player.y)
      .setOrigin(0.12, 0.5)
      .setRotation(angle)
      .setDepth(110)
      .setAlpha(0.9);
    const scale = id === 'lightsaber' ? 3.8 : id === 'machete' ? 3.1 : 2.8;
    visual.setScale(scale);
    this.meleeEffects.push({
      id: this.nextId(), active: true, visual, textureKey, sourceAbility: id,
      angle, angularVelocity, arcHalfAngle, radius: stats.radius, damage: stats.damage,
      knockback: stats.knockback, ttl: Math.max(0.12, stats.duration), totalTtl: Math.max(0.12, stats.duration), hitIds: new Set(),
    });
    this.tone(id === 'lightsaber' ? 520 : 210, 0.05);
  }

  private updateMelee(delta: number): void {
    for (const effect of this.meleeEffects) {
      if (!effect.active) continue;
      effect.ttl -= delta;
      effect.angle += effect.angularVelocity * delta;
      effect.visual.setPosition(this.player.x, this.player.y).setRotation(effect.angle);
      effect.visual.setAlpha(clamp(effect.ttl / effect.totalTtl, 0, 1));

      const candidates = this.enemyGrid.queryCircle(this.player.x, this.player.y, effect.radius + 50);
      for (const enemy of candidates) {
        if (!enemy.active || effect.hitIds.has(enemy.id)) continue;
        const angleToEnemy = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
        const deltaAngle = Math.atan2(Math.sin(angleToEnemy - effect.angle), Math.cos(angleToEnemy - effect.angle));
        if (Math.abs(deltaAngle) <= effect.arcHalfAngle || effect.sourceAbility === 'lightsaber') {
          effect.hitIds.add(enemy.id);
          this.damageEnemy(enemy, effect.damage, effect.knockback, this.player.x, this.player.y, true);
        }
      }
      if (effect.ttl <= 0) {
        effect.active = false;
        this.releaseSprite(effect.textureKey, effect.visual);
      }
    }
  }

  private updateOrbiters(_delta: number): void {
    const activeOrbitAbilities = new Set<AbilityId>();

    for (const state of this.abilities.owned()) {
      const definition = getAbility(state.id);
      if (definition.category !== 'active' || definition.behavior !== 'orbit') continue;
      activeOrbitAbilities.add(state.id);

      const stats = this.effectiveAbilityStats(state.id);
      const orbiters = this.syncOrbiters(state.id, Math.max(1, stats.count));
      const fireOrb = state.id === 'fireOrb';

      for (let index = 0; index < orbiters.length; index += 1) {
        const orbiter = orbiters[index];
        if (!orbiter) continue;
        const angle = this.elapsedSeconds * stats.projectileSpeed
          + (index / orbiters.length) * Math.PI * 2;
        const x = this.player.x + Math.cos(angle) * stats.radius;
        const y = this.player.y + Math.sin(angle) * stats.radius;

        if (fireOrb) {
          const pulse = 0.96 + Math.sin(this.elapsedSeconds * 8 + index) * 0.08;
          orbiter.visual
            .setPosition(x, y)
            .setRotation(-angle * 1.6)
            .setScale(1.05 * pulse);
          orbiter.glow
            ?.setPosition(x, y)
            .setScale(0.9 + Math.sin(this.elapsedSeconds * 6 + index) * 0.08)
            .setAlpha(0.18 + Math.sin(this.elapsedSeconds * 7 + index) * 0.035);

          for (let echoIndex = 0; echoIndex < orbiter.echoes.length; echoIndex += 1) {
            const echo = orbiter.echoes[echoIndex];
            if (!echo) continue;
            const lagAngle = angle - (echoIndex + 1) * 0.15;
            echo
              .setPosition(
                this.player.x + Math.cos(lagAngle) * stats.radius,
                this.player.y + Math.sin(lagAngle) * stats.radius,
              )
              .setRotation(-lagAngle * 1.6)
              .setAlpha(0.22 - echoIndex * 0.055);
          }
        } else {
          orbiter.visual.setPosition(x, y).setRotation(angle + Math.PI * 0.5);
        }

        const candidates = this.enemyGrid.queryCircle(x, y, fireOrb ? 32 : 36);
        for (const enemy of candidates) {
          const lastHit = orbiter.lastHitAt.get(enemy.id) ?? -999;
          const hitInterval = fireOrb ? 0.34 : 0.42;
          if (!enemy.active || this.elapsedSeconds - lastHit < hitInterval) continue;
          orbiter.lastHitAt.set(enemy.id, this.elapsedSeconds);
          this.damageEnemy(enemy, stats.damage, stats.knockback, this.player.x, this.player.y, true);
          if (fireOrb && enemy.active) {
            this.igniteEnemy(enemy, stats.damage * 0.22, Math.max(0.8, stats.duration));
          }
        }

        if (orbiter.lastHitAt.size > 160) {
          for (const [enemyId, hitAt] of orbiter.lastHitAt) {
            if (this.elapsedSeconds - hitAt > 6) orbiter.lastHitAt.delete(enemyId);
          }
        }
      }
    }

    for (const abilityId of [...this.orbiters.keys()]) {
      if (!activeOrbitAbilities.has(abilityId)) this.clearOrbiters(abilityId);
    }
  }

  private syncOrbiters(abilityId: AbilityId, desiredCount: number): OrbiterRuntime[] {
    let orbiters = this.orbiters.get(abilityId);
    if (!orbiters) {
      orbiters = [];
      this.orbiters.set(abilityId, orbiters);
    }

    while (orbiters.length < desiredCount) {
      orbiters.push(this.createOrbiter(abilityId));
    }
    while (orbiters.length > desiredCount) {
      const orbiter = orbiters.pop();
      if (orbiter) this.releaseOrbiter(orbiter);
    }
    return orbiters;
  }

  private createOrbiter(abilityId: AbilityId): OrbiterRuntime {
    const fireOrb = abilityId === 'fireOrb';
    const textureKey = fireOrb ? 'weapon-fire-orb' : 'weapon-sword';
    const visual = this.acquireSprite(textureKey)
      .setScale(fireOrb ? 1.05 : 1.8)
      .setDepth(fireOrb ? 107 : 105);
    const echoes = fireOrb
      ? Array.from({ length: 3 }, (_value, echoIndex) => this.acquireSprite(textureKey)
        .setScale(0.92 - echoIndex * 0.12)
        .setAlpha(0.22 - echoIndex * 0.055)
        .setDepth(103 + echoIndex)
        .setBlendMode(Phaser.BlendModes.ADD))
      : [];
    const glow = fireOrb
      ? this.add.circle(0, 0, 18, 0xff6b2d, 0.18)
        .setStrokeStyle(1, 0xffd94a, 0.32)
        .setDepth(102)
        .setBlendMode(Phaser.BlendModes.ADD)
      : null;

    if (fireOrb) visual.setBlendMode(Phaser.BlendModes.ADD);
    return { visual, echoes, glow, textureKey, lastHitAt: new Map() };
  }

  private releaseOrbiter(orbiter: OrbiterRuntime): void {
    this.releaseSprite(orbiter.textureKey, orbiter.visual);
    for (const echo of orbiter.echoes) this.releaseSprite(orbiter.textureKey, echo);
    orbiter.glow?.destroy();
  }

  private clearOrbiters(abilityId?: AbilityId): void {
    const abilityIds = abilityId ? [abilityId] : [...this.orbiters.keys()];
    for (const id of abilityIds) {
      const orbiters = this.orbiters.get(id);
      if (!orbiters) continue;
      while (orbiters.length > 0) {
        const orbiter = orbiters.pop();
        if (orbiter) this.releaseOrbiter(orbiter);
      }
      this.orbiters.delete(id);
    }
  }

  private spawnProjectile(values: Omit<ProjectileRuntime, 'id' | 'active' | 'sprite' | 'totalTtl' | 'hitIds' | 'reversed'>): void {
    const sprite = this.acquireSprite(values.textureKey)
      .setPosition(values.x, values.y)
      .setDepth(values.owner === 'player' ? 90 : 80)
      .setScale(values.owner === 'player' ? 1.8 : 1.65);
    if (values.rotationSpeed === 0) sprite.setRotation(Math.atan2(values.vy, values.vx));
    this.projectiles.push({
      ...values,
      id: this.nextId(),
      active: true,
      sprite,
      totalTtl: values.ttl,
      reversed: false,
      hitIds: new Set(),
    });
  }

  private updateProjectiles(delta: number): void {
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      projectile.ttl -= delta;
      if (projectile.boomerang && !projectile.reversed && projectile.ttl <= projectile.totalTtl * 0.48) {
        projectile.reversed = true;
        projectile.vx *= -1;
        projectile.vy *= -1;
      }
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
      projectile.sprite.setPosition(projectile.x, projectile.y);
      if (projectile.rotationSpeed !== 0) projectile.sprite.rotation += projectile.rotationSpeed * delta;

      if (projectile.owner === 'player' && projectile.directCollision) this.collidePlayerProjectile(projectile);
      if (projectile.owner === 'enemy' && projectile.directCollision) this.collideEnemyProjectile(projectile);

      if (!projectile.active) continue;
      if (projectile.ttl <= 0 || distanceSquared(projectile, this.player) > 4_000_000) this.expireProjectile(projectile);
    }
  }

  private collidePlayerProjectile(projectile: ProjectileRuntime): void {
    const candidates = this.enemyGrid.queryCircle(projectile.x, projectile.y, projectile.radius + 34);
    for (const enemy of candidates) {
      if (!enemy.active || projectile.hitIds.has(enemy.id)) continue;
      if (!circleOverlap(projectile, projectile.radius, enemy, enemy.radius)) continue;
      projectile.hitIds.add(enemy.id);
      this.damageEnemy(enemy, projectile.damage, projectile.knockback, projectile.x - projectile.vx, projectile.y - projectile.vy, true);
      if (projectile.sourceAbility === 'dagger') {
        enemy.bleedDamage = Math.max(enemy.bleedDamage, 5 * this.abilities.globalModifiers().damage);
        enemy.bleedTimer = Math.max(enemy.bleedTimer, 3);
      }
      projectile.pierce -= 1;
      if (projectile.expiry === 'explosion') {
        this.expireProjectile(projectile);
        return;
      }
      if (projectile.pierce <= 0) {
        this.deactivateProjectile(projectile);
        return;
      }
    }
  }

  private collideEnemyProjectile(projectile: ProjectileRuntime): void {
    if (!circleOverlap(projectile, projectile.radius, this.player, PLAYER_RADIUS)) return;
    this.damagePlayer(projectile.damage);
    projectile.pierce -= 1;
    if (projectile.pierce <= 0) this.deactivateProjectile(projectile);
  }

  private expireProjectile(projectile: ProjectileRuntime): void {
    if (!projectile.active) return;
    if (projectile.expiry === 'explosion') {
      this.createExplosion(projectile.x, projectile.y, projectile.explosionRadius, projectile.damage, projectile.knockback, projectile.owner);
      if (projectile.owner === 'player' && projectile.fragments > 0) this.spawnFragments(projectile);
    } else if (projectile.expiry === 'fire') {
      this.createZone('fire', 'player', projectile.x, projectile.y, projectile.explosionRadius, projectile.damage, projectile.knockback, projectile.zoneDuration);
    } else if (projectile.expiry === 'gravity') {
      this.createZone('gravity', 'enemy', projectile.x, projectile.y, projectile.explosionRadius, projectile.damage, 0, projectile.zoneDuration);
    }
    this.deactivateProjectile(projectile);
  }

  private spawnFragments(projectile: ProjectileRuntime): void {
    for (let index = 0; index < projectile.fragments; index += 1) {
      const angle = (index / projectile.fragments) * Math.PI * 2 + this.rng.between(-0.08, 0.08);
      this.spawnProjectile({
        owner: 'player', textureKey: 'weapon-shuriken', sourceAbility: 'grenade',
        x: projectile.x, y: projectile.y, vx: Math.cos(angle) * 275, vy: Math.sin(angle) * 275,
        damage: projectile.damage * 0.42, radius: 6, ttl: 0.62, pierce: 1, knockback: projectile.knockback * 0.5,
        rotationSpeed: 14, expiry: 'none', explosionRadius: 0, zoneDuration: 0, fragments: 0,
        directCollision: true, boomerang: false,
      });
    }
  }

  private createExplosion(x: number, y: number, radius: number, damage: number, knockback: number, owner: ProjectileOwner): void {
    const color = owner === 'player' ? 0xffb347 : 0xb56cff;
    const visual = this.add.circle(x, y, Math.max(8, radius), color, 0.4).setDepth(95).setScale(0.2);
    this.tweens.add({ targets: visual, scale: 1, alpha: 0, duration: 260, onComplete: () => visual.destroy() });
    if (owner === 'player') {
      const candidates = this.enemyGrid.queryCircle(x, y, radius + 50);
      for (const enemy of candidates) {
        if (enemy.active && circleOverlap({ x, y }, radius, enemy, enemy.radius)) {
          this.damageEnemy(enemy, damage, knockback, x, y, true);
        }
      }
      if (this.options.preferences.screenShake) this.cameras.main.shake(90, 0.0022);
      this.tone(95, 0.08);
    } else if (circleOverlap({ x, y }, radius, this.player, PLAYER_RADIUS)) {
      this.damagePlayer(damage);
    }
  }

  private createZone(
    kind: ZoneKind,
    owner: ProjectileOwner,
    x: number,
    y: number,
    radius: number,
    damage: number,
    knockback: number,
    duration: number,
  ): void {
    const color = kind === 'fire' ? 0xff5d2e : 0x9b5de5;
    const visual = this.add.circle(x, y, radius, color, kind === 'fire' ? 0.28 : 0.2)
      .setStrokeStyle(2, color, 0.75)
      .setDepth(45);
    this.zones.push({
      id: this.nextId(), active: true, kind, owner, visual, x, y, radius,
      damage, knockback, ttl: Math.max(0.2, duration), tickTimer: 0, tickInterval: kind === 'fire' ? 0.34 : 0.62,
    });
  }

  private updateZones(delta: number): void {
    for (const zone of this.zones) {
      if (!zone.active) continue;
      zone.ttl -= delta;
      zone.tickTimer -= delta;
      const pulse = 0.96 + Math.sin(this.elapsedSeconds * 7 + zone.id) * 0.04;
      zone.visual.setScale(pulse).setAlpha(clamp(zone.ttl / 0.7, 0.12, 0.38));
      if (zone.kind === 'gravity') {
        const dx = zone.x - this.player.x;
        const dy = zone.y - this.player.y;
        const distance = Math.hypot(dx, dy);
        if (distance < zone.radius * 1.45 && distance > 1) {
          const pull = (1 - clamp(distance / (zone.radius * 1.45), 0, 1)) * 145;
          this.player.x += (dx / distance) * pull * delta;
          this.player.y += (dy / distance) * pull * delta;
        }
      }
      if (zone.tickTimer <= 0) {
        zone.tickTimer = zone.tickInterval;
        if (zone.owner === 'player') {
          const candidates = this.enemyGrid.queryCircle(zone.x, zone.y, zone.radius + 38);
          for (const enemy of candidates) {
            if (enemy.active && circleOverlap(zone, zone.radius, enemy, enemy.radius)) {
              this.damageEnemy(enemy, zone.damage, zone.knockback, zone.x, zone.y, true);
            }
          }
        } else if (circleOverlap(zone, zone.radius, this.player, PLAYER_RADIUS)) {
          this.damagePlayer(zone.damage);
        }
      }
      if (zone.ttl <= 0) {
        zone.active = false;
        zone.visual.destroy();
      }
    }
  }

  private spawnPickup(kind: PickupKind, x: number, y: number, value: number): void {
    let textureKey = 'pickup-gems';
    let scale = 2.1;
    if (kind === 'coin') { textureKey = value >= 10 ? 'pickup-coin-10' : 'pickup-coin'; scale = 1.7; }
    if (kind === 'health') { textureKey = 'pickup-potion'; scale = assetDisplayScale('pickup-potion'); }
    if (kind === 'magnet') { textureKey = 'pickup-magnet'; scale = 1.7; }
    if (kind === 'bomb') { textureKey = 'weapon-bomb'; scale = 1.7; }
    if (kind === 'chest') { textureKey = 'pickup-coin-10'; scale = 2.3; }
    const sprite = this.acquireSprite(textureKey).setPosition(x, y).setScale(scale).setDepth(50);
    if (kind === 'gem') sprite.setFrame(value >= 10 ? 6 : value >= 3 ? 3 : 0);
    if (kind === 'chest') sprite.setTint(0xffd166);
    this.pickups.push({
      id: this.nextId(), active: true, sprite, textureKey, kind, x, y, value, attracted: false, age: 0,
    });
  }

  private updatePickups(delta: number): void {
    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      pickup.age += delta;
      const dx = this.player.x - pickup.x;
      const dy = this.player.y - pickup.y;
      const distance = Math.hypot(dx, dy);
      if (this.magnetTimer > 0 || distance <= this.player.pickupRadius) pickup.attracted = true;
      if (pickup.attracted && distance > 0.1) {
        const speed = 250 + Math.min(520, pickup.age * 40 + 480 / Math.max(1, distance * 0.04));
        pickup.x += (dx / distance) * speed * delta;
        pickup.y += (dy / distance) * speed * delta;
        pickup.sprite.setPosition(pickup.x, pickup.y);
      } else {
        pickup.sprite.y = pickup.y + Math.sin(this.elapsedSeconds * 4 + pickup.id) * 2;
      }
      if (distance <= PLAYER_RADIUS + 12) this.collectPickup(pickup);
      else if (distance > 2600 && pickup.age > 20) this.deactivatePickup(pickup);
    }
  }

  private collectPickup(pickup: PickupRuntime): void {
    if (!pickup.active) return;
    switch (pickup.kind) {
      case 'gem':
        this.gainExperience(pickup.value);
        this.tone(460, 0.025);
        break;
      case 'coin':
        this.coins += pickup.value;
        this.tone(720, 0.035);
        break;
      case 'health':
        this.healPlayer(Math.max(10, pickup.value));
        break;
      case 'magnet':
        this.magnetTimer = Math.max(this.magnetTimer, 5);
        for (const other of this.pickups) other.attracted = true;
        gameEvents.emit('toast', t(this.options.preferences.locale, 'magnetActivated'));
        break;
      case 'bomb':
        for (const enemy of this.enemies) {
          if (enemy.active && !enemy.definition.boss) this.damageEnemy(enemy, 9999, 0, this.player.x, this.player.y, false);
        }
        if (this.options.preferences.screenShake) this.cameras.main.shake(280, 0.008);
        break;
      case 'chest':
        this.coins += 10;
        this.openChest();
        break;
      default:
        break;
    }
    this.deactivatePickup(pickup);
    this.emitHud(true);
  }

  private openChest(): void {
    const choice = this.abilities.buildChoices(1)[0];
    if (choice) {
      const state = this.abilities.grant(choice.id);
      gameEvents.emit('toast', `CHEST · ${choice.name[this.options.preferences.locale]} Lv.${state.level}`);
      this.tone(880, 0.12);
    }
  }

  private gainExperience(amount: number): void {
    const progress = applyExperience(this.level, this.xp, amount);
    this.level = progress.level;
    this.xp = progress.currentXp;
    this.xpRequired = progress.requiredXp;
    if (progress.levelsGained > 0) {
      this.pendingLevelUps += progress.levelsGained;
      if (!this.levelUpOpen) this.openLevelUp();
    }
    this.emitHud(true);
  }

  private openLevelUp(): boolean {
    const choices = this.abilities.buildChoices(3);
    if (choices.length === 0) {
      this.pendingLevelUps = 0;
      this.levelUpOpen = false;
      this.applyPausedState(false);
      return false;
    }
    this.levelUpOpen = true;
    this.applyPausedState(true);
    const views: AbilityChoiceView[] = choices.map((ability) => {
      const current = this.abilities.get(ability.id)?.level ?? 0;
      return {
        id: ability.id,
        level: current,
        nextLevel: current + 1,
        maxLevel: ability.maxLevel,
        name: ability.name[this.options.preferences.locale],
        description: ability.description[this.options.preferences.locale],
        iconKey: ability.iconKey,
        iconUrl: iconUrl(ability.iconKey),
        category: ability.category,
      };
    });
    // Level-up owns its own Vue overlay. Emitting a generic pause event here
    // would overwrite the level-up screen with the manual pause dialog.
    gameEvents.emit('levelUp', views);
    return true;
  }

  private damageEnemy(
    enemy: EnemyRuntime,
    amount: number,
    knockback: number,
    sourceX: number,
    sourceY: number,
    allowLifesteal: boolean,
  ): void {
    if (!enemy.active || amount <= 0) return;
    const resolution = resolveDamage(enemy.hp, amount);
    enemy.hp = resolution.remainingHp;
    this.damageDealt += resolution.appliedDamage;
    enemy.flashTimer = 0.08;
    enemy.sprite.setTint(0xffffff);
    if (knockback > 0) {
      const direction = normalize(enemy.x - sourceX, enemy.y - sourceY);
      enemy.knockbackX += direction.x * knockback * 58;
      enemy.knockbackY += direction.y * knockback * 58;
    }
    if (this.options.preferences.damageNumbers) {
      this.showDamageNumber(enemy.x, enemy.y - enemy.radius, resolution.appliedDamage, 0xffe0b0);
    }
    if (allowLifesteal) this.tryLifesteal();
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private tryLifesteal(): void {
    const state = this.abilities.get('lifesteal');
    if (!state) return;
    const stats = this.abilities.effectiveStats('lifesteal');
    if (this.rng.chance(stats.lifestealChance)) this.healPlayer(stats.recovery);
  }

  private killEnemy(enemy: EnemyRuntime): void {
    if (!enemy.active) return;
    const x = enemy.x;
    const y = enemy.y;
    const definition = enemy.definition;
    this.kills += 1;

    if (definition.id === 'finalBoss') {
      this.coins += FINAL_BOSS_COIN_REWARD;
      this.deactivateEnemy(enemy, false);
      gameEvents.emit(
        'toast',
        `${t(this.options.preferences.locale, 'finalBossReward')} · ◆ ${FINAL_BOSS_COIN_REWARD}`,
      );
      this.finishRun(true);
      return;
    }
    if (definition.id === 'miniBoss') {
      this.spawnPickup('chest', x, y, 1);
      this.spawnPickup('coin', x + 22, y, 10);
    } else {
      this.spawnPickup('gem', x, y, definition.xp);
      if (this.rng.chance(definition.coinChance * this.player.luck)) this.spawnPickup('coin', x + this.rng.between(-12, 12), y, 1);
      const specialRoll = this.rng.next();
      if (specialRoll < 0.0018) this.spawnPickup('bomb', x, y, 1);
      else if (specialRoll < 0.0045) this.spawnPickup('magnet', x, y, 1);
      else if (specialRoll < 0.008) this.spawnPickup('health', x, y, 20);
    }
    this.deactivateEnemy(enemy, false);
    this.tone(definition.boss ? 72 : 105, definition.boss ? 0.12 : 0.025);
  }

  private deactivateEnemy(enemy: EnemyRuntime, countAsKill: boolean): void {
    if (!enemy.active) return;
    enemy.active = false;
    if (countAsKill) this.kills += 1;
    this.releaseSprite(enemy.textureKey, enemy.sprite);
  }

  private damagePlayer(rawDamage: number): void {
    if (this.player.invulnerability > 0 || this.ended || rawDamage <= 0) return;
    const armor = this.player.armor + this.abilities.globalModifiers().armor;
    const damage = rawDamage >= 1 ? Math.max(1, rawDamage - armor) : Math.max(0, rawDamage - armor);
    this.player.hp = Math.max(0, this.player.hp - damage);
    this.player.invulnerability = 0.48;
    this.player.sprite.setTint(0xff5d73);
    if (this.options.preferences.screenShake) this.cameras.main.shake(95, 0.0035);
    if (this.options.preferences.damageNumbers) this.showDamageNumber(this.player.x, this.player.y - 35, damage, 0xff667a);
    this.tone(82, 0.055);
    if (this.player.hp <= 0) this.finishRun(false);
    this.emitHud(true);
  }

  private healPlayer(amount: number): void {
    if (amount <= 0 || this.player.hp >= this.player.maxHp) return;
    const previous = this.player.hp;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
    const healed = this.player.hp - previous;
    if (healed > 0 && this.options.preferences.damageNumbers) {
      this.showDamageNumber(this.player.x, this.player.y - 35, healed, 0x74f0a7, '+');
    }
  }

  private nearestEnemy(radius: number): EnemyRuntime | null {
    const candidates = this.enemyGrid.queryCircle(this.player.x, this.player.y, radius);
    let nearest: EnemyRuntime | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const enemy of candidates) {
      if (!enemy.active) continue;
      const distance = distanceSquared(enemy, this.player);
      if (distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private showDamageNumber(x: number, y: number, amount: number, color: number, prefix = ''): void {
    const text = this.add.text(x, y, `${prefix}${Math.max(1, Math.round(amount))}`, {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '15px',
      fontStyle: '700',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#080b14',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets: text,
      y: y - 34,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.Out',
      onComplete: () => text.destroy(),
    });
  }

  private emitHud(force: boolean): void {
    if (!force && this.hudTimer > 0) return;
    this.hudTimer = HUD_INTERVAL;
    const finalBoss = this.enemies.find((enemy) => (
      enemy.active && enemy.definition.id === 'finalBoss'
    )) ?? null;
    const miniBoss = this.enemies.find((enemy) => (
      enemy.active && enemy.definition.id === 'miniBoss'
    )) ?? null;
    const boss = finalBoss ?? miniBoss;
    const bossId = boss?.definition.id === 'finalBoss'
      ? 'finalBoss'
      : boss?.definition.id === 'miniBoss'
        ? 'miniBoss'
        : null;
    const bossOffscreen = boss ? !this.isInsideBossSafeView(boss) : false;
    const snapshot: HudSnapshot = {
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      xp: this.xp,
      xpRequired: this.xpRequired,
      level: this.level,
      elapsedSeconds: this.elapsedSeconds,
      remainingSeconds: Math.max(0, this.durationSeconds - this.elapsedSeconds),
      kills: this.kills,
      coins: this.coins,
      bossId,
      bossHp: boss?.hp ?? null,
      bossMaxHp: boss?.maxHp ?? null,
      bossOffscreen,
      bossDirectionRadians: boss && bossOffscreen
        ? Math.atan2(boss.y - this.player.y, boss.x - this.player.x)
        : null,
      abilities: this.abilities.owned().map((state) => ({
        id: state.id,
        level: state.level,
        iconUrl: iconUrl(getAbility(state.id).iconKey),
      })),
    };
    gameEvents.emit('hud', snapshot);
  }

  private finishRun(victory: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.levelUpOpen = false;
    this.applyPausedState(true, false);
    const id = globalThis.crypto?.randomUUID?.() ?? `run-${Date.now()}-${Math.floor(this.rng.next() * 1_000_000)}`;
    const summary: RunSummary = {
      id,
      characterId: this.player.characterId,
      victory,
      elapsedSeconds: this.elapsedSeconds,
      kills: this.kills,
      level: this.level,
      coins: this.coins,
      damageDealt: this.damageDealt,
      endedAt: new Date().toISOString(),
    };
    gameEvents.emit('runEnded', summary);
    this.tone(victory ? 760 : 64, 0.22);
  }

  private acquireSprite(textureKey: string): Phaser.GameObjects.Sprite {
    let pool = this.spritePools.get(textureKey);
    if (!pool) {
      pool = new ObjectPool<Phaser.GameObjects.Sprite>({
        create: () => this.add.sprite(0, 0, textureKey).setVisible(false).setActive(false),
        activate: (sprite) => {
          sprite
            .setActive(true)
            .setVisible(true)
            .setAlpha(1)
            .setScale(1)
            .setRotation(0)
            .setFlip(false, false)
            .setBlendMode(Phaser.BlendModes.NORMAL)
            .clearTint();
        },
        deactivate: (sprite) => {
          sprite.anims.stop();
          sprite
            .setActive(false)
            .setVisible(false)
            .setPosition(-10000, -10000)
            .setAlpha(1)
            .setRotation(0)
            .setScale(1)
            .setBlendMode(Phaser.BlendModes.NORMAL)
            .clearTint();
        },
        destroy: (sprite) => sprite.destroy(),
      });
      this.spritePools.set(textureKey, pool);
    }
    const sprite = pool.acquire();
    sprite.setTexture(textureKey).setFrame(0);
    return sprite;
  }

  private releaseSprite(textureKey: string, sprite: Phaser.GameObjects.Sprite): void {
    this.spritePools.get(textureKey)?.release(sprite);
  }

  private deactivateProjectile(projectile: ProjectileRuntime): void {
    if (!projectile.active) return;
    projectile.active = false;
    this.releaseSprite(projectile.textureKey, projectile.sprite);
  }

  private deactivatePickup(pickup: PickupRuntime): void {
    if (!pickup.active) return;
    pickup.active = false;
    this.releaseSprite(pickup.textureKey, pickup.sprite);
  }

  private compactEntities(): void {
    this.compact(this.enemies);
    this.compact(this.projectiles);
    this.compact(this.pickups);
    this.compact(this.zones);
    this.compact(this.meleeEffects);
  }

  private compact<T extends { active: boolean }>(items: T[]): void {
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < items.length; readIndex += 1) {
      const item = items[readIndex];
      if (!item?.active) continue;
      items[writeIndex] = item;
      writeIndex += 1;
    }
    items.length = writeIndex;
  }

  private nextId(): number {
    const id = this.nextEntityId;
    this.nextEntityId += 1;
    return id;
  }

  private approach(value: number, target: number, amount: number): number {
    if (value < target) return Math.min(target, value + amount);
    return Math.max(target, value - amount);
  }

  private applyPausedState(paused: boolean, pauseRawAudio = true): void {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) {
      this.touchX = 0;
      this.touchY = 0;
      this.player.vx = 0;
      this.player.vy = 0;
    }
    syncPresentationPause(paused, [
      {
        pause: () => { this.anims.pauseAll(); },
        resume: () => { this.anims.resumeAll(); },
      },
      {
        pause: () => { this.tweens.pauseAll(); },
        resume: () => { this.tweens.resumeAll(); },
      },
      {
        pause: () => { this.sound.pauseAll(); },
        resume: () => { this.sound.resumeAll(); },
      },
    ]);

    this.audioPaused = paused && pauseRawAudio;
    if (paused) this.stopActiveTones();
    this.syncAudioContextState();
  }

  private syncAudioContextState(): void {
    const context = this.audioContext;
    if (!context || context.state === 'closed') return;
    const operation = this.audioPaused ? context.suspend() : context.resume();
    void operation
      .then(() => {
        if (context !== this.audioContext || context.state === 'closed') return;
        if (this.audioPaused && context.state === 'running') void context.suspend().catch(() => undefined);
        if (!this.audioPaused && context.state === 'suspended') void context.resume().catch(() => undefined);
      })
      .catch(() => undefined);
  }

  private stopActiveTones(): void {
    for (const [oscillator, gain] of this.activeTones) {
      try {
        oscillator.stop();
      } catch {
        // The tone may already have reached its scheduled stop time.
      }
      oscillator.disconnect();
      gain.disconnect();
    }
    this.activeTones.clear();
  }

  private tone(frequency: number, duration: number): void {
    if (
      !this.options.preferences.soundEnabled
      || this.audioPaused
      || typeof AudioContext === 'undefined'
    ) return;
    try {
      this.audioContext ??= new AudioContext();
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const now = this.audioContext.currentTime;
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.022, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(this.audioContext.destination);
      this.activeTones.set(oscillator, gain);
      oscillator.addEventListener('ended', () => {
        if (!this.activeTones.has(oscillator)) return;
        this.activeTones.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      }, { once: true });
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch {
      // Audio is an optional enhancement. Gameplay continues when autoplay policy blocks it.
    }
  }

  private handleShutdown(): void {
    detachActiveScene(this);
    this.clearOrbiters();
    for (const zone of this.zones) if (zone.active) zone.visual.destroy();
    for (const pool of this.spritePools.values()) pool.destroy();
    this.spritePools.clear();
    this.stopActiveTones();
    if (this.audioContext) void this.audioContext.close();
    this.audioContext = null;
  }
}
