






export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;

// Movement & Physics (Units per Second)
export const PLAYER_MAX_SPEED = 350;
export const PLAYER_ACCEL = 4000; // High acceleration for snappy but smooth feel
export const PLAYER_FRICTION = 20; // High friction to stop quickly
export const PLAYER_SIZE = 12;
export const PLAYER_COLOR = '#FFFFFF';
export const PLAYER_SHOOT_DELAY = 0.15; // Base Fire Rate (Seconds)

// Dash Mechanics
export const PLAYER_DASH_SPEED = 1000;
export const PLAYER_DASH_DURATION = 0.15; // Short burst
export const PLAYER_DASH_COOLDOWN = 1.0; // Seconds

// Skill Mechanics (Ultra)
export const SKILL_EMP_COOLDOWN = 8.0; // Reduced slightly since it takes time to explode
export const SKILL_EMP_RADIUS_START = 20;
export const SKILL_EMP_RADIUS_END = 200; // Halved again from 400
export const SKILL_EMP_DURATION = 0.8; // Slower expansion to be more visible
export const SKILL_EMP_DAMAGE = 300; // Massive damage (One shots almost everything non-boss)
export const SKILL_BOMB_FUSE = 2.0; // Seconds before explosion
export const SKILL_BOMB_SIZE = 15; // Restored to original size
export const SKILL_BOMB_COLOR = '#FF4500'; // Orange-Red

// Health Mechanics
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_DAMAGE_ON_HIT = 25; 
export const PLAYER_INVULNERABILITY_TIME = 2.0; // Seconds of iframes after hit

// Power-Ups Configuration
export const POWERUP_SIZE = 12;
export const POWERUP_DROP_RATE = 0.08; // 8% chance

// Power-Up Stacking Effects
export const POWERUP_SHIELD_HP = 50;           // HP per stack
export const POWERUP_SPEED_BONUS = 40;         // Pixels/sec per stack
export const POWERUP_FIRE_RATE_BONUS = 0.015;  // Seconds reduced per stack
export const POWERUP_FIRE_RATE_MIN = 0.05;     // Cap fire rate
export const POWERUP_SPREAD_ANGLE = 0.15;      // Radians between bullets

export const BULLET_SPEED = 900;
export const BULLET_SIZE = 3;
export const BULLET_LIFETIME = 0.8; // Seconds

// --- NEW ENEMY ROSTER (BREAKFAST THEME) ---

// 1. Chrome Runner -> BURNT TOAST
export const ENEMY_RUNNER_SPEED = 180;
export const ENEMY_RUNNER_SIZE = 12;
export const ENEMY_RUNNER_COLOR = '#8B4513'; // SaddleBrown
export const ENEMY_RUNNER_HP = 1;
export const ENEMY_RUNNER_SCORE = 100;

// 2. Spark Enforcer -> ANGRY EGG
export const ENEMY_ENFORCER_SPEED = 150;
export const ENEMY_ENFORCER_SIZE = 14;
export const ENEMY_ENFORCER_COLOR = '#FFFFFF'; // White egg white
export const ENEMY_ENFORCER_HP = 2;
export const ENEMY_ENFORCER_SCORE = 250;
export const ENEMY_ENFORCER_SHOOT_DELAY = 2.0;

// 3. Blue Forge Core -> THE TOASTER
export const ENEMY_FORGE_SPEED = 40; // Very slow/pivot
export const ENEMY_FORGE_SIZE = 20;
export const ENEMY_FORGE_COLOR = '#C0C0C0'; // Chrome Silver
export const ENEMY_FORGE_HP = 15;
export const ENEMY_FORGE_SCORE = 1500;
export const ENEMY_FORGE_SPAWN_DELAY = 4.0;

