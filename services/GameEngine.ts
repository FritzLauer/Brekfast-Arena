import { Entity, EntityType, Vector2, GameState, PowerUpType, SkillType } from '../types';
import {
  GAME_WIDTH, GAME_HEIGHT, 
  PLAYER_MAX_SPEED, PLAYER_ACCEL, PLAYER_FRICTION, PLAYER_SIZE, PLAYER_COLOR,
  PLAYER_MAX_HEALTH, PLAYER_DAMAGE_ON_HIT, PLAYER_INVULNERABILITY_TIME,
  BULLET_SPEED, BULLET_SIZE, BULLET_LIFETIME,
  ENEMY_RUNNER_SPEED, ENEMY_RUNNER_SIZE, ENEMY_RUNNER_COLOR, ENEMY_RUNNER_HP, ENEMY_RUNNER_SCORE,
  ENEMY_ENFORCER_SPEED, ENEMY_ENFORCER_SIZE, ENEMY_ENFORCER_COLOR, ENEMY_ENFORCER_HP, ENEMY_ENFORCER_SCORE, ENEMY_ENFORCER_SHOOT_DELAY,
  ENEMY_FORGE_SPEED, ENEMY_FORGE_SIZE, ENEMY_FORGE_COLOR, ENEMY_FORGE_HP, ENEMY_FORGE_SCORE, ENEMY_FORGE_SPAWN_DELAY,
  ENEMY_DRAGOON_SPEED, ENEMY_DRAGOON_SIZE, ENEMY_DRAGOON_COLOR, ENEMY_DRAGOON_HP, ENEMY_DRAGOON_SCORE, ENEMY_DRAGOON_SHOOT_DELAY,
  ENEMY_ORACLE_SPEED, ENEMY_ORACLE_SIZE, ENEMY_ORACLE_COLOR, ENEMY_ORACLE_HP, ENEMY_ORACLE_SCORE, ENEMY_ORACLE_KEEP_DIST, ENEMY_ORACLE_SHOOT_DELAY,
  ENEMY_MINDFLARE_SPEED, ENEMY_MINDFLARE_SIZE, ENEMY_MINDFLARE_COLOR, ENEMY_MINDFLARE_HP, ENEMY_MINDFLARE_SCORE, ENEMY_MINDFLARE_TURN_RATE,
  BOSS_PRIME_SPEED, BOSS_PRIME_SPEED_ATTACK, BOSS_PRIME_SIZE, BOSS_PRIME_COLOR, BOSS_PRIME_HP_BASE, BOSS_PRIME_SCORE, BOSS_PRIME_SHOOT_DELAY, BOSS_PRIME_SPAWN_DELAY,
  BOSS_PHASE_ATTACK_DURATION, BOSS_PHASE_SHIELD_DURATION, BOSS_PHASE_EXHAUSTED_DURATION,
  OBSTACLE_PILLAR_SIZE, OBSTACLE_PILLAR_COLOR,
  PROJ_SPARK_SPEED, PROJ_SPARK_SIZE, PROJ_SPARK_COLOR,
  PROJ_ECHO_SPEED, PROJ_ECHO_SIZE, PROJ_ECHO_COLOR,
  SKILL_EMP_COOLDOWN, SKILL_EMP_RADIUS_START, SKILL_EMP_RADIUS_END, SKILL_EMP_DURATION, SKILL_EMP_DAMAGE, SKILL_BOMB_FUSE, SKILL_BOMB_SIZE, SKILL_BOMB_COLOR,
  HUMAN_SPEED, HUMAN_SIZE, HUMAN_COLOR, HUMAN_SCORE,
  PARTICLE_LIFETIME, PLAYER_SHOOT_DELAY, COLORS,
  POWERUP_DROP_RATE, POWERUP_SHIELD_HP, POWERUP_SIZE,
  PLAYER_DASH_SPEED, PLAYER_DASH_DURATION, PLAYER_DASH_COOLDOWN,
  POWERUP_SPEED_BONUS, POWERUP_FIRE_RATE_BONUS, POWERUP_FIRE_RATE_MIN, POWERUP_SPREAD_ANGLE,
  SHOP_COSTS
} from '../constants';
import { inputService } from './InputService';
import { soundService } from './SoundService';

export class GameEngine {
  public entities: Entity[] = [];
  public score: number = 0;
  public lives: number = 3;
  public wave: number = 1;
  public isGameOver: boolean = false;
  public isShopOpen: boolean = false;
  
  private shootCooldown: number = 0;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onStateChange: (state: Partial<GameState>) => void;

  // Visual Effects State
  private trauma: number = 0; // 0.0 to 1.0, controls shake intensity
  private damageFlashTimer: number = 0; // Seconds
  private waveStartTimer: number = 0; // Seconds before wave spawns
  private hasVisitedShopForThisWave: boolean = false;

  // Permanent Run Stats
  private permStats = {
      speed: 0,
      rapid: 0,
      spread: 0,
      shield: 0
  };

  constructor(canvas: HTMLCanvasElement, onStateChange: (state: Partial<GameState>) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.lineCap = "round";
    this.onStateChange = onStateChange;
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private resize = () => {
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
  };

  public startGame() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.isGameOver = false;
    this.isShopOpen = false;
    this.entities = [];
    this.trauma = 0;
    this.damageFlashTimer = 0;
    this.waveStartTimer = 0;
    this.hasVisitedShopForThisWave = false;
    
    this.permStats = {
        speed: 0,
        rapid: 0,
        spread: 0,
        shield: 0
    };

    this.spawnPlayer();
    this.startWave();
    this.onStateChange({ score: 0, lives: 3, wave: 1, isGameOver: false, isPlaying: true, isShopOpen: false });
    soundService.playStart();
    soundService.startMusic();
  }

  public buyUpgrade(type: 'SPEED' | 'RAPID' | 'SPREAD' | 'SHIELD' | 'LIFE') {
      const costs = SHOP_COSTS;
      if (type === 'SPEED' && this.score >= costs.SPEED) {
          this.score -= costs.SPEED;
          this.permStats.speed++;
      } else if (type === 'RAPID' && this.score >= costs.RAPID) {
          this.score -= costs.RAPID;
          this.permStats.rapid++;
      } else if (type === 'SPREAD' && this.score >= costs.SPREAD) {
          this.score -= costs.SPREAD;
          this.permStats.spread++;
      } else if (type === 'SHIELD' && this.score >= costs.SHIELD) {
          this.score -= costs.SHIELD;
          this.permStats.shield++;
      } else if (type === 'LIFE' && this.score >= costs.LIFE) {
          this.score -= costs.LIFE;
          this.lives++;
      } else {
          return; 
      }
      
      this.onStateChange({ score: this.score, lives: this.lives });
      soundService.playPowerUp(); 
      
      const player = this.entities.find(e => e.type === EntityType.PLAYER);
      if (player && player.active) {
          if (type === 'SPEED') player.speedBoostLevel = this.permStats.speed;
          if (type === 'RAPID') player.rapidFireLevel = this.permStats.rapid;
          if (type === 'SPREAD') player.spreadShotLevel = this.permStats.spread;
          if (type === 'SHIELD') player.shieldHealth = (player.shieldHealth || 0) + POWERUP_SHIELD_HP;
      }
  }

  public closeShop() {
      this.isShopOpen = false;
      this.wave++; 
      this.hasVisitedShopForThisWave = false;
      this.onStateChange({ isShopOpen: false, wave: this.wave });
      this.startWave();
      soundService.playStart();
  }

  private openShop() {
      this.isShopOpen = true;
      this.hasVisitedShopForThisWave = true;
      this.onStateChange({ isShopOpen: true });
  }

  private spawnPlayer() {
    this.entities.push({
      id: 'player',
      type: EntityType.PLAYER,
      pos: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
      vel: { x: 0, y: 0 },
      size: PLAYER_SIZE,
      color: PLAYER_COLOR,
      health: PLAYER_MAX_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      active: true,
      invulnerableTimer: 0,
      hitTimer: 0,
      
      shieldHealth: this.permStats.shield * POWERUP_SHIELD_HP,
      rapidFireLevel: this.permStats.rapid,
      speedBoostLevel: this.permStats.speed,
      spreadShotLevel: this.permStats.spread,

      isDashing: false,
      dashTimer: 0,
      dashCooldownTimer: 0,
      dashDir: { x: 0, y: 0 },

      activeSkill: SkillType.EMP_BLAST,
      skillLevel: 1,
      skillCooldownTimer: 0,
      skillMaxCooldown: SKILL_EMP_COOLDOWN
    });
  }

  private startWave() {
    this.entities = this.entities.filter(e => e.type === EntityType.PLAYER || e.type === EntityType.POWERUP);

    const player = this.entities.find(e => e.type === EntityType.PLAYER);
    if (player) {
      player.pos = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
      player.vel = { x: 0, y: 0 };
    }

    this.waveStartTimer = 2.5;
    this.onStateChange({ wave: this.wave });
  }

