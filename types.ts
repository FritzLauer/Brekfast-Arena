
export interface Vector2 {
  x: number;
  y: number;
}

export enum EntityType {
  PLAYER = 'PLAYER',
  
  // New Enemy Roster
  ENEMY_CHROME_RUNNER = 'ENEMY_CHROME_RUNNER',
  ENEMY_SPARK_ENFORCER = 'ENEMY_SPARK_ENFORCER',
  ENEMY_BLUE_FORGE = 'ENEMY_BLUE_FORGE',
  ENEMY_PLASMA_DRAGOON = 'ENEMY_PLASMA_DRAGOON',
  ENEMY_NEURO_ORACLE = 'ENEMY_NEURO_ORACLE',
  ENEMY_MINDFLARE = 'ENEMY_MINDFLARE', // Homing Unit
  
  BOSS_PRIME = 'BOSS_PRIME', // Boss Entity
  
  // New Hazards/Projectiles
  OBSTACLE_STATIC_PILLAR = 'OBSTACLE_STATIC_PILLAR',
  PROJECTILE_SPARK = 'PROJECTILE_SPARK', // Wobbly
  PROJECTILE_ECHO = 'PROJECTILE_ECHO',   // Bouncing
  PROJECTILE_SHOCKWAVE = 'PROJECTILE_SHOCKWAVE', // Ultra Skill Effect
  PROJECTILE_BOMB = 'PROJECTILE_BOMB',   // Placed EMP Bomb
  
  HUMAN = 'HUMAN',
  BULLET = 'BULLET', // Player Bullet
  PARTICLE = 'PARTICLE',
  POWERUP = 'POWERUP'
}

export enum PowerUpType {
  RAPID_FIRE = 'RAPID_FIRE',
  SHIELD = 'SHIELD',
  SPEED_BOOST = 'SPEED_BOOST',
  SPREAD_SHOT = 'SPREAD_SHOT'
}

export enum SkillType {
  EMP_BLAST = 'EMP_BLAST',
  // Future skills can be added here:
  // TIME_FREEZE = 'TIME_FREEZE',
  // MISSILE_BARRAGE = 'MISSILE_BARRAGE'
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector2;
  vel: Vector2;
  size: number;
  color: string;
  health: number;
  maxHealth?: number;
  invulnerableTimer?: number; // Post-damage iframes
  hitTimer?: number; // Visual flash when damaged
  
  // Power-Up Stacks (Permanent unti death)
  shieldHealth?: number;      // Stacks HP
  rapidFireLevel?: number;    // Stacks Fire Rate
  speedBoostLevel?: number;   // Stacks Move Speed
  spreadShotLevel?: number;   // Stacks Bullet Count
  
  // Dash mechanics
  isDashing?: boolean;
  dashTimer?: number;
  dashCooldownTimer?: number;
  dashDir?: Vector2;

  // Skill mechanics
  activeSkill?: SkillType;
  skillLevel?: number; // For future upgrades
  skillCooldownTimer?: number;
  skillMaxCooldown?: number;
  hitList?: Set<string>; // Tracks IDs of entities already hit by this AOE

  // Enemy mechanics
  shootTimer?: number;
  moveTimer?: number; // For erratic movement logic
  spawnTimer?: number; // For Forge spawning

  // Boss mechanics
  bossState?: 'ATTACK' | 'SHIELD' | 'EXHAUSTED';
  bossStateTimer?: number;

  powerUpType?: PowerUpType;
  active: boolean;
  scoreValue?: number;
  rotation?: number;
  lifetime?: number; // For particles/bullets
  maxLifetime?: number;
}

export interface GameState {
  score: number;
  lives: number;
  wave: number;
  isGameOver: boolean;
  isPlaying: boolean;
  isShopOpen: boolean;
  entities: Entity[];
}

export interface InputState {
  move: Vector2;
  shoot: Vector2;
  start: boolean; // Start button or Enter
  dash: boolean;
  skill: boolean; // Ultra Attack (F)
}