// 4. Plasma Dragoon -> BATTLE WAFFLE
export const ENEMY_DRAGOON_SPEED = 100; // Drift physics
export const ENEMY_DRAGOON_SIZE = 18;
export const ENEMY_DRAGOON_COLOR = '#DAA520'; // GoldenRod
export const ENEMY_DRAGOON_HP = 5;
export const ENEMY_DRAGOON_SCORE = 500;
export const ENEMY_DRAGOON_SHOOT_DELAY = 1.5;

// 5. Neuro Oracle -> DOOM DONUT
export const ENEMY_ORACLE_SPEED = 130;
export const ENEMY_ORACLE_SIZE = 16;
export const ENEMY_ORACLE_COLOR = '#FF69B4'; // HotPink frosting
export const ENEMY_ORACLE_HP = 3;
export const ENEMY_ORACLE_SCORE = 800;
export const ENEMY_ORACLE_KEEP_DIST = 350;
export const ENEMY_ORACLE_SHOOT_DELAY = 3.5;

// 6. Mindflare -> JELLY MISSILE
export const ENEMY_MINDFLARE_SPEED = 240;
export const ENEMY_MINDFLARE_TURN_RATE = 4.0; // Radians per second
export const ENEMY_MINDFLARE_SIZE = 8;
export const ENEMY_MINDFLARE_COLOR = '#800080'; // Purple Jelly
export const ENEMY_MINDFLARE_HP = 1; // 1 Hit kill
export const ENEMY_MINDFLARE_SCORE = 50;

// 10. BOSS PRIME -> MEGA PANCAKE STACK
export const BOSS_PRIME_SPEED = 60; // Slightly faster baseline
export const BOSS_PRIME_SPEED_ATTACK = 140; // Fast when attacking
export const BOSS_PRIME_SIZE = 50; // Huge
export const BOSS_PRIME_COLOR = '#DEB887'; // Burlywood
export const BOSS_PRIME_HP_BASE = 500; // Buffed HP
export const BOSS_PRIME_SCORE = 10000;
export const BOSS_PRIME_SHOOT_DELAY = 0.5; // Rapid fire
export const BOSS_PRIME_SPAWN_DELAY = 1.0; // Fast spawns in shield mode

export const BOSS_PHASE_ATTACK_DURATION = 6.0;
export const BOSS_PHASE_SHIELD_DURATION = 5.0;
export const BOSS_PHASE_EXHAUSTED_DURATION = 3.0;

// 9. Static Pillar -> COFFEE MUG
export const OBSTACLE_PILLAR_SIZE = 25;
export const OBSTACLE_PILLAR_COLOR = '#6F4E37'; // Coffee

// Projectiles
// 7. Spark Shrapnel -> HOT GREASE
export const PROJ_SPARK_SPEED = 220;
export const PROJ_SPARK_SIZE = 4;
export const PROJ_SPARK_COLOR = '#FFFF00'; // Yellow

// 8. Echo Slug -> BLUEBERRY
export const PROJ_ECHO_SPEED = 300; // Accels on bounce
export const PROJ_ECHO_SIZE = 6;
export const PROJ_ECHO_COLOR = '#4169E1'; // RoyalBlue


export const HUMAN_SPEED = 60;
export const HUMAN_SIZE = 12;
export const HUMAN_COLOR = '#00CCFF';
export const HUMAN_SCORE = 1000;

export const PARTICLE_LIFETIME = 0.6; // Seconds

// Colors for neon glow
export const COLORS = {
  NEON_BLUE: '#00f3ff',
  NEON_RED: '#ff003c',
  NEON_GREEN: '#0aff00',
  NEON_YELLOW: '#ffee00',
  NEON_PURPLE: '#d600ff',
  POWERUP_SHIELD: '#00ffff',
  POWERUP_RAPID: '#ffaa00',
  POWERUP_SPEED: '#0aff00',
  POWERUP_SPREAD: '#d600ff',
  SKILL_EMP: '#00FFFF'
};

// Shop
export const SHOP_COSTS = {
  SPEED: 10000,
  RAPID: 10000,
  SPREAD: 25000,
  SHIELD: 15000,
  LIFE: 20000
};