  private spawnWaveEntities() {
    const wave = this.wave;
    
    // Check for Boss Wave (Every 10 levels)
    if (wave % 10 === 0) {
        this.spawnEntitySafe(EntityType.BOSS_PRIME);
        // Spawn some cover/fodder to help or hinder
        const pillars = 4;
        for(let i=0; i<pillars; i++) this.spawnEntitySafe(EntityType.OBSTACLE_STATIC_PILLAR);
        
        // Add humans for risk/reward
        const humanCount = 5;
        for(let i=0; i<humanCount; i++) this.spawnEntitySafe(EntityType.HUMAN);
        
        return; // Skip normal spawning
    }

    // Base density
    let enemyCount = 6 + Math.floor(wave * 2.5);
    const humanCount = Math.min(10, 2 + Math.floor(wave / 2));
    const pillarCount = Math.min(6, Math.floor(wave / 2)); // Add environmental hazards
    
    // Wave Composition
    let composition: EntityType[] = [];

    if (wave === 1) {
        // Runners only
        composition = Array(enemyCount).fill(EntityType.ENEMY_CHROME_RUNNER);
    } else if (wave === 2) {
        // Runners + Spark Enforcers
        const enforcers = Math.floor(enemyCount * 0.3);
        const runners = enemyCount - enforcers;
        composition = [
            ...Array(runners).fill(EntityType.ENEMY_CHROME_RUNNER),
            ...Array(enforcers).fill(EntityType.ENEMY_SPARK_ENFORCER)
        ];
    } else if (wave === 3) {
        // Intro Forges (Heavy spawners)
        composition = [EntityType.ENEMY_BLUE_FORGE, EntityType.ENEMY_BLUE_FORGE]; // Boss-ish wave
        composition.push(...Array(enemyCount - 2).fill(EntityType.ENEMY_CHROME_RUNNER));
    } else if (wave === 4) {
        // Dragoons + Runners
        const dragoons = Math.floor(enemyCount * 0.4);
        composition = [
            ...Array(dragoons).fill(EntityType.ENEMY_PLASMA_DRAGOON),
            ...Array(enemyCount - dragoons).fill(EntityType.ENEMY_CHROME_RUNNER)
        ];
    } else if (wave === 5) {
        // Oracles + Mindflares swarm
        const oracles = Math.min(4, Math.floor(wave/3));
        composition = [
            ...Array(oracles).fill(EntityType.ENEMY_NEURO_ORACLE),
            ...Array(enemyCount - oracles).fill(EntityType.ENEMY_CHROME_RUNNER)
        ];
    } else {
        // Procedural Mix
        for(let i=0; i<enemyCount; i++) {
            const r = Math.random();
            // Higher waves = more advanced types
            if (r < 0.1 && wave > 4) composition.push(EntityType.ENEMY_NEURO_ORACLE);
            else if (r < 0.2 && wave > 3) composition.push(EntityType.ENEMY_PLASMA_DRAGOON);
            else if (r < 0.25 && wave > 2) composition.push(EntityType.ENEMY_BLUE_FORGE);
            else if (r < 0.5) composition.push(EntityType.ENEMY_SPARK_ENFORCER);
            else composition.push(EntityType.ENEMY_CHROME_RUNNER);
        }
    }

    // Spawn Pillars (Obstacles)
    for(let i=0; i<pillarCount; i++) {
        this.spawnEntitySafe(EntityType.OBSTACLE_STATIC_PILLAR);
    }
    
    composition.sort(() => Math.random() - 0.5);

    // Formations
    let formation: 'RANDOM' | 'CIRCLE' | 'CORNERS' | 'EDGES' = 'RANDOM';
    if ((wave - 3) % 5 === 0) formation = 'CIRCLE';
    else if ((wave - 4) % 5 === 0) formation = 'CORNERS';
    else if (wave % 5 === 0) formation = 'EDGES';

    // Execute Spawning
    if (formation === 'CIRCLE') {
        const radius = Math.min(GAME_WIDTH, GAME_HEIGHT) / 2 - 40;
        composition.forEach((type, i) => {
            const angle = (i / composition.length) * Math.PI * 2;
            const x = (GAME_WIDTH / 2) + Math.cos(angle) * radius;
            const y = (GAME_HEIGHT / 2) + Math.sin(angle) * radius;
            this.spawnEnemyAt(type, { x, y });
        });
    } else if (formation === 'CORNERS') {
        composition.forEach((type, i) => {
            const corner = i % 4;
            const padding = 60;
            let cx = (corner % 2 === 0) ? padding : GAME_WIDTH - padding;
            let cy = (corner < 2) ? padding : GAME_HEIGHT - padding;
            const jx = (Math.random() - 0.5) * 150;
            const jy = (Math.random() - 0.5) * 150;
            this.spawnEnemyAt(type, { x: cx + jx, y: cy + jy });
        });
    } else if (formation === 'EDGES') {
        composition.forEach((type, i) => {
            const edge = i % 4; 
            let x, y;
            const padding = 40;
            if (edge === 0) { x = Math.random() * GAME_WIDTH; y = padding; }
            else if (edge === 1) { x = GAME_WIDTH - padding; y = Math.random() * GAME_HEIGHT; }
            else if (edge === 2) { x = Math.random() * GAME_WIDTH; y = GAME_HEIGHT - padding; }
            else { x = padding; y = Math.random() * GAME_HEIGHT; }
            this.spawnEnemyAt(type, { x, y });
        });
    } else {
        composition.forEach(type => this.spawnEntitySafe(type));
    }

    for (let i = 0; i < humanCount; i++) this.spawnEntitySafe(EntityType.HUMAN);
  }

  private spawnEnemyAt(type: EntityType, pos: Vector2) {
      pos.x = Math.max(20, Math.min(GAME_WIDTH - 20, pos.x));
      pos.y = Math.max(20, Math.min(GAME_HEIGHT - 20, pos.y));
      
      const player = this.entities.find(e => e.type === EntityType.PLAYER);
      if (player) {
         const dx = pos.x - player.pos.x;
         const dy = pos.y - player.pos.y;
         // Safe zone check
         if (Math.sqrt(dx*dx+dy*dy) < 200) {
             this.spawnEntitySafe(type);
             return;
         }
      }

      this.createEntity(type, pos);
  }

  private spawnEntitySafe(type: EntityType) {
    let safe = false;
    let pos = { x: 0, y: 0 };
    let attempts = 0;

    while (!safe && attempts < 100) {
      pos = {
        x: Math.random() * (GAME_WIDTH - 40) + 20,
        y: Math.random() * (GAME_HEIGHT - 40) + 20
      };

      const dx = pos.x - (GAME_WIDTH / 2);
      const dy = pos.y - (GAME_HEIGHT / 2);
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > 250) safe = true; 
      attempts++;
    }
    
