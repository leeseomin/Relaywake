import { z } from 'zod';
import {
  AbilityDefinitionSchema,
  type AbilityDefinition,
  type AbilityId,
  type StatKey,
  type WeaponStats,
} from './schemas';

const zeroStats = (): WeaponStats => ({
  damage: 0,
  cooldown: 0,
  projectileSpeed: 0,
  count: 0,
  radius: 0,
  duration: 0,
  knockback: 0,
  pierce: 0,
  recovery: 0,
  lifestealChance: 0,
  armor: 0,
  moveSpeed: 0,
});

const make = (
  value: Omit<AbilityDefinition, 'stats'> & { stats?: Partial<WeaponStats> },
): AbilityDefinition => ({
  ...value,
  stats: { ...zeroStats(), ...value.stats },
});

export const abilities = z.array(AbilityDefinitionSchema).parse([
  make({
    id: 'machineGun',
    name: { ko: 'AK-47', en: 'AK-47', ja: 'AK-47', 'zh-Hans': 'AK-47', es: 'AK-47', fr: 'AK-47' },
    description: {
      ko: '가장 가까운 적을 향해 탄환 묶음을 연사합니다.',
      en: 'Fires a rapid burst at the nearest enemy.',
      ja: '最も近い敵に向けて弾丸を高速連射します。',
      'zh-Hans': '向最近的敌人快速连射一组子弹。',
      es: 'Dispara una ráfaga rápida al enemigo más cercano.',
      fr: 'Tire une rafale rapide sur l’ennemi le plus proche.',
    },
    iconKey: 'weapon-machine-gun', category: 'active', behavior: 'spreadProjectile', maxLevel: 5,
    stats: { damage: 5, cooldown: 2, projectileSpeed: 430, count: 4, radius: 7, duration: 1.4, knockback: 0.15, pierce: 1 },
    bonuses: [
      { stat: 'damage', values: [1, 1, 1, 1] },
      { stat: 'count', values: [1, 1, 2, 2] },
      { stat: 'cooldown', values: [-0.12, -0.12, -0.12, -0.16] },
    ],
  }),
  make({
    id: 'shuriken',
    name: { ko: '수리검', en: 'Shuriken', ja: '手裏剣', 'zh-Hans': '手里剑', es: 'Shuriken', fr: 'Shuriken' },
    description: {
      ko: '빠른 수리검을 여러 방향으로 던집니다.',
      en: 'Throws fast shuriken toward nearby threats.',
      ja: '近くの脅威に向けて高速の手裏剣を投げます。',
      'zh-Hans': '向附近的威胁投掷高速手里剑。',
      es: 'Lanza shuriken rápidos hacia las amenazas cercanas.',
      fr: 'Lance rapidement des shuriken vers les menaces proches.',
    },
    iconKey: 'weapon-shuriken', category: 'active', behavior: 'projectile', maxLevel: 5,
    stats: { damage: 5, cooldown: 0.5, projectileSpeed: 350, count: 2, radius: 8, duration: 1.8, knockback: 0.1, pierce: 1 },
    bonuses: [
      { stat: 'damage', values: [1, 1, 1.5, 2] },
      { stat: 'projectileSpeed', values: [25, 25, 35, 45] },
      { stat: 'count', values: [0, 1, 0, 1] },
    ],
  }),
  make({
    id: 'bat',
    name: { ko: '야구 방망이', en: 'Bat', ja: 'バット', 'zh-Hans': '球棒', es: 'Bate', fr: 'Batte' },
    description: {
      ko: '전방의 넓은 부채꼴을 강하게 휘두릅니다.',
      en: 'Swings through a wide frontal arc.',
      ja: '前方の広い扇状範囲を力強く振り抜きます。',
      'zh-Hans': '向前方大范围扇形区域猛力挥击。',
      es: 'Golpea con fuerza en un amplio arco frontal.',
      fr: 'Frappe puissamment dans un large arc frontal.',
    },
    iconKey: 'weapon-bat', category: 'active', behavior: 'meleeFan', maxLevel: 5,
    stats: { damage: 10, cooldown: 1.5, count: 1, radius: 118, duration: 0.18, knockback: 2 },
    bonuses: [
      { stat: 'damage', values: [2, 2, 3, 4] },
      { stat: 'radius', values: [8, 8, 12, 16] },
      { stat: 'knockback', values: [0.1, 0.1, 0.1, 0.1] },
    ],
  }),
  make({
    id: 'dagger',
    name: { ko: '출혈 단검', en: 'Bleeding Dagger', ja: '出血の短剣', 'zh-Hans': '流血匕首', es: 'Daga sangrante', fr: 'Dague sanglante' },
    description: {
      ko: '적을 관통하고 지속 피해를 남기는 단검입니다.',
      en: 'A piercing dagger that leaves a bleeding wound.',
      ja: '敵を貫通し、出血による継続ダメージを残す短剣です。',
      'zh-Hans': '一把能穿透敌人并留下持续流血伤害的匕首。',
      es: 'Una daga perforante que deja una herida sangrante.',
      fr: 'Une dague perforante qui laisse une blessure hémorragique.',
    },
    iconKey: 'weapon-dagger', category: 'active', behavior: 'projectile', maxLevel: 5,
    stats: { damage: 10, cooldown: 0.5, projectileSpeed: 390, count: 1, radius: 8, duration: 1.6, knockback: 0.3, pierce: 2 },
    bonuses: [
      { stat: 'damage', values: [2, 2, 3, 4] },
      { stat: 'pierce', values: [0, 1, 0, 1] },
      { stat: 'count', values: [0, 0, 1, 0] },
    ],
  }),
  make({
    id: 'axe',
    name: { ko: '회전 도끼', en: 'Orbiting Axe', ja: '回転斧', 'zh-Hans': '环绕斧', es: 'Hacha orbital', fr: 'Hache orbitale' },
    description: {
      ko: '플레이어 주위를 회전하며 접근하는 적을 베어냅니다.',
      en: 'Orbits the player and cuts through nearby enemies.',
      ja: 'プレイヤーの周囲を回転し、近づく敵を切り裂きます。',
      'zh-Hans': '环绕玩家旋转，斩击靠近的敌人。',
      es: 'Orbita alrededor del jugador y corta a los enemigos cercanos.',
      fr: 'Tourne autour du joueur et tranche les ennemis proches.',
    },
    iconKey: 'weapon-sword', category: 'active', behavior: 'orbit', maxLevel: 5,
    stats: { damage: 10, cooldown: 0, projectileSpeed: 2.1, count: 1, radius: 86, duration: 0, knockback: 1, pierce: 99 },
    bonuses: [
      { stat: 'damage', values: [2, 2, 3, 4] },
      { stat: 'count', values: [1, 0, 1, 1] },
      { stat: 'radius', values: [7, 7, 10, 12] },
    ],
  }),
  make({
    id: 'fireOrb',
    name: {
      ko: '회전 화염핵',
      en: 'Orbiting Fire Core',
      ja: '回転火炎核',
      'zh-Hans': '环绕火核',
      es: 'Núcleo de fuego orbital',
      fr: 'Noyau de feu orbital',
    },
    description: {
      ko: '픽셀 화염핵이 주위를 돌며 적을 태우고 지속 화상 피해를 남깁니다.',
      en: 'A pixel fire core orbits you, scorching enemies and leaving a burning wound.',
      ja: 'ピクセル火炎核が周囲を回り、敵を焼いて継続的な火傷ダメージを与えます。',
      'zh-Hans': '像素火核环绕你旋转，灼烧敌人并留下持续燃烧伤害。',
      es: 'Un núcleo de fuego pixelado te orbita, quema a los enemigos y deja una herida ardiente.',
      fr: 'Un noyau de feu pixelisé gravite autour de vous, brûle les ennemis et laisse une blessure ardente.',
    },
    iconKey: 'weapon-fire-orb', category: 'active', behavior: 'orbit', maxLevel: 5,
    stats: { damage: 6, cooldown: 0, projectileSpeed: 2.65, count: 1, radius: 74, duration: 2.4, knockback: 0.25, pierce: 99 },
    bonuses: [
      { stat: 'damage', values: [1, 1.5, 2, 3] },
      { stat: 'count', values: [0, 1, 0, 1] },
      { stat: 'radius', values: [4, 6, 8, 10] },
      { stat: 'duration', values: [0.2, 0.2, 0.4, 0.6] },
    ],
  }),
  make({
    id: 'grenade',
    name: { ko: '파편 수류탄', en: 'Fragment Grenade', ja: '破片手榴弾', 'zh-Hans': '破片手榴弹', es: 'Granada de fragmentación', fr: 'Grenade à fragmentation' },
    description: {
      ko: '적 무리에 투척되어 폭발하고 파편을 흩뿌립니다.',
      en: 'Explodes inside a crowd and scatters fragments.',
      ja: '敵の群れの中で爆発し、破片をまき散らします。',
      'zh-Hans': '在敌群中爆炸并散射破片。',
      es: 'Explota entre una multitud y dispersa fragmentos.',
      fr: 'Explose au milieu d’un groupe et disperse des fragments.',
    },
    iconKey: 'weapon-grenade', category: 'active', behavior: 'grenade', maxLevel: 5,
    stats: { damage: 10, cooldown: 3, projectileSpeed: 260, count: 1, radius: 94, duration: 0.75, knockback: 0.5, pierce: 1 },
    bonuses: [
      { stat: 'damage', values: [3, 3, 4, 5] },
      { stat: 'radius', values: [8, 8, 12, 16] },
      { stat: 'count', values: [0, 1, 0, 1] },
    ],
  }),
  make({
    id: 'molotov',
    name: { ko: '화염병', en: 'Molotov', ja: '火炎瓶', 'zh-Hans': '燃烧瓶', es: 'Cóctel molotov', fr: 'Cocktail Molotov' },
    description: {
      ko: '바닥에 지속되는 불길을 만들어 반복 피해를 줍니다.',
      en: 'Creates a persistent burning zone.',
      ja: '地面に燃え続ける炎を作り、繰り返しダメージを与えます。',
      'zh-Hans': '在地面上形成持续燃烧的区域。',
      es: 'Crea una zona en llamas persistente.',
      fr: 'Crée une zone enflammée persistante.',
    },
    iconKey: 'weapon-molotov', category: 'active', behavior: 'molotov', maxLevel: 5,
    stats: { damage: 3, cooldown: 2, projectileSpeed: 230, count: 1, radius: 68, duration: 3, knockback: 0.1, pierce: 1 },
    bonuses: [
      { stat: 'damage', values: [1, 1, 1, 2] },
      { stat: 'duration', values: [0.4, 0.4, 0.6, 0.8] },
      { stat: 'radius', values: [6, 6, 10, 12] },
    ],
  }),
  make({
    id: 'lightsaber',
    name: { ko: '광선검', en: 'Lightsaber', ja: 'ライトセーバー', 'zh-Hans': '光剑', es: 'Sable de luz', fr: 'Sabre laser' },
    description: {
      ko: '회전하는 광선검이 근접한 적을 연속으로 절단합니다.',
      en: 'A rotating energy blade slices nearby enemies.',
      ja: '回転するエネルギーブレードが近くの敵を連続で切り裂きます。',
      'zh-Hans': '旋转的能量剑刃连续斩击附近的敌人。',
      es: 'Una hoja de energía giratoria corta a los enemigos cercanos.',
      fr: 'Une lame d’énergie rotative tranche les ennemis proches.',
    },
    iconKey: 'weapon-lightsaber', category: 'active', behavior: 'beam', maxLevel: 5,
    stats: { damage: 5, cooldown: 3, count: 1, radius: 104, duration: 0.75, knockback: 0.2, pierce: 99 },
    bonuses: [
      { stat: 'damage', values: [0.5, 0.5, 0.5, 1] },
      { stat: 'radius', values: [8, 8, 12, 16] },
      { stat: 'duration', values: [0.1, 0.1, 0.15, 0.2] },
    ],
  }),
  make({
    id: 'machete',
    name: { ko: '마체테', en: 'Machete', ja: 'マチェーテ', 'zh-Hans': '砍刀', es: 'Machete', fr: 'Machette' },
    description: {
      ko: '좌우로 번갈아 넓게 베어 전선을 정리합니다.',
      en: 'Alternates broad slashes to the left and right.',
      ja: '左右交互に大きく斬りつけて前線を切り開きます。',
      'zh-Hans': '左右交替进行大范围斩击，清理前线。',
      es: 'Alterna amplios cortes a izquierda y derecha.',
      fr: 'Alterne de larges entailles à gauche et à droite.',
    },
    iconKey: 'weapon-machete', category: 'active', behavior: 'sideSlash', maxLevel: 5,
    stats: { damage: 2, cooldown: 1.75, count: 1, radius: 132, duration: 0.22, knockback: 1, pierce: 99 },
    bonuses: [
      { stat: 'damage', values: [0.5, 0.5, 0.5, 1] },
      { stat: 'radius', values: [10, 10, 14, 18] },
      { stat: 'cooldown', values: [-0.1, -0.1, -0.12, -0.14] },
    ],
  }),
  make({
    id: 'bazooka',
    name: { ko: '바주카', en: 'Bazooka', ja: 'バズーカ', 'zh-Hans': '火箭筒', es: 'Bazuca', fr: 'Bazooka' },
    description: {
      ko: '느리지만 강력한 폭발탄을 발사합니다.',
      en: 'Fires a slow, high-impact explosive rocket.',
      ja: '遅いものの威力の高い爆発ロケットを発射します。',
      'zh-Hans': '发射速度缓慢但威力强大的爆炸火箭。',
      es: 'Dispara un cohete explosivo lento pero devastador.',
      fr: 'Tire une roquette explosive lente mais dévastatrice.',
    },
    iconKey: 'weapon-bazooka', category: 'active', behavior: 'grenade', maxLevel: 5,
    stats: { damage: 20, cooldown: 3, projectileSpeed: 210, count: 1, radius: 78, duration: 1.4, knockback: 2, pierce: 1 },
    bonuses: [
      { stat: 'damage', values: [4, 4, 6, 8] },
      { stat: 'cooldown', values: [-0.1, -0.1, -0.1, -0.1] },
      { stat: 'radius', values: [6, 8, 10, 14] },
    ],
  }),
  make({
    id: 'sword',
    name: { ko: '쌍방향 검격', en: 'Twin Sword', ja: '双方向剣撃', 'zh-Hans': '双向剑击', es: 'Espada gemela', fr: 'Lames jumelles' },
    description: {
      ko: '좌우에 동시에 짧고 강한 검격을 냅니다.',
      en: 'Strikes hard on both sides at once.',
      ja: '左右両側へ同時に短く強力な斬撃を放ちます。',
      'zh-Hans': '同时向左右两侧发动短促而强力的斩击。',
      es: 'Golpea con fuerza a ambos lados a la vez.',
      fr: 'Frappe puissamment des deux côtés à la fois.',
    },
    iconKey: 'weapon-sword', category: 'active', behavior: 'sideSlash', maxLevel: 5,
    stats: { damage: 30, cooldown: 1, count: 2, radius: 92, duration: 0.16, knockback: 1.2, pierce: 99 },
    bonuses: [
      { stat: 'damage', values: [4, 4, 6, 8] },
      { stat: 'radius', values: [6, 8, 10, 14] },
      { stat: 'cooldown', values: [-0.08, -0.08, -0.1, -0.12] },
    ],
  }),
  make({
    id: 'recovery',
    name: { ko: '재생', en: 'Recovery', ja: '再生', 'zh-Hans': '恢复', es: 'Recuperación', fr: 'Récupération' },
    description: {
      ko: '일정 시간마다 체력을 회복합니다.',
      en: 'Restores health at regular intervals.',
      ja: '一定時間ごとに体力を回復します。',
      'zh-Hans': '每隔一段时间恢复生命值。',
      es: 'Restaura salud a intervalos regulares.',
      fr: 'Restaure la santé à intervalles réguliers.',
    },
    iconKey: 'pickup-potion', category: 'passive', behavior: 'recovery', maxLevel: 5,
    stats: { recovery: 1, cooldown: 10 },
    bonuses: [
      { stat: 'recovery', values: [0.5, 0.5, 1, 1] },
      { stat: 'cooldown', values: [-0.05, -0.05, -0.08, -0.1] },
    ],
  }),
  make({
    id: 'lifesteal',
    name: { ko: '생명 흡수', en: 'Lifesteal', ja: 'ライフスティール', 'zh-Hans': '生命汲取', es: 'Robo de vida', fr: 'Vol de vie' },
    description: {
      ko: '공격 적중 시 낮은 확률로 체력을 회복합니다.',
      en: 'Hits have a small chance to restore health.',
      ja: '攻撃命中時、低確率で体力を回復します。',
      'zh-Hans': '攻击命中时有小概率恢复生命值。',
      es: 'Los golpes tienen una pequeña probabilidad de restaurar salud.',
      fr: 'Les coups ont une faible chance de restaurer de la santé.',
    },
    iconKey: 'weapon-dagger', category: 'passive', behavior: 'lifesteal', maxLevel: 5,
    stats: { recovery: 1, lifestealChance: 0.025 },
    bonuses: [
      { stat: 'lifestealChance', values: [0.01, 0.01, 0.015, 0.02] },
      { stat: 'recovery', values: [0, 0.5, 0.5, 1] },
    ],
  }),
  make({
    id: 'aoe',
    name: { ko: '범위 +', en: 'AOE +', ja: '範囲 +', 'zh-Hans': '范围 +', es: 'Área +', fr: 'Zone +' },
    description: {
      ko: '모든 공격의 범위를 15% 늘립니다.',
      en: 'Increases the size of all attacks by 15%.',
      ja: 'すべての攻撃範囲を15%拡大します。',
      'zh-Hans': '所有攻击的范围扩大15%。',
      es: 'Aumenta un 15 % el tamaño de todos los ataques.',
      fr: 'Augmente de 15 % la taille de toutes les attaques.',
    },
    iconKey: 'ui-circle', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'radius', values: [0.15, 0.15, 0.15, 0.15, 0.15] }],
  }),
  make({
    id: 'armor',
    name: { ko: '방어력 +', en: 'Armor +', ja: '防御力 +', 'zh-Hans': '护甲 +', es: 'Armadura +', fr: 'Armure +' },
    description: {
      ko: '받는 피해를 1 줄입니다. 최소 피해는 1입니다.',
      en: 'Reduces incoming damage by 1, to a minimum of 1.',
      ja: '受けるダメージを1減らします。最小ダメージは1です。',
      'zh-Hans': '受到的伤害减少1，最低伤害为1。',
      es: 'Reduce el daño recibido en 1, hasta un mínimo de 1.',
      fr: 'Réduit les dégâts subis de 1, jusqu’à un minimum de 1.',
    },
    iconKey: 'ui-square', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'armor', values: [1, 1, 1, 1, 1] }],
  }),
  make({
    id: 'cooldown',
    name: { ko: '재사용 대기시간 +', en: 'Cooldown +', ja: 'クールダウン +', 'zh-Hans': '冷却 +', es: 'Recarga +', fr: 'Recharge +' },
    description: {
      ko: '모든 무기의 재사용 대기시간을 단축합니다.',
      en: 'Reduces all weapon cooldowns.',
      ja: 'すべての武器のクールダウンを短縮します。',
      'zh-Hans': '缩短所有武器的冷却时间。',
      es: 'Reduce los tiempos de recarga de todas las armas.',
      fr: 'Réduit le temps de recharge de toutes les armes.',
    },
    iconKey: 'ui-play', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'cooldown', values: [-0.15, -0.15, -0.15, -0.1, -0.15] }],
  }),
  make({
    id: 'damage',
    name: { ko: '공격력 +', en: 'Damage +', ja: '攻撃力 +', 'zh-Hans': '伤害 +', es: 'Daño +', fr: 'Dégâts +' },
    description: {
      ko: '모든 공격 피해를 10% 늘립니다.',
      en: 'Increases all damage by 10%.',
      ja: 'すべての攻撃ダメージを10%増加させます。',
      'zh-Hans': '所有伤害提高10%。',
      es: 'Aumenta todo el daño un 10 %.',
      fr: 'Augmente tous les dégâts de 10 %.',
    },
    iconKey: 'weapon-bomb', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'damage', values: [0.1, 0.1, 0.1, 0.1, 0.15] }],
  }),
  make({
    id: 'moveSpeed',
    name: { ko: '이동 속도 +', en: 'Speed +', ja: '移動速度 +', 'zh-Hans': '移速 +', es: 'Velocidad +', fr: 'Vitesse +' },
    description: {
      ko: '이동 속도를 10% 늘립니다.',
      en: 'Increases movement speed by 10%.',
      ja: '移動速度を10%増加させます。',
      'zh-Hans': '移动速度提高10%。',
      es: 'Aumenta la velocidad de movimiento un 10 %.',
      fr: 'Augmente la vitesse de déplacement de 10 %.',
    },
    iconKey: 'ui-play', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'moveSpeed', values: [0.1, 0.1, 0.1, 0.1, 0.1] }],
  }),
  make({
    id: 'knockback',
    name: { ko: '밀치기 +', en: 'Knockback +', ja: 'ノックバック +', 'zh-Hans': '击退 +', es: 'Empuje +', fr: 'Recul +' },
    description: {
      ko: '모든 공격의 밀치기 힘을 강화합니다.',
      en: 'Increases knockback from all attacks.',
      ja: 'すべての攻撃のノックバックを強化します。',
      'zh-Hans': '提高所有攻击的击退效果。',
      es: 'Aumenta el empuje de todos los ataques.',
      fr: 'Augmente le recul infligé par toutes les attaques.',
    },
    iconKey: 'weapon-bat', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'knockback', values: [0.1, 0.1, 0.1, 0.1, 0.15] }],
  }),
  make({
    id: 'projectileCount',
    name: { ko: '투사체 수 +', en: 'Projectiles +', ja: '投射物数 +', 'zh-Hans': '投射物 +', es: 'Proyectiles +', fr: 'Projectiles +' },
    description: {
      ko: '투사체 기반 무기의 발사 수를 늘립니다.',
      en: 'Adds projectiles to projectile-based weapons.',
      ja: '投射物を使う武器の発射数を増やします。',
      'zh-Hans': '增加投射物类武器的发射数量。',
      es: 'Añade proyectiles a las armas que los utilizan.',
      fr: 'Ajoute des projectiles aux armes qui en utilisent.',
    },
    iconKey: 'weapon-shuriken', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'count', values: [1, 1, 1, 1, 1] }],
  }),
  make({
    id: 'projectileSpeed',
    name: { ko: '투사체 속도 +', en: 'Projectile Speed +', ja: '投射速度 +', 'zh-Hans': '投射物速度 +', es: 'Velocidad de proyectil +', fr: 'Vitesse des projectiles +' },
    description: {
      ko: '모든 투사체의 속도를 10% 늘립니다.',
      en: 'Increases projectile speed by 10%.',
      ja: 'すべての投射物の速度を10%増加させます。',
      'zh-Hans': '所有投射物的速度提高10%。',
      es: 'Aumenta la velocidad de todos los proyectiles un 10 %.',
      fr: 'Augmente la vitesse de tous les projectiles de 10 %.',
    },
    iconKey: 'weapon-machine-gun', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'projectileSpeed', values: [0.1, 0.1, 0.1, 0.1, 0.15] }],
  }),
]);

export const abilityById = new Map<AbilityId, AbilityDefinition>(abilities.map((ability) => [ability.id, ability]));

export function getAbility(id: AbilityId): AbilityDefinition {
  const ability = abilityById.get(id);
  if (!ability) throw new Error(`Unknown ability: ${id}`);
  return ability;
}

export function cumulativeAbilityBonus(id: AbilityId, level: number, stat: StatKey): number {
  const ability = getAbility(id);
  const bonus = ability.bonuses.find((entry) => entry.stat === stat);
  if (!bonus || level <= 1) return 0;
  return bonus.values.slice(0, level - 1).reduce((sum, value) => sum + value, 0);
}