    this.createEntity(type, pos);
  }

  private createEntity(type: EntityType, pos: Vector2) {
      const idPrefix = type.toLowerCase();
      const id = `${idPrefix}_${Date.now()}_${Math.random()}`;
      
      let entity: Entity = {
          id, type, pos: { ...pos }, vel: {x:0, y:0}, size: 10, color: '#fff', health: 1, active: true, hitTimer: 0, rotation: 0
      };

      switch(type) {
        case EntityType.ENEMY_CHROME_RUNNER:
            entity = { ...entity, size: ENEMY_RUNNER_SIZE, color: ENEMY_RUNNER_COLOR, health: ENEMY_RUNNER_HP, scoreValue: ENEMY_RUNNER_SCORE };
            break;
        case EntityType.ENEMY_SPARK_ENFORCER:
            entity = { ...entity, size: ENEMY_ENFORCER_SIZE, color: ENEMY_ENFORCER_COLOR, health: ENEMY_ENFORCER_HP, scoreValue: ENEMY_ENFORCER_SCORE, shootTimer: Math.random() * 2, moveTimer: 0 };
            break;
        case EntityType.ENEMY_BLUE_FORGE:
            entity = { ...entity, size: ENEMY_FORGE_SIZE, color: ENEMY_FORGE_COLOR, health: ENEMY_FORGE_HP, scoreValue: ENEMY_FORGE_SCORE, spawnTimer: ENEMY_FORGE_SPAWN_DELAY };
            break;
        case EntityType.ENEMY_PLASMA_DRAGOON:
            entity = { ...entity, size: ENEMY_DRAGOON_SIZE, color: ENEMY_DRAGOON_COLOR, health: ENEMY_DRAGOON_HP, scoreValue: ENEMY_DRAGOON_SCORE, shootTimer: Math.random() * 2 };
            break;
        case EntityType.ENEMY_NEURO_ORACLE:
            entity = { ...entity, size: ENEMY_ORACLE_SIZE, color: ENEMY_ORACLE_COLOR, health: ENEMY_ORACLE_HP, scoreValue: ENEMY_ORACLE_SCORE, shootTimer: Math.random() * 2 };
            break;
        case EntityType.ENEMY_MINDFLARE:
            // Can be spawned as unit or projectile
            entity = { ...entity, size: ENEMY_MINDFLARE_SIZE, color: ENEMY_MINDFLARE_COLOR, health: ENEMY_MINDFLARE_HP, scoreValue: ENEMY_MINDFLARE_SCORE };
            break;
        case EntityType.BOSS_PRIME:
            // Boss HP scales with wave number
            const bossHP = BOSS_PRIME_HP_BASE + (this.wave * 20);
            entity = { 
                ...entity, 
                size: BOSS_PRIME_SIZE, 
                color: BOSS_PRIME_COLOR, 
                health: bossHP, 
                maxHealth: bossHP,
                scoreValue: BOSS_PRIME_SCORE, 
                shootTimer: BOSS_PRIME_SHOOT_DELAY,
                spawnTimer: BOSS_PRIME_SPAWN_DELAY,
                rotation: 0,
                bossState: 'ATTACK', // Start aggressive
                bossStateTimer: BOSS_PHASE_ATTACK_DURATION
            };
            break;
        case EntityType.OBSTACLE_STATIC_PILLAR:
            entity = { ...entity, size: OBSTACLE_PILLAR_SIZE, color: OBSTACLE_PILLAR_COLOR, health: 9999, scoreValue: 0, vel: {x:0,y:0} };
            break;
        case EntityType.HUMAN:
            entity = { ...entity, size: HUMAN_SIZE, color: HUMAN_COLOR, scoreValue: HUMAN_SCORE, vel: { x: (Math.random() - 0.5) * HUMAN_SPEED, y: (Math.random() - 0.5) * HUMAN_SPEED } };
            break;
      }

      this.entities.push(entity);
  }

  private spawnParticle(pos: Vector2, color: string, lifetime: number, size: number, vel?: Vector2) {
    this.entities.push({
        id: `p_${Date.now()}_${Math.random()}`,
        type: EntityType.PARTICLE,
        pos: { ...pos },
        vel: vel ? { ...vel } : { x: 0, y: 0 },
        size: size,
        color: color,
        health: 1,
        active: true,
        lifetime: lifetime,
        maxLifetime: lifetime
    });
  }

  private spawnBulletSpread(pos: Vector2, aim: Vector2, spreadLevel: number) {
    const angleStep = POWERUP_SPREAD_ANGLE;
    const bulletCount = 1 + (spreadLevel * 2);
    const baseAngle = Math.atan2(aim.y, aim.x);
    
    for (let i = 0; i < bulletCount; i++) {
        const offset = i - Math.floor(bulletCount / 2); 
        const angle = baseAngle + (offset * angleStep);
        
        const vel = {
            x: Math.cos(angle) * BULLET_SPEED,
            y: Math.sin(angle) * BULLET_SPEED
        };
        
        this.entities.push({
            id: `b_${Date.now()}_${i}_${Math.random()}`,
            type: EntityType.BULLET,
            pos: { ...pos },
            vel: vel,
            size: BULLET_SIZE,
            color: COLORS.NEON_YELLOW,
            health: 1,
            active: true,
            lifetime: BULLET_LIFETIME
        });
    }
  }

  private spawnProjectile(type: EntityType, pos: Vector2, vel: Vector2) {
      let size = 4;
      let color = '#fff';
      let lifetime = 4.0;
      
      if (type === EntityType.PROJECTILE_SPARK) {
          size = PROJ_SPARK_SIZE;
          color = PROJ_SPARK_COLOR;
      } else if (type === EntityType.PROJECTILE_ECHO) {
          size = PROJ_ECHO_SIZE;
          color = PROJ_ECHO_COLOR;
          lifetime = 6.0;
      }

      this.entities.push({
        id: `proj_${Date.now()}_${Math.random()}`,
        type: type,
        pos: { ...pos },
        vel: { ...vel },
        size: size,
        color: color,
        health: 1,
        active: true,
        lifetime: lifetime
    });
  }

  private checkCollision(a: Entity, b: Entity, hitboxScale: number = 1.0): boolean {
    const dx = a.pos.x - b.pos.x;
    const dy = a.pos.y - b.pos.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    return dist < (a.size + b.size) * hitboxScale;
  }

  private tryDropPowerUp(pos: Vector2) {
    if (Math.random() < POWERUP_DROP_RATE) {
        const types = Object.values(PowerUpType);
        const type = types[Math.floor(Math.random() * types.length)] as PowerUpType;
        let color = COLORS.NEON_BLUE;
        if (type === PowerUpType.RAPID_FIRE) color = COLORS.POWERUP_RAPID;
        if (type === PowerUpType.SHIELD) color = COLORS.POWERUP_SHIELD;
        if (type === PowerUpType.SPEED_BOOST) color = COLORS.POWERUP_SPEED;
        if (type === PowerUpType.SPREAD_SHOT) color = COLORS.POWERUP_SPREAD;

        this.entities.push({
            id: `pu_${Date.now()}`,
            type: EntityType.POWERUP,
            pos: { ...pos },
            vel: { x: 0, y: 0 },
            size: POWERUP_SIZE,
            color: color,
            health: 1,
            active: true,
            powerUpType: type,
            lifetime: 0
        });
    }
  }

  private spawnExplosion(pos: Vector2, color: string, count: number = 8) {
    for(let i=0; i<count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 100 + 50;
        const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
        this.spawnParticle(pos, color, PARTICLE_LIFETIME * (0.5 + Math.random()*0.5), Math.random() * 4 + 2, vel);
    }
  }

  private spawnShockwave(pos: Vector2) {
      // Spawn Shockwave
      this.entities.push({
          id: `skill_emp_${Date.now()}`,
          type: EntityType.PROJECTILE_SHOCKWAVE,
          pos: { ...pos },
          vel: { x: 0, y: 0 },
          size: SKILL_EMP_RADIUS_START,
          color: COLORS.SKILL_EMP,
          health: 999,
          active: true,
          lifetime: SKILL_EMP_DURATION,
          maxLifetime: SKILL_EMP_DURATION,
          hitList: new Set() // Initialize hit list for this shockwave instance
      });
      
      this.spawnExplosion(pos, COLORS.SKILL_EMP, 40); // Burst effect
      soundService.playSkill();
      this.damageFlashTimer = 0.15; // Increased flash for visual punch without shake
  }
  
  private triggerSkill(player: Entity) {
      if (!player.activeSkill) return;
      
      if (player.activeSkill === SkillType.EMP_BLAST) {
          // PLACE BOMB instead of immediate detonation
          this.entities.push({
              id: `bomb_${Date.now()}`,
              type: EntityType.PROJECTILE_BOMB,
              pos: { ...player.pos },
              vel: { x: 0, y: 0 },
              size: SKILL_BOMB_SIZE,
              color: SKILL_BOMB_COLOR,
              health: 1,
              active: true,
              lifetime: SKILL_BOMB_FUSE,
              maxLifetime: SKILL_BOMB_FUSE
          });
          
          soundService.playBombPlant();
          player.skillCooldownTimer = player.skillMaxCooldown;
      }
  }

  private handleCollisions(player: Entity | undefined) {
    // Ultra Skill Collision (Shockwave)
    const shockwaves = this.entities.filter(e => e.type === EntityType.PROJECTILE_SHOCKWAVE && e.active);
    const enemiesAndBullets = this.entities.filter(e => 
        e.type.startsWith('ENEMY_') || 
        e.type.startsWith('PROJECTILE_') ||
        e.type === EntityType.BOSS_PRIME
    );

    shockwaves.forEach(sw => {
        if (!sw.hitList) sw.hitList = new Set();

        enemiesAndBullets.forEach(target => {
            if (!target.active) return;
            const dx = sw.pos.x - target.pos.x;
            const dy = sw.pos.y - target.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Check if within shockwave radius
            if (dist < sw.size) {
                if (target.type.startsWith('PROJECTILE_')) {
                    // Destroy bullets/sparks instantly
                    if (target.type !== EntityType.PROJECTILE_SHOCKWAVE && target.type !== EntityType.PROJECTILE_BOMB) {
                        target.active = false;
                        this.spawnParticle(target.pos, target.color, 0.2, 2);
                    }
                } else if (target.type.startsWith('ENEMY_') || target.type === EntityType.BOSS_PRIME) {
                    // Damage Enemy - ONLY ONCE PER SHOCKWAVE
                    if (!sw.hitList!.has(target.id)) {
                        sw.hitList!.add(target.id);
                        
                        // Boss Shield Check
                        if (target.type === EntityType.BOSS_PRIME && target.bossState === 'SHIELD') {
                            // Break shield early with EMP? Or just bounce?
                            // Let's make EMP break the shield timer
                            target.bossStateTimer = 0; // Force transition next frame
                            target.health -= 50; // Reduced damage through shield
                            this.spawnExplosion(target.pos, COLORS.NEON_BLUE, 20);
                        } else {
                            target.health -= SKILL_EMP_DAMAGE;
                        }

                        target.hitTimer = 0.8; // Long stun/flash (0.8s)
                        
                        // MASSIVE Knockback physics impulse (Tripled force)
                        // Calculate vector FROM Shockwave TO Target for explosion outward
                        const pushDx = target.pos.x - sw.pos.x;
                        const pushDy = target.pos.y - sw.pos.y;
                        const pushAngle = Math.atan2(pushDy, pushDx);

                        // Improved force calc: Base 18000 force + bonus for being close
                        const distanceFactor = Math.max(0.2, 1 - (dist / SKILL_EMP_RADIUS_END)); 
                        const pushForce = 18000 + (distanceFactor * 7500);
                        
                        target.vel.x = Math.cos(pushAngle) * pushForce;
                        target.vel.y = Math.sin(pushAngle) * pushForce;
                        
                        // Visual Feedback: Directional particles flying BACKWARD from force
                        for(let i=0; i<8; i++) {
                            const pSpeed = Math.random() * 400 + 200;
                            const pVelX = Math.cos(pushAngle) * pSpeed;
                            const pVelY = Math.sin(pushAngle) * pSpeed;
                            this.spawnParticle(target.pos, '#FFFFFF', 0.4, 4, {x: pVelX, y: pVelY});
                        }

                        if (target.health <= 0) {
                            target.active = false;
                            this.score += (target.scoreValue || 0);
                            this.onStateChange({ score: this.score });
                            this.spawnExplosion(target.pos, target.color);
                            this.tryDropPowerUp(target.pos);
                        }
                    }
                }
            }
        });
    });

    if (!player || !player.active) return;

    // Bullet vs Enemies
    const bullets = this.entities.filter(e => e.type === EntityType.BULLET && e.active);
    const enemies = this.entities.filter(e => 
        (e.type === EntityType.ENEMY_CHROME_RUNNER || 
         e.type === EntityType.ENEMY_SPARK_ENFORCER || 
         e.type === EntityType.ENEMY_BLUE_FORGE || 
         e.type === EntityType.ENEMY_PLASMA_DRAGOON ||
         e.type === EntityType.ENEMY_NEURO_ORACLE ||
         e.type === EntityType.ENEMY_MINDFLARE ||
         e.type === EntityType.BOSS_PRIME) && e.active
    );

    bullets.forEach(b => {
        if (!b.active) return;
        enemies.forEach(e => {
            if (!e.active) return;
            if (this.checkCollision(b, e, 1.0)) {
                
                // BOSS SHIELD LOGIC
                if (e.type === EntityType.BOSS_PRIME && e.bossState === 'SHIELD') {
                    b.active = false;
                    // Ricochet particle
                    this.spawnParticle(b.pos, COLORS.NEON_BLUE, 0.2, 3, { x: -b.vel.x * 0.5, y: -b.vel.y * 0.5 });
                    return; // No damage
                }

                b.active = false;
                
                // Exhausted Boss takes double damage
                let damage = 1;
                if (e.type === EntityType.BOSS_PRIME && e.bossState === 'EXHAUSTED') {
                    damage = 2;
                    this.spawnParticle(b.pos, COLORS.NEON_RED, 0.3, 4);
                }

                e.health -= damage;
                e.hitTimer = 0.1; // Visual Flash
                this.spawnParticle(b.pos, b.color, 0.2, 2); 
                
                if (e.health <= 0) {
                    e.active = false;
                    this.score += (e.scoreValue || 0);
                    this.onStateChange({ score: this.score });
                    soundService.playExplosion();
                    this.spawnExplosion(e.pos, e.color);
                    
                    if (e.type === EntityType.BOSS_PRIME) {
                        this.spawnExplosion(e.pos, '#FFFFFF', 50); // Massive explosion
                        this.trauma = 1.0;
                        // Drop multiple powerups
                        for(let i=0; i<5; i++) {
                            this.tryDropPowerUp({
                                x: e.pos.x + (Math.random() - 0.5) * 50,
                                y: e.pos.y + (Math.random() - 0.5) * 50
                            });
                        }
                    } else {
                        this.tryDropPowerUp(e.pos);
                        this.trauma = Math.min(1.0, this.trauma + 0.1);
                    }
                } else {
                    // Boss resists knockback completely
                    if (e.type !== EntityType.BOSS_PRIME) {
                        const dx = e.pos.x - b.pos.x;
                        const dy = e.pos.y - b.pos.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist > 0) {
                            e.pos.x += (dx/dist) * 8; // Slight knockback
                            e.pos.y += (dy/dist) * 8;
                        }
                    }
                }
            }
        });
    });

    // Player vs Everything Dangerous
    const hazards = this.entities.filter(e => (
        e.type.startsWith('ENEMY_') || 
        (e.type.startsWith('PROJECTILE_') && e.type !== EntityType.PROJECTILE_SHOCKWAVE && e.type !== EntityType.PROJECTILE_BOMB) ||
        e.type === EntityType.OBSTACLE_STATIC_PILLAR ||
        e.type === EntityType.BOSS_PRIME
    ) && e.active);

    hazards.forEach(h => {
        if (!h.active) return;
        
        // Define Hitbox Logic
        let playerHitbox = player.size;
        // If shielded, the visual size is larger (padding +4)
        if ((player.shieldHealth || 0) > 0) {
            playerHitbox += 4;
        }
        
        // Dynamic Hitbox Scaling
        let collisionScale = 0.85; // Default for bodies (enemies/pillars)
        
        // Projectiles should have a smaller hitbox against the player (grazing)
        // unless the player is shielded, then it hits the shield surface.
        if (h.type.startsWith('PROJECTILE_')) {
             if ((player.shieldHealth || 0) > 0) {
                 collisionScale = 1.0; // Hit the shield surface accurately
             } else {
                 collisionScale = 0.6; // Core grazing only (very forgiving)
             }
        } else {
             // Enemies/Pillars/Bosses
             // If shielded, match visual shield size accurately
             if ((player.shieldHealth || 0) > 0) {
                collisionScale = 1.0; 
             } else {
                collisionScale = 0.85; // Slightly forgiving hull hit
             }
        }

        const dx = player.pos.x - h.pos.x;
        const dy = player.pos.y - h.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const threshold = (playerHitbox + h.size) * collisionScale;

        if (dist < threshold) {
            if ((player.invulnerableTimer || 0) > 0) return;

            // Knockback Player on damage
            if (dist > 0) {
                const push = 600;
                player.vel.x = (dx/dist) * push;
                player.vel.y = (dy/dist) * push;
            }

            if ((player.shieldHealth || 0) > 0) {
                player.shieldHealth = Math.max(0, (player.shieldHealth || 0) - PLAYER_DAMAGE_ON_HIT);
                soundService.playExplosion(); 
                this.spawnParticle(player.pos, COLORS.POWERUP_SHIELD, 0.4, 5); 

                // Kill hazards on shield contact (except Pillars and Boss)
                if (h.type !== EntityType.OBSTACLE_STATIC_PILLAR && h.type !== EntityType.BOSS_PRIME) {
                    h.active = false;
                    this.spawnExplosion(h.pos, h.color);
                } else if (h.type === EntityType.BOSS_PRIME) {
                    // Shield bash against boss deals minor damage but doesn't kill it
                    h.health -= 5;
                    this.spawnParticle(h.pos, '#fff', 0.2, 5);
                }
                player.invulnerableTimer = 0.2; 
            } else {
                player.health -= PLAYER_DAMAGE_ON_HIT;
                this.damageFlashTimer = 0.2;
                this.trauma = Math.min(1.0, this.trauma + 0.5);
                soundService.playExplosion();
                
                // Destroy hazard too (except Pillar/Boss)
                if (h.type !== EntityType.OBSTACLE_STATIC_PILLAR && h.type !== EntityType.BOSS_PRIME) {
                    h.active = false;
                    this.spawnExplosion(h.pos, h.color);
                }

                if (player.health <= 0) {
                    player.active = false;
                    this.lives--;
                    this.onStateChange({ lives: this.lives });
                    this.spawnExplosion(player.pos, PLAYER_COLOR, 20);
                    
                    if (this.lives <= 0) {
                        this.isGameOver = true;
                        this.onStateChange({ isGameOver: true, isPlaying: false });
                        soundService.stopMusic();
                    } else {
                        setTimeout(() => {
                            if (!this.isGameOver) {
                                this.spawnPlayer();
                                this.entities.find(e => e.type === EntityType.PLAYER)!.invulnerableTimer = PLAYER_INVULNERABILITY_TIME;
                            }
                        }, 1000);
                    }
                } else {
                    player.invulnerableTimer = PLAYER_INVULNERABILITY_TIME;
                }
            }
        }
    });

    // Player vs Human (Generous pickup range 1.2)
    const humans = this.entities.filter(e => e.type === EntityType.HUMAN && e.active);
    humans.forEach(h => {
        if (this.checkCollision(player, h, 1.2)) {
            h.active = false;
            this.score += (h.scoreValue || 0);
            this.onStateChange({ score: this.score });
            soundService.playCollect();
            this.spawnParticle(h.pos, COLORS.NEON_BLUE, 0.5, 5, {x:0, y:-50});
        }
    });

    // Player vs PowerUp (Generous pickup range 1.2)
    const powerups = this.entities.filter(e => e.type === EntityType.POWERUP && e.active);
    powerups.forEach(p => {
        if (this.checkCollision(player, p, 1.2)) {
            p.active = false;
            soundService.playPowerUp();
            this.spawnParticle(p.pos, p.color, 0.5, 5);
            
            if (p.powerUpType === PowerUpType.RAPID_FIRE) {
                player.rapidFireLevel = (player.rapidFireLevel || 0) + 1;
            } else if (p.powerUpType === PowerUpType.SHIELD) {
                player.shieldHealth = (player.shieldHealth || 0) + POWERUP_SHIELD_HP;
            } else if (p.powerUpType === PowerUpType.SPEED_BOOST) {
                player.speedBoostLevel = (player.speedBoostLevel || 0) + 1;
            } else if (p.powerUpType === PowerUpType.SPREAD_SHOT) {
                player.spreadShotLevel = (player.spreadShotLevel || 0) + 1;
            }
        }
    });
  }

  public update = (dt: number) => {
    if (this.trauma > 0) {
        this.trauma = Math.max(0, this.trauma - dt * 2.5); 
    }
    if (this.damageFlashTimer > 0) {
        this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt * 4.0);
    }

    if (this.isGameOver) return;
    if (this.isShopOpen) return;

    const safeDt = Math.min(dt, 0.1);

    if (this.waveStartTimer > 0) {
        this.waveStartTimer -= safeDt;
        if (this.waveStartTimer <= 0) {
            this.spawnWaveEntities();
            this.waveStartTimer = 0;
        }
    }

    const input = inputService.getInput();
    const player = this.entities.find(e => e.type === EntityType.PLAYER);

    // --- Player Logic ---
    if (player && player.active) {
      if (player.invulnerableTimer && player.invulnerableTimer > 0) player.invulnerableTimer -= safeDt;
      if (player.dashCooldownTimer && player.dashCooldownTimer > 0) player.dashCooldownTimer -= safeDt;
      if (player.skillCooldownTimer && player.skillCooldownTimer > 0) player.skillCooldownTimer -= safeDt;
      
      const speedStacks = player.speedBoostLevel || 0;
      const currentMaxSpeed = PLAYER_MAX_SPEED + (speedStacks * POWERUP_SPEED_BONUS);
      const currentAccel = PLAYER_ACCEL + (speedStacks * 200);

      // Dash
      if (player.isDashing) {
          player.dashTimer = (player.dashTimer || 0) - safeDt;
          if (player.dashDir) {
              player.vel.x = player.dashDir.x * PLAYER_DASH_SPEED;
              player.vel.y = player.dashDir.y * PLAYER_DASH_SPEED;
          }
          if (Math.random() > 0.3) {
             this.spawnParticle(player.pos, `rgba(255, 255, 255, 0.3)`, 0.3, player.size);
          }
          if ((player.dashTimer || 0) <= 0) {
              player.isDashing = false;
              player.vel.x *= 0.5; 
              player.vel.y *= 0.5;
          }
      } else {
          const moveMag = Math.sqrt(input.move.x * input.move.x + input.move.y * input.move.y);
          if (input.dash && (player.dashCooldownTimer || 0) <= 0 && moveMag > 0.1) {
              player.isDashing = true;
              player.dashTimer = PLAYER_DASH_DURATION;
              player.dashCooldownTimer = PLAYER_DASH_COOLDOWN;
              player.dashDir = { ...input.move };
              soundService.playDash();
          }

          player.vel.x += input.move.x * currentAccel * safeDt;
          player.vel.y += input.move.y * currentAccel * safeDt;
          player.vel.x -= player.vel.x * PLAYER_FRICTION * safeDt;
          player.vel.y -= player.vel.y * PLAYER_FRICTION * safeDt;
          
          const velMag = Math.sqrt(player.vel.x*player.vel.x + player.vel.y*player.vel.y);
          if (velMag > currentMaxSpeed) {
              const ratio = currentMaxSpeed / velMag;
              player.vel.x *= ratio;
              player.vel.y *= ratio;
          }
      }
      
      // Skill Trigger
      if (input.skill && (player.skillCooldownTimer || 0) <= 0) {
          this.triggerSkill(player);
      }

      player.pos.x += player.vel.x * safeDt;
      player.pos.y += player.vel.y * safeDt;
      player.pos.x = Math.max(player.size, Math.min(GAME_WIDTH - player.size, player.pos.x));
      player.pos.y = Math.max(player.size, Math.min(GAME_HEIGHT - player.size, player.pos.y));

      if (this.shootCooldown > 0) this.shootCooldown -= safeDt;

      const shootMag = Math.sqrt(input.shoot.x * input.shoot.x + input.shoot.y * input.shoot.y);
      if (shootMag > 0.3 && this.shootCooldown <= 0) {
        const spreadLevel = player.spreadShotLevel || 0;
        this.spawnBulletSpread(player.pos, input.shoot, spreadLevel);
        const rapidLevel = player.rapidFireLevel || 0;
        const reduction = rapidLevel * POWERUP_FIRE_RATE_BONUS;
        const currentDelay = Math.max(POWERUP_FIRE_RATE_MIN, PLAYER_SHOOT_DELAY - reduction);
        this.shootCooldown = currentDelay;
        soundService.playShoot();
      }
    }

    // --- Entity AI Updates ---
    this.entities.forEach(entity => {
      if (!entity.active) return;
      if (entity.hitTimer && entity.hitTimer > 0) entity.hitTimer -= safeDt;

      // STUN CHECK: If entity was hit (by EMP or bullet), disable AI steering to allow physics knockback to work
      const isStunned = (entity.hitTimer || 0) > 0;

      // Physics integration for standard moving entities
      if (entity.type !== EntityType.OBSTACLE_STATIC_PILLAR && 
          entity.type !== EntityType.PROJECTILE_SHOCKWAVE &&
          entity.type !== EntityType.PROJECTILE_BOMB) { // Bomb is static
          entity.pos.x += entity.vel.x * safeDt;
          entity.pos.y += entity.vel.y * safeDt;

          // Apply sliding friction if stunned (so they don't float forever)
          // Use Time-based Linear Damping for smooth slide
          if (isStunned) {
              // Reduced friction from 3.0 to 1.5 to allow more slide
              entity.vel.x -= entity.vel.x * 1.5 * safeDt;
              entity.vel.y -= entity.vel.y * 1.5 * safeDt;
              
              // Visual spin when stunned
              entity.rotation = (entity.rotation || 0) + 15 * safeDt;
          }
      }
      
      // Prevent enemies from leaving the map
      if (entity.type.startsWith('ENEMY_') || entity.type === EntityType.BOSS_PRIME) {
          const margin = entity.size;
          if (entity.pos.x < margin) {
              entity.pos.x = margin;
              if (entity.vel.x < 0) entity.vel.x = 0;
          } else if (entity.pos.x > GAME_WIDTH - margin) {
              entity.pos.x = GAME_WIDTH - margin;
              if (entity.vel.x > 0) entity.vel.x = 0;
          }

          if (entity.pos.y < margin) {
              entity.pos.y = margin;
              if (entity.vel.y < 0) entity.vel.y = 0;
          } else if (entity.pos.y > GAME_HEIGHT - margin) {
              entity.pos.y = GAME_HEIGHT - margin;
              if (entity.vel.y > 0) entity.vel.y = 0;
          }
      }

      // Cleanup Bounds/Lifetime
      if (entity.type === EntityType.BULLET || entity.type === EntityType.PARTICLE || entity.type === EntityType.PROJECTILE_SPARK || entity.type === EntityType.PROJECTILE_ECHO || entity.type === EntityType.PROJECTILE_SHOCKWAVE) {
         if (entity.lifetime !== undefined) {
             entity.lifetime -= safeDt;
             if (entity.lifetime <= 0) entity.active = false;
         }
         if (entity.type !== EntityType.PROJECTILE_SHOCKWAVE && (entity.pos.x < 0 || entity.pos.x > GAME_WIDTH || entity.pos.y < 0 || entity.pos.y > GAME_HEIGHT)) {
             entity.active = false;
         }
      }

      // BOMB UPDATE
      if (entity.type === EntityType.PROJECTILE_BOMB) {
          if (entity.lifetime !== undefined) {
              entity.lifetime -= safeDt;
              if (entity.lifetime <= 0) {
                  entity.active = false;
                  this.spawnShockwave(entity.pos); // Detonate
              }
          }
      }

      // Special Update for Shockwave (Expand with Easing)
      if (entity.type === EntityType.PROJECTILE_SHOCKWAVE) {
          if (entity.lifetime && entity.maxLifetime) {
              // Cubic Ease Out: 1 - (1-t)^3
              const t = 1 - (entity.lifetime / entity.maxLifetime);
              const easeOut = 1 - Math.pow(1 - t, 3);
              entity.size = SKILL_EMP_RADIUS_START + (SKILL_EMP_RADIUS_END - SKILL_EMP_RADIUS_START) * easeOut;
          }
      }

      // Enemy logic helpers
      const angleToPlayer = (player && player.active) 
         ? Math.atan2(player.pos.y - entity.pos.y, player.pos.x - entity.pos.x) 
         : 0;

      // 1. Chrome Runner -> BURNT TOAST
      if (entity.type === EntityType.ENEMY_CHROME_RUNNER && player && player.active) {
          if (!isStunned) {
              const dx = player.pos.x - entity.pos.x;
              const dy = player.pos.y - entity.pos.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist > 0) {
                  const targetVelX = (dx / dist) * ENEMY_RUNNER_SPEED;
                  const targetVelY = (dy / dist) * ENEMY_RUNNER_SPEED;
                  
                  entity.vel.x += (targetVelX - entity.vel.x) * 5 * safeDt;
                  entity.vel.y += (targetVelY - entity.vel.y) * 5 * safeDt;
                  
                  // Face the player
                  entity.rotation = angleToPlayer;
              }
          }
      }

      // 2. Spark Enforcer -> ANGRY EGG
      if (entity.type === EntityType.ENEMY_SPARK_ENFORCER && player && player.active) {
          if (!isStunned) {
              entity.moveTimer = (entity.moveTimer || 0) - safeDt;
              if (entity.moveTimer <= 0) {
                 const dx = player.pos.x - entity.pos.x;
                 const dy = player.pos.y - entity.pos.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 if (dist > 0) {
                     const jitter = (Math.random() - 0.5) * 1.5; 
                     const vx = Math.cos(angleToPlayer + jitter) * ENEMY_ENFORCER_SPEED;
                     const vy = Math.sin(angleToPlayer + jitter) * ENEMY_ENFORCER_SPEED;
                     entity.vel.x = vx; 
                     entity.vel.y = vy;
                 }
                 entity.moveTimer = 0.5; 
              }
              // Face the player regardless of movement
              entity.rotation = angleToPlayer;
          }

          if (!isStunned && entity.shootTimer !== undefined) {
              entity.shootTimer -= safeDt;
              if (entity.shootTimer <= 0) {
                  const dx = player.pos.x - entity.pos.x;
                  const dy = player.pos.y - entity.pos.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  const dir = { x: dx/dist, y: dy/dist };
                  this.spawnProjectile(EntityType.PROJECTILE_SPARK, entity.pos, { x: dir.x * PROJ_SPARK_SPEED, y: dir.y * PROJ_SPARK_SPEED });
                  entity.shootTimer = ENEMY_ENFORCER_SHOOT_DELAY;
              }
          }
      }

      // 3. Blue Forge -> THE TOASTER
      if (entity.type === EntityType.ENEMY_BLUE_FORGE) {
          // Face the player so we shoot runners at them
          if (player && player.active) {
              entity.rotation = angleToPlayer;
          }
          
          if (entity.spawnTimer !== undefined && !isStunned) {
              entity.spawnTimer -= safeDt;
              if (entity.spawnTimer <= 0) {
                  this.createEntity(EntityType.ENEMY_CHROME_RUNNER, { ...entity.pos });
                  this.spawnParticle(entity.pos, COLORS.NEON_BLUE, 0.5, 20);
                  entity.spawnTimer = ENEMY_FORGE_SPAWN_DELAY;
              }
          }
      }

      // 4. Plasma Dragoon -> BATTLE WAFFLE
      if (entity.type === EntityType.ENEMY_PLASMA_DRAGOON && player && player.active) {
          entity.rotation = angleToPlayer;
          
          if (!isStunned) {
              const dx = player.pos.x - entity.pos.x;
              const dy = player.pos.y - entity.pos.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist > 0) {
                  const ax = (dx / dist) * 200;
                  const ay = (dy / dist) * 200;
                  entity.vel.x += ax * safeDt;
                  entity.vel.y += ay * safeDt;
                  
                  const speed = Math.sqrt(entity.vel.x*entity.vel.x + entity.vel.y*entity.vel.y);
                  if (speed > ENEMY_DRAGOON_SPEED) {
                      entity.vel.x = (entity.vel.x / speed) * ENEMY_DRAGOON_SPEED;
                      entity.vel.y = (entity.vel.y / speed) * ENEMY_DRAGOON_SPEED;
                  }
              }
          }

          if (entity.shootTimer !== undefined && !isStunned) {
              entity.shootTimer -= safeDt;
              if (entity.shootTimer <= 0) {
                  const dx = player.pos.x - entity.pos.x;
                  const dy = player.pos.y - entity.pos.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  const dir = { x: dx/dist, y: dy/dist };
                  this.spawnProjectile(EntityType.PROJECTILE_ECHO, entity.pos, { x: dir.x * PROJ_ECHO_SPEED, y: dir.y * PROJ_ECHO_SPEED });
                  entity.shootTimer = ENEMY_DRAGOON_SHOOT_DELAY;
              }
          }
      }

      // 5. Neuro Oracle -> DOOM DONUT
      if (entity.type === EntityType.ENEMY_NEURO_ORACLE && player && player.active) {
          entity.rotation = angleToPlayer;

          if (!isStunned) {
              const dx = player.pos.x - entity.pos.x;
              const dy = player.pos.y - entity.pos.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              let moveX = 0;
              let moveY = 0;
              if (dist > ENEMY_ORACLE_KEEP_DIST + 50) {
                  moveX = (dx / dist);
                  moveY = (dy / dist);
              } else if (dist < ENEMY_ORACLE_KEEP_DIST - 50) {
                  moveX = -(dx / dist);
                  moveY = -(dy / dist);
              }
              entity.vel.x += (moveX * ENEMY_ORACLE_SPEED - entity.vel.x) * 5 * safeDt;
              entity.vel.y += (moveY * ENEMY_ORACLE_SPEED - entity.vel.y) * 5 * safeDt;
          }

          if (entity.shootTimer !== undefined && !isStunned) {
              entity.shootTimer -= safeDt;
              if (entity.shootTimer <= 0) {
                  this.createEntity(EntityType.ENEMY_MINDFLARE, { ...entity.pos }); 
                  entity.shootTimer = ENEMY_ORACLE_SHOOT_DELAY;
              }
          }
      }

      // 6. Mindflare -> JELLY MISSILE
      if (entity.type === EntityType.ENEMY_MINDFLARE && player && player.active && !isStunned) {
          const dx = player.pos.x - entity.pos.x;
          const dy = player.pos.y - entity.pos.y;
          const targetAngle = Math.atan2(dy, dx);
          let currentAngle = Math.atan2(entity.vel.y, entity.vel.x);
          
          let deltaAngle = targetAngle - currentAngle;
          while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
          while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
          
          const maxTurn = ENEMY_MINDFLARE_TURN_RATE * safeDt;
          deltaAngle = Math.max(-maxTurn, Math.min(maxTurn, deltaAngle));
          currentAngle += deltaAngle;
          
          entity.vel.x = Math.cos(currentAngle) * ENEMY_MINDFLARE_SPEED;
          entity.vel.y = Math.sin(currentAngle) * ENEMY_MINDFLARE_SPEED;
          entity.rotation = currentAngle;
      }

      // 10. Boss Prime -> MEGA PANCAKE STACK
      if (entity.type === EntityType.BOSS_PRIME && player && player.active) {
          
          // Face the player for attacks/visuals
          entity.rotation = angleToPlayer;

          // Phase Logic
          entity.bossStateTimer = (entity.bossStateTimer || 0) - safeDt;
          if (entity.bossStateTimer <= 0) {
              if (entity.bossState === 'ATTACK') {
                  entity.bossState = 'SHIELD';
                  entity.bossStateTimer = BOSS_PHASE_SHIELD_DURATION;
                  soundService.playPowerUp(); // Sound cue for phase change
                  this.spawnParticle(entity.pos, COLORS.NEON_BLUE, 1.0, 30);
              } else if (entity.bossState === 'SHIELD') {
                  entity.bossState = 'EXHAUSTED';
                  entity.bossStateTimer = BOSS_PHASE_EXHAUSTED_DURATION;
              } else {
                  entity.bossState = 'ATTACK';
                  entity.bossStateTimer = BOSS_PHASE_ATTACK_DURATION;
                  soundService.playSkill(); // Sound cue for attack start
              }
          }

          // Movement & Action based on Phase
          if (entity.bossState === 'ATTACK') {
              const dx = player.pos.x - entity.pos.x;
              const dy = player.pos.y - entity.pos.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist > 0) {
                  entity.vel.x = (dx / dist) * BOSS_PRIME_SPEED_ATTACK;
                  entity.vel.y = (dy / dist) * BOSS_PRIME_SPEED_ATTACK;
              }
              
              if (entity.shootTimer !== undefined) {
                  entity.shootTimer -= safeDt;
                  if (entity.shootTimer <= 0) {
                     const spiralArms = 8;
                     // Shoot relative to facing direction
                     const baseAngle = entity.rotation || 0;
                     for(let i=0; i<spiralArms; i++) {
                         const angle = baseAngle + (i / spiralArms) * Math.PI * 2;
                         const dir = { x: Math.cos(angle), y: Math.sin(angle) };
                         this.spawnProjectile(EntityType.PROJECTILE_SPARK, entity.pos, { x: dir.x * 250, y: dir.y * 250 });
                     }
                     entity.shootTimer = BOSS_PRIME_SHOOT_DELAY;
                  }
              }
          } else if (entity.bossState === 'SHIELD') {
              // Stationary, Spawns Minions
              entity.vel.x *= 0.9;
              entity.vel.y *= 0.9;
              
              if (entity.spawnTimer !== undefined) {
                  entity.spawnTimer -= safeDt;
                  if (entity.spawnTimer <= 0) {
                      this.createEntity(EntityType.ENEMY_CHROME_RUNNER, { ...entity.pos });
                      this.spawnParticle(entity.pos, COLORS.NEON_BLUE, 0.5, 20);
                      entity.spawnTimer = BOSS_PRIME_SPAWN_DELAY;
                  }
              }
          } else if (entity.bossState === 'EXHAUSTED') {
              // Slow drift, vulnerable
              const dx = player.pos.x - entity.pos.x;
              const dy = player.pos.y - entity.pos.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist > 0) {
                  entity.vel.x = (dx / dist) * (BOSS_PRIME_SPEED * 0.5);
                  entity.vel.y = (dy / dist) * (BOSS_PRIME_SPEED * 0.5);
              }
          }
      }

      // 7. Spark Shrapnel -> HOT GREASE
      if (entity.type === EntityType.PROJECTILE_SPARK) {
          entity.moveTimer = (entity.moveTimer || 0) + safeDt * 10;
          entity.pos.x += Math.cos(entity.moveTimer) * 2; 
          entity.pos.y += Math.sin(entity.moveTimer) * 2;
      }

      // 8. Echo Slug -> BLUEBERRY
      if (entity.type === EntityType.PROJECTILE_ECHO) {
          const margin = entity.size;
          let bounced = false;
          if (entity.pos.x < margin || entity.pos.x > GAME_WIDTH - margin) {
              entity.vel.x *= -1;
              bounced = true;
          }
          if (entity.pos.y < margin || entity.pos.y > GAME_HEIGHT - margin) {
              entity.vel.y *= -1;
              bounced = true;
          }
          if (bounced) {
              entity.vel.x *= 1.1; 
              entity.vel.y *= 1.1;
              this.spawnParticle(entity.pos, entity.color, 0.2, 4);
          }
      }

      // Soft Collision (Enemy Flocking/Separation)
      if (entity.type.startsWith('ENEMY_') || entity.type === EntityType.HUMAN) {
          this.entities.forEach(other => {
              if (entity === other || !other.active) return;
              if (other.type.startsWith('ENEMY_') || other.type === EntityType.HUMAN) {
                  const dx = entity.pos.x - other.pos.x;
                  const dy = entity.pos.y - other.pos.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  const minDist = entity.size + other.size + 2; 
                  if (dist < minDist && dist > 0) {
                      const pushX = (dx / dist) * 50 * safeDt;
                      const pushY = (dy / dist) * 50 * safeDt;
                      entity.pos.x += pushX;
                      entity.pos.y += pushY;
                  }
              }
          });
      }
    });

    this.handleCollisions(player);

    this.entities = this.entities.filter(e => e.active);

    const enemiesAlive = this.entities.some(e => 
        (e.type.startsWith('ENEMY_') || e.type === EntityType.BOSS_PRIME) && e.active
    );

    if (!enemiesAlive && this.waveStartTimer <= 0) {
        if (this.wave % 5 === 0 && !this.hasVisitedShopForThisWave) {
             this.openShop();
        } else {
             this.wave++;
             this.startWave();
        }
    }
  };

  public draw() {
    // Clear Screen
    this.ctx.fillStyle = '#100c08'; // Very Dark Brown/Black
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid Background
    this.ctx.strokeStyle = '#222';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(GAME_WIDTH, y);
    }
    this.ctx.stroke();

    // Arena Border
    this.ctx.strokeStyle = '#DAA520';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Apply Screen Shake
    this.ctx.save();
    if (this.trauma > 0) {
        const shake = this.trauma * this.trauma * 15; 
        const ang = Math.random() * Math.PI * 2;
        this.ctx.translate(Math.cos(ang) * shake, Math.sin(ang) * shake);
    }

    const sortedEntities = [...this.entities].sort((a, b) => {
        const getPriority = (type: EntityType) => {
            if (type === EntityType.PARTICLE) return 0;
            if (type === EntityType.OBSTACLE_STATIC_PILLAR) return 1;
            if (type === EntityType.POWERUP) return 2;
            if (type === EntityType.HUMAN) return 2;
            if (type.startsWith('ENEMY_')) return 3;
            if (type === EntityType.BOSS_PRIME) return 4;
            if (type === EntityType.PLAYER) return 5;
            if (type === EntityType.BULLET) return 6;
            if (type === EntityType.PROJECTILE_BOMB) return 6; // High Priority for visibility
            if (type.startsWith('PROJECTILE_')) return 7;
            return 3;
        };
        return getPriority(a.type) - getPriority(b.type);
    });

    sortedEntities.forEach(entity => {
      if (!entity.active) return;
      
      this.ctx.save();
      this.ctx.translate(entity.pos.x, entity.pos.y);
      if (entity.rotation) this.ctx.rotate(entity.rotation);

      if (entity.hitTimer && entity.hitTimer > 0) {
          this.ctx.globalCompositeOperation = 'source-over';
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, entity.size, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();
          return; 
      }

      switch (entity.type) {
        case EntityType.PLAYER:
          this.drawPlayer(entity);
          break;
          
        case EntityType.ENEMY_CHROME_RUNNER: // BURNT TOAST
          // Animated Wobble
          const toastWobble = Math.sin(Date.now() / 100) * 2;
          this.ctx.translate(0, Math.abs(toastWobble));
          
          // Gradient Body
          const toastGrad = this.ctx.createLinearGradient(-entity.size, -entity.size, entity.size, entity.size);
          toastGrad.addColorStop(0, '#8B4513');
          toastGrad.addColorStop(1, '#2e1503'); // Burnt
          this.ctx.fillStyle = toastGrad;
          this.ctx.shadowColor = '#000';
          this.ctx.shadowBlur = 5;
          
          // Shape
          this.ctx.beginPath();
          // Rounded top, flat bottom
          this.ctx.moveTo(-entity.size, -entity.size * 0.5);
          this.ctx.bezierCurveTo(-entity.size * 0.5, -entity.size * 1.5, entity.size * 0.5, -entity.size * 1.5, entity.size, -entity.size * 0.5);
          this.ctx.lineTo(entity.size, entity.size);
          this.ctx.lineTo(-entity.size, entity.size);
          this.ctx.closePath();
          this.ctx.fill();
          
          // Face
          this.ctx.fillStyle = '#fff';
          this.ctx.beginPath();
          this.ctx.arc(4, -2, 3, 0, Math.PI*2);
          this.ctx.arc(4, 4, 2, 0, Math.PI*2);
          this.ctx.fill();
          break;

        case EntityType.ENEMY_SPARK_ENFORCER: // ANGRY EGG
          // Fluid Egg White
          this.ctx.fillStyle = '#fff';
          this.ctx.beginPath();
          for(let i=0; i<=Math.PI*2; i+=0.4) {
              const r = entity.size * (1.2 + Math.sin(Date.now()/150 + i*3)*0.1);
              this.ctx.lineTo(Math.cos(i)*r, Math.sin(i)*r);
          }
          this.ctx.closePath();
          this.ctx.shadowColor = '#fff';
          this.ctx.shadowBlur = 10;
          this.ctx.fill();
          this.ctx.shadowBlur = 0; // Reset
          
          // Yolk
          const yolkGrad = this.ctx.createRadialGradient(5, -2, 2, 5, 0, entity.size*0.6);
          yolkGrad.addColorStop(0, '#FFD700');
          yolkGrad.addColorStop(1, '#FFA500');
          this.ctx.fillStyle = yolkGrad;
          this.ctx.beginPath();
          this.ctx.arc(5, 0, entity.size*0.6, 0, Math.PI*2);
          this.ctx.fill();
          
          // Angry Eyebrows
          this.ctx.strokeStyle = '#000';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(2, -4); this.ctx.lineTo(8, -1);
          this.ctx.moveTo(2, 4); this.ctx.lineTo(8, 1);
          this.ctx.stroke();
          break;

        case EntityType.ENEMY_BLUE_FORGE: // THE TOASTER
          // Metallic Body
          const metalGrad = this.ctx.createLinearGradient(-entity.size, 0, entity.size, 0);
          metalGrad.addColorStop(0, '#888');
          metalGrad.addColorStop(0.5, '#eee');
          metalGrad.addColorStop(1, '#888');
          this.ctx.fillStyle = metalGrad;
          this.ctx.beginPath();
          this.ctx.roundRect(-entity.size, -entity.size*0.8, entity.size*2, entity.size*1.6, 4);
          this.ctx.fill();

          // Slots
          this.ctx.fillStyle = '#222';
          this.ctx.fillRect(-5, -entity.size*0.6, 10, entity.size*1.2);
          
          // Heating Element Glow
          this.ctx.fillStyle = '#ff4400';
          this.ctx.shadowColor = '#ff4400';
          this.ctx.shadowBlur = 15;
          const heatPulse = 0.5 + Math.sin(Date.now()/200)*0.5;
          this.ctx.globalAlpha = heatPulse;
          this.ctx.fillRect(-3, -entity.size*0.5, 6, entity.size);
          this.ctx.globalAlpha = 1;
          this.ctx.shadowBlur = 0;
          break;

        case EntityType.ENEMY_PLASMA_DRAGOON: // BATTLE WAFFLE
          // Waffle Texture
          this.ctx.fillStyle = '#DAA520';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, entity.size, 0, Math.PI*2);
          this.ctx.fill();
          
          // Grid
          this.ctx.strokeStyle = '#B8860B';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          const w = entity.size * 0.7;
          for(let x=-w; x<=w; x+=6) {
              this.ctx.moveTo(x, -w); this.ctx.lineTo(x, w);
          }
          for(let y=-w; y<=w; y+=6) {
              this.ctx.moveTo(-w, y); this.ctx.lineTo(w, y);
          }
          this.ctx.stroke();

          // Butter Pat (Cannon)
          this.ctx.fillStyle = '#FFFFE0';
          this.ctx.fillRect(4, -4, 8, 8);
          break;

        case EntityType.ENEMY_NEURO_ORACLE: // DOOM DONUT
          this.ctx.save();
          this.ctx.rotate(Date.now()/500);
          
          // Dough
          this.ctx.strokeStyle = '#DEB887';
          this.ctx.lineWidth = entity.size * 0.8;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, entity.size*0.6, 0, Math.PI*2);
          this.ctx.stroke();
          
          // Icing
          this.ctx.strokeStyle = '#FF69B4';
          this.ctx.lineWidth = entity.size * 0.6;
          this.ctx.lineCap = 'round';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, entity.size*0.6, 0, Math.PI*2);
          this.ctx.stroke();
          
          // Sprinkles
          const colors = ['#0ff', '#ff0', '#0f0'];
          for(let i=0; i<6; i++) {
              const ang = i * (Math.PI/3);
              this.ctx.fillStyle = colors[i%3];
              this.ctx.beginPath();
              this.ctx.arc(Math.cos(ang)*entity.size*0.6, Math.sin(ang)*entity.size*0.6, 2, 0, Math.PI*2);
              this.ctx.fill();
          }
          this.ctx.restore();
          break;

        case EntityType.ENEMY_MINDFLARE: // JELLY MISSILE
          // Wobbly Jelly Body
          this.ctx.fillStyle = '#800080';
          this.ctx.globalAlpha = 0.8;
          this.ctx.beginPath();
          // Tear drop shape
          this.ctx.arc(0, 0, entity.size, Math.PI/2, -Math.PI/2);
          this.ctx.lineTo(entity.size*2, 0);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.globalAlpha = 1;
          break;

        case EntityType.BOSS_PRIME: // MEGA PANCAKE STACK
           const phase = entity.bossState;
           let stackColor = '#DEB887'; // Tan
           let syrupColor = '#8B4513';
           
           if (phase === 'ATTACK') { stackColor = '#CD5C5C'; syrupColor = '#8B0000'; }
           if (phase === 'SHIELD') { stackColor = '#4682B4'; syrupColor = '#00CED1'; }
           if (phase === 'EXHAUSTED') { stackColor = '#556B2F'; syrupColor = '#6B8E23'; }

           // Stack of 3
           for(let i=2; i>=0; i--) {
               const offset = i * 8;
               this.ctx.fillStyle = stackColor;
               this.ctx.strokeStyle = syrupColor;
               this.ctx.lineWidth = 2;
               
               this.ctx.beginPath();
               this.ctx.ellipse(0, -15 + offset, entity.size, entity.size*0.6, 0, 0, Math.PI*2);
               this.ctx.fill();
               this.ctx.stroke();
               
               // Syrup Drips
               if (i === 0) {
                   this.ctx.fillStyle = syrupColor;
                   this.ctx.beginPath();
                   this.ctx.ellipse(0, -15, entity.size*0.7, entity.size*0.4, 0, 0, Math.PI*2);
                   this.ctx.fill();
                   // Drips
                   this.ctx.beginPath();
                   this.ctx.moveTo(-20, -15);
                   this.ctx.quadraticCurveTo(-20, 10, -20, 20 + Math.sin(Date.now()/200)*5);
                   this.ctx.lineTo(-10, 20 + Math.sin(Date.now()/200+1)*5);
                   this.ctx.quadraticCurveTo(-10, 10, -10, -15);
                   this.ctx.fill();
               }
           }
           
           // Butter Pat (Directional)
           this.ctx.fillStyle = '#FFFF00';
           this.ctx.fillRect(10, -25, 20, 10);
           
           // Shield Visual
           if (phase === 'SHIELD') {
               this.ctx.strokeStyle = COLORS.NEON_BLUE;
               this.ctx.lineWidth = 4;
               this.ctx.shadowColor = COLORS.NEON_BLUE;
               this.ctx.shadowBlur = 15;
               this.ctx.beginPath();
               this.ctx.arc(0, 0, entity.size + 15, 0, Math.PI*2);
               this.ctx.stroke();
           }
           
           // Health Bar (Locked Rotation for readability)
           this.ctx.save();
           this.ctx.rotate(-(entity.rotation || 0)); // Counter-rotate to keep bar level
           const hpPct = Math.max(0, entity.health / (entity.maxHealth || 1));
           this.ctx.fillStyle = '#333';
           this.ctx.fillRect(-40, -entity.size - 40, 80, 8);
           this.ctx.fillStyle = hpPct < 0.25 ? '#f00' : '#0f0';
           this.ctx.fillRect(-40, -entity.size - 40, 80 * hpPct, 8);
           this.ctx.restore();
           break;

        case EntityType.OBSTACLE_STATIC_PILLAR: // COFFEE MUG
           // Mug Body
           this.ctx.fillStyle = '#FFF';
           this.ctx.beginPath();
           this.ctx.rect(-entity.size, -entity.size, entity.size*2, entity.size*2);
           this.ctx.fill();
           
           // Coffee Liquid
           this.ctx.fillStyle = '#3e2723';
           this.ctx.beginPath();
           this.ctx.ellipse(0, -entity.size, entity.size, entity.size*0.3, 0, 0, Math.PI*2);
           this.ctx.fill();
           
           // Handle
           this.ctx.strokeStyle = '#FFF';
           this.ctx.lineWidth = 5;
           this.ctx.beginPath();
           this.ctx.arc(entity.size, 0, 12, -Math.PI/2, Math.PI/2);
           this.ctx.stroke();
           
           // Steam Animation
           this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
           this.ctx.lineWidth = 2;
           this.ctx.beginPath();
           const time = Date.now()/500;
           for(let j=0; j<3; j++) {
               const xOff = (j-1)*10;
               this.ctx.moveTo(xOff, -entity.size);
               for(let y=0; y<30; y+=5) {
                   this.ctx.lineTo(xOff + Math.sin(time + y*0.2)*5, -entity.size - y);
               }
           }
           this.ctx.stroke();
           break;

        case EntityType.HUMAN:
          // Cyan Stick Figure
          this.ctx.strokeStyle = entity.color;
          this.ctx.lineWidth = 2;
          this.ctx.shadowColor = entity.color;
          this.ctx.shadowBlur = 10;
          this.ctx.beginPath();
          this.ctx.arc(0, -5, 4, 0, Math.PI*2);
          this.ctx.moveTo(0, -1);
          this.ctx.lineTo(0, 8);
          this.ctx.moveTo(-6, 2);
          this.ctx.lineTo(6, 2);
          this.ctx.moveTo(0, 8);
          this.ctx.lineTo(-4, 14);
          this.ctx.moveTo(0, 8);
          this.ctx.lineTo(4, 14);
          this.ctx.stroke();
          if (Math.floor(Date.now() / 500) % 2 === 0) {
              this.ctx.fillStyle = '#fff';
              this.ctx.font = '8px monospace';
              this.ctx.fillText('HELP', -10, -15);
          }
          break;

        case EntityType.POWERUP:
          // Glowing Box
          this.ctx.fillStyle = entity.color;
          this.ctx.shadowColor = entity.color;
          this.ctx.shadowBlur = 15;
          this.ctx.save();
          this.ctx.rotate(Date.now() / 300);
          this.ctx.fillRect(-entity.size/2, -entity.size/2, entity.size, entity.size);
          this.ctx.restore();
          break;

        case EntityType.BULLET:
          this.ctx.fillStyle = entity.color;
          this.ctx.shadowColor = entity.color;
          this.ctx.shadowBlur = 8;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, entity.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case EntityType.PARTICLE:
          this.ctx.fillStyle = entity.color;
          this.ctx.globalAlpha = Math.max(0, entity.lifetime! / entity.maxLifetime!);
          this.ctx.beginPath();
          this.ctx.rect(-entity.size/2, -entity.size/2, entity.size, entity.size);
          this.ctx.fill();
          break;

        case EntityType.PROJECTILE_SPARK:
          // HOT GREASE
          this.ctx.fillStyle = '#FFFF00';
          this.ctx.shadowColor = '#FFA500';
          this.ctx.shadowBlur = 5;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, entity.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case EntityType.PROJECTILE_ECHO:
          // BLUEBERRY
          this.ctx.fillStyle = '#4169E1';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, entity.size, 0, Math.PI * 2);
          this.ctx.fill();
          // Shine
          this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
          this.ctx.beginPath();
          this.ctx.arc(-2, -2, 2, 0, Math.PI*2);
          this.ctx.fill();
          break;

        case EntityType.PROJECTILE_BOMB:
          // PLACED EMP BOMB (Spicy Pepper Timer)
          const blink = Math.floor(Date.now() / 100) % 2 === 0;
          
          this.ctx.fillStyle = '#333';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, entity.size, 0, Math.PI*2);
          this.ctx.fill();
          
          // Glowing Core
          this.ctx.fillStyle = blink ? COLORS.SKILL_EMP : '#222';
          this.ctx.shadowColor = COLORS.SKILL_EMP;
          this.ctx.shadowBlur = blink ? 20 : 0;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, entity.size * 0.6, 0, Math.PI*2);
          this.ctx.fill();
          
          // Countdown Number
          this.ctx.fillStyle = '#fff';
          this.ctx.font = '12px monospace';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.shadowBlur = 0;
          const timeLeft = Math.ceil(entity.lifetime || 0);
          this.ctx.fillText(timeLeft.toString(), 0, 0);
          
          // Fuse Ring
          if (entity.lifetime && entity.maxLifetime) {
              const pct = entity.lifetime / entity.maxLifetime;
              this.ctx.strokeStyle = COLORS.SKILL_EMP;
              this.ctx.lineWidth = 2;
              this.ctx.beginPath();
              this.ctx.arc(0, 0, entity.size + 4, -Math.PI/2, (-Math.PI/2) + (Math.PI*2 * pct));
              this.ctx.stroke();
          }
          break;

        case EntityType.PROJECTILE_SHOCKWAVE:
            // EMP Visual: Improved Expanding Energy Ring with layered effects
            
            // Outer White Ring
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 4;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, entity.size, 0, Math.PI * 2);
            this.ctx.stroke();

            // Inner Cyan Ring
            this.ctx.strokeStyle = COLORS.SKILL_EMP;
            this.ctx.lineWidth = 20;
            this.ctx.shadowBlur = 40;
            this.ctx.shadowColor = COLORS.SKILL_EMP;
            this.ctx.globalAlpha = 0.5;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, Math.max(0, entity.size - 10), 0, Math.PI * 2);
            this.ctx.stroke();

            // Radial Gradient Fill
            this.ctx.globalAlpha = 0.3;
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, entity.size);
            gradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
            gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.1)');
            gradient.addColorStop(0.9, 'rgba(0, 255, 255, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, entity.size, 0, Math.PI * 2);
            this.ctx.fill();
            break;
      }

      this.ctx.restore();
    });

    this.ctx.restore(); // Restore from shake

    // HUD / Overlays
    if (this.waveStartTimer > 0) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(0, GAME_HEIGHT/2 - 50, GAME_WIDTH, 100);
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        if (this.wave % 10 === 0) {
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.font = '40px monospace';
            this.ctx.fillText('⚠ BREAKFAST DETECTED ⚠', GAME_WIDTH/2, GAME_HEIGHT/2 - 20);
            this.ctx.font = '20px monospace';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(`SERVING IN ${Math.ceil(this.waveStartTimer)}...`, GAME_WIDTH/2, GAME_HEIGHT/2 + 30);
        } else {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '40px monospace';
            this.ctx.fillText(`ORDER #${this.wave}`, GAME_WIDTH/2, GAME_HEIGHT/2 - 20);
            this.ctx.font = '20px monospace';
            this.ctx.fillStyle = '#0f0';
            this.ctx.fillText(`COOKING: ${Math.ceil(this.waveStartTimer)}`, GAME_WIDTH/2, GAME_HEIGHT/2 + 30);
        }
    }
    
    if (this.damageFlashTimer > 0) {
        this.ctx.fillStyle = `rgba(255, 0, 0, ${this.damageFlashTimer * 2})`;
        this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
  }

  private drawPlayer(entity: Entity) {
      if ((entity.shieldHealth || 0) > 0) {
          const stacks = Math.ceil((entity.shieldHealth || 0) / POWERUP_SHIELD_HP);
          const currentStackHealth = (entity.shieldHealth || 0) % POWERUP_SHIELD_HP || POWERUP_SHIELD_HP;
          const healthPct = currentStackHealth / POWERUP_SHIELD_HP;
          
          let r, g, b;
          if (healthPct < 0.5) {
             const t = healthPct * 2; 
             r = 128 * (1-t); g = 0; b = 255; 
          } else {
             const t = (healthPct - 0.5) * 2;
             r = 0; g = 255 * t; b = 255;
          }
          const color = `rgb(${r},${g},${b})`;

          this.ctx.strokeStyle = color;
          this.ctx.lineWidth = 4;
          this.ctx.shadowColor = color;
          this.ctx.shadowBlur = 10;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, entity.size + 4, 0, Math.PI * 2);
          this.ctx.stroke();
          
          if (stacks > 1) {
              const moons = stacks - 1;
              const t = Date.now() / 500;
              for(let i=0; i<moons; i++) {
                  const angle = t + (i / moons) * Math.PI * 2;
                  const mx = Math.cos(angle) * (entity.size + 12);
                  const my = Math.sin(angle) * (entity.size + 12);
                  this.ctx.fillStyle = '#fff';
                  this.ctx.beginPath();
                  this.ctx.arc(mx, my, 3, 0, Math.PI*2);
                  this.ctx.fill();
              }
          }
      }

      const hpRatio = entity.health / (entity.maxHealth || 100);
      const hullColor = Math.floor(255 * hpRatio);
      this.ctx.fillStyle = `rgb(${hullColor}, ${hullColor}, ${hullColor})`;
      this.ctx.shadowColor = '#fff';
      this.ctx.shadowBlur = 15 * hpRatio;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, entity.size, 0, Math.PI * 2);
      this.ctx.fill();

      const coreR = 255 * hpRatio;
      const coreG = 240 * hpRatio;
      this.ctx.fillStyle = `rgb(${coreR}, ${coreG}, 0)`;
      this.ctx.beginPath();
      const pulse = 0.8 + Math.sin(Date.now() / 100) * 0.2;
      this.ctx.arc(0, 0, (entity.size * 0.5) * pulse, 0, Math.PI * 2);
      this.ctx.fill();
      
      if ((entity.dashCooldownTimer || 0) > 0) {
         const pct = 1 - (entity.dashCooldownTimer! / PLAYER_DASH_COOLDOWN);
         this.ctx.fillStyle = '#333';
         this.ctx.fillRect(-10, entity.size + 5, 20, 3);
         this.ctx.fillStyle = '#ffff00';
         this.ctx.fillRect(-10, entity.size + 5, 20 * pct, 3);
      }
      
      if ((entity.skillCooldownTimer || 0) > 0) {
         const pct = 1 - (entity.skillCooldownTimer! / (entity.skillMaxCooldown || 1));
         this.ctx.fillStyle = '#333';
         this.ctx.fillRect(-10, entity.size + 10, 20, 3);
         this.ctx.fillStyle = '#00ffff';
         this.ctx.fillRect(-10, entity.size + 10, 20 * pct, 3);
      } else if (entity.activeSkill) {
         this.ctx.fillStyle = '#00ffff';
         this.ctx.shadowColor = '#00ffff';
         this.ctx.shadowBlur = 5;
         this.ctx.fillRect(-10, entity.size + 10, 20, 3);
      }
  }
}