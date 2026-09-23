import Phaser from 'phaser';
import EasyStar from 'easystarjs';
import type { LiveSession } from '../models/live';
import { characters, chatter, mdName, mdOffice, offices } from './model';
import { spriteCanvas } from './art';

export interface Target {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: 'person' | 'travel' | 'laptop';
}
export interface SceneBridge {
  getSession: () => LiveSession;
  blocked: () => boolean;
  direction: () => { x: number; y: number };
  near: (target: Target | null) => void;
  interact: (target: Target) => void;
  position: (x: number, y: number) => void;
}
export class OfficeScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  private actors: {
    sprite: Phaser.GameObjects.Sprite;
    label: Phaser.GameObjects.Text;
    bubble: Phaser.GameObjects.Text;
    marker: Phaser.GameObjects.Text;
    id: string;
    x: number;
    y: number;
    index: number;
  }[] = [];
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private grid = Array.from({ length: 27 }, () => Array<number>(40).fill(0));
  private finder = new EasyStar.js();
  private path: { x: number; y: number }[] = [];
  private pending: string | null = null;
  private nearId = '';
  private lastSave = 0;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private floor!: Phaser.GameObjects.Graphics;
  private targets: Target[] = [];
  private office: 'albion' | 'continental';
  constructor(private bridge: SceneBridge) {
    super('Office');
    this.office = bridge.getSession().world?.office ?? 'albion';
  }
  private label(
    x: number,
    y: number,
    text: string,
    size = 14,
    color = '#4b605e',
  ) {
    return this.add
      .text(x, y, text, {
        fontFamily: 'Arial',
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
      })
      .setOrigin(0.5)
      .setDepth(3);
  }
  private rect(x: number, y: number, w: number, h: number, color: number) {
    this.floor.fillStyle(color);
    this.floor.fillRect(x, y, w, h);
  }
  private solid(x: number, y: number, w: number, h: number) {
    const obstacle = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0, 0);
    this.physics.add.existing(obstacle, true);
    this.obstacles.add(obstacle);
    for (let cy = 0; cy < 27; cy++)
      for (let cx = 0; cx < 40; cx++)
        if (
          cx * 32 + 16 > x - 10 &&
          cx * 32 + 16 < x + w + 10 &&
          cy * 32 + 16 > y - 10 &&
          cy * 32 + 16 < y + h + 10
        )
          this.grid[cy][cx] = 1;
  }
  private wall(x: number, y: number, w: number, h: number) {
    this.rect(x + 3, y + 5, w, h, 0x9aaba7);
    this.rect(x, y, w, h, 0x344b50);
    this.rect(x + 2, y + 2, Math.max(2, w - 4), Math.max(2, h - 4), 0xe9eee9);
    this.solid(x, y, w, h);
  }
  private plant(x: number, y: number) {
    this.rect(x - 9, y + 4, 18, 13, 0x98645c);
    this.floor.fillStyle(0x496b54);
    this.floor.fillCircle(x, y, 15);
    this.floor.fillStyle(0x71956b);
    this.floor.fillCircle(x - 6, y - 4, 9);
    this.floor.fillStyle(0x91af76);
    this.floor.fillCircle(x + 4, y - 7, 6);
  }
  private desk(x: number, y: number) {
    this.rect(x + 3, y + 5, 90, 42, 0xb5bdb4);
    this.rect(x, y, 90, 38, 0xead5aa);
    this.rect(x, y, 90, 4, 0xc4a878);
    this.rect(x + 25, y + 5, 34, 19, 0x334853);
    this.rect(
      x + 28,
      y + 7,
      28,
      13,
      this.office === 'albion' ? 0x8db9bd : 0xa6c6ae,
    );
    this.rect(x + 35, y + 27, 22, 5, 0xf9faf2);
    this.rect(x + 72, y + 22, 7, 8, 0xffffff);
    this.rect(x + 13, y + 12, 8, 15, 0xececea);
    this.solid(x, y, 90, 34);
    this.rect(x + 33, y + 52, 28, 23, 0x577376);
  }
  create() {
    const south = this.office === 'continental';
    this.cameras.main.setBackgroundColor(
      this.office === 'albion' ? '#49685d' : '#69876a',
    );
    this.physics.world.setBounds(32, 32, 1216, 800);
    this.obstacles = this.physics.add.staticGroup();
    this.floor = this.add.graphics().setDepth(0);
    this.rect(
      30,
      32,
      1220,
      800,
      this.office === 'albion' ? 0x7c9387 : 0x94a173,
    );
    for (let x = 0; x < 1280; x += 32)
      for (let y = 0; y < 864; y += 32) {
        if ((x / 32 + y / 32) % 2 === 0)
          this.rect(
            x,
            y,
            32,
            32,
            this.office === 'albion' ? 0x627d6b : 0x859564,
          );
      }
    // The exterior and room plans identify each site independently of the HUD.
    if (south) {
      this.rect(0, 0, 1280, 65, 0x8ccbd1);
      this.floor.fillStyle(0x657d83);
      this.floor.fillPoints(
        [
          new Phaser.Geom.Point(120, 65),
          new Phaser.Geom.Point(260, 19),
          new Phaser.Geom.Point(570, 19),
          new Phaser.Geom.Point(660, 65),
        ],
        true,
      );
      for (let x = 0; x < 1280; x += 24) this.rect(x, 808, 21, 56, 0xb99770);
      for (const x of [170, 380, 890, 1100]) {
        this.floor.fillStyle(0xf2e7cb);
        this.floor.fillCircle(x, 835, 21);
        this.rect(x - 25, 825, 8, 18, 0x467b71);
        this.rect(x + 17, 825, 8, 18, 0x467b71);
      }
    } else {
      this.rect(0, 0, 1280, 62, 0x68737b);
      for (let x = 0; x < 1280; x += 100) this.rect(x, 24, 55, 4, 0xe2dcb1);
      this.rect(0, 808, 1280, 56, 0xa4aaad);
      for (let x = 0; x < 1280; x += 48) {
        this.floor.lineStyle(1, 0x818a90);
        this.floor.lineBetween(x, 808, x, 864);
      }
    }
    this.rect(58, 68, 1170, 742, 0x203e4044);
    this.rect(64, 72, 1152, 728, 0xe8e9dd);
    for (let x = 64; x < 1216; x += 32)
      for (let y = 80; y < 800; y += 32) {
        this.floor.lineStyle(1, 0xcdd5cd, 0.45);
        this.floor.strokeRect(x, y, 32, 32);
      }
    this.rect(80, 88, 340, 240, south ? 0xc8b0a0 : 0x94b4aa);
    this.rect(448, 88, 368, 240, south ? 0xe4ddbc : 0xd2c39c);
    this.rect(864, 88, 336, 240, south ? 0x95bdb6 : 0xb7a6b9);
    this.rect(
      80,
      416,
      1120,
      212,
      this.office === 'albion' ? 0xb7c9c6 : 0xbac8ad,
    );
    this.rect(80, 664, 330, 118, 0xc5d5d8);
    this.rect(916, 664, 284, 118, 0xd9c5a0);
    this.wall(64, 72, 1152, 12);
    this.wall(64, 72, 12, 728);
    this.wall(1204, 72, 12, 728);
    this.wall(64, 788, 530, 12);
    this.wall(686, 788, 530, 12);
    this.wall(428, 84, 12, 250);
    this.wall(832, 84, 12, 250);
    for (const [x, w] of [
      [64, 140],
      [284, 156],
      [440, 140],
      [660, 184],
      [844, 130],
      [1054, 162],
    ])
      this.wall(x, 334, w, 12);
    // Windows have a pale sill and visible exterior, instead of opaque room roofs.
    for (let x = 112; x < 1190; x += 128) {
      this.rect(x, 72, 64, 12, 0x86b9c5);
      this.rect(x + 3, 74, 58, 3, 0xdcefee);
    }
    this.label(
      250,
      112,
      south ? 'MD / THE CAPE RETREAT' : 'THE ALIGNMENT ROOM',
      13,
    );
    this.label(
      630,
      112,
      south ? 'THE SOCIAL RESPONSIBILITY CAFE' : 'CAFFEINE & CONCERNS',
      13,
    );
    this.label(
      1030,
      112,
      south ? 'THE TABLE MOUNTAIN ROOM' : 'MANAGING DIRECTOR',
      13,
    );
    this.label(
      640,
      374,
      `${offices[this.office].name.toUpperCase()} / OPEN PLAN, CLOSED MINDS`,
      16,
    );
    // Meeting table, lounge, kitchenette and MD office.
    if (south) {
      this.desk(205, 174);
      this.rect(100, 166, 62, 88, 0xa66359);
      this.solid(100, 166, 62, 88);
      this.rect(342, 166, 50, 88, 0xa66359);
      this.solid(342, 166, 50, 88);
      this.plant(110, 298);
      this.plant(392, 298);
      this.rect(474, 144, 310, 32, 0x5e9185);
      this.solid(474, 144, 310, 32);
      for (const x of [535, 720]) {
        this.floor.fillStyle(0xeee4c7);
        this.floor.fillCircle(x, 245, 29);
        this.solid(x - 23, 222, 46, 46);
        this.rect(x - 46, 233, 16, 24, 0xba7264);
        this.rect(x + 30, 233, 16, 24, 0xba7264);
      }
      this.rect(925, 179, 216, 66, 0x467e79);
      this.rect(930, 184, 206, 56, 0xd7bd8b);
      this.solid(925, 179, 216, 66);
      for (let x = 936; x < 1140; x += 48) {
        this.rect(x, 156, 28, 17, 0xb97360);
        this.rect(x, 252, 28, 17, 0xb97360);
        this.rect(x + 3, 198, 20, 15, 0xf7f3df);
      }
      this.plant(890, 294);
      this.plant(1170, 294);
    } else {
      this.rect(148, 164, 184, 76, 0x8d6652);
      this.rect(154, 169, 172, 64, 0xb78963);
      this.solid(148, 164, 184, 76);
      for (let x = 156; x < 330; x += 52) {
        this.rect(x, 145, 30, 15, 0x3e6c69);
        this.rect(x, 249, 30, 15, 0x3e6c69);
        this.rect(x + 6, 187, 18, 12, 0xe9e8dc);
      }
      this.rect(468, 146, 55, 136, 0xa7a99b);
      this.rect(472, 150, 47, 128, 0xf0efe0);
      this.solid(468, 146, 55, 136);
      this.rect(478, 166, 30, 34, 0x364249);
      this.rect(584, 192, 85, 52, 0xaa7c58);
      this.solid(584, 192, 85, 52);
      this.rect(701, 180, 88, 35, 0x668972);
      this.rect(701, 226, 88, 35, 0x668972);
      this.desk(998, 174);
      this.rect(902, 166, 56, 76, 0x3c6b69);
      this.rect(1136, 160, 34, 84, 0x895d6b);
      this.plant(896, 296);
      this.plant(1170, 296);
      this.label(1037, 266, 'OWN NOTHING.', 11, '#71616f');
    }
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 6; col++) {
        this.desk(110 + col * 184, 436 + row * 106);
        if (!south)
          this.rect(108 + col * 184, 430 + row * 106, 94, 5, 0x687f96);
        else if (row === 0) this.plant(226 + col * 184, 468);
      }
    this.rect(128, 691, 150, 36, 0xd9be8c);
    this.solid(128, 691, 150, 36);
    this.label(240, 759, 'RECEPTION', 12);
    this.rect(980, 675, 160, 33, 0x384f5e);
    this.label(
      1060,
      690,
      `${this.office === 'albion' ? 'LHR > CPT' : 'CPT > LHR'}   /   DEPARTURES`,
      11,
      '#f6d780',
    );
    this.label(1060, 764, 'TRAVEL DESK', 12);
    this.label(640, 751, 'OMNIFORM GROUP', 24, '#718884');
    this.label(640, 773, 'HIGHER STANDARDS. FEWER ANSWERS.', 10, '#879a91');
    for (const [x, y] of [
      [100, 120],
      [393, 119],
      [789, 300],
      [98, 760],
      [880, 740],
      [1172, 740],
    ])
      this.plant(x, y);
    const palettes = [
      ...characters,
      { id: 'md', skin: '#d9a381', coat: '#493f59', hair: '#ddd7c3' },
    ];
    for (const p of palettes)
      for (let f = 0; f < 4; f++) {
        this.textures.addCanvas(
          `${p.id}-${f}`,
          spriteCanvas(p, f, p.id === 'md'),
        );
      }
    const s = this.bridge.getSession(),
      w = s.world;
    this.player = this.physics.add
      .sprite(
        w?.position.x ?? 640,
        w?.position.y ?? 704,
        `${w?.avatar ?? 'fixer'}-0`,
      )
      .setDepth(700)
      .setScale(1.12);
    this.player.setCollideWorldBounds(true);
    this.player.body!.setSize(16, 16);
    this.player.body!.setOffset(8, 30);
    this.physics.add.collider(this.player, this.obstacles);
    this.add
      .ellipse(this.player.x, this.player.y + 20, 36, 13, 0xf4d267, 0.9)
      .setDepth(6)
      .setName('player-ring');
    const people = s.game.employees.filter(
      (e) =>
        e.officeId === this.office &&
        ['active', 'notice', 'absent'].includes(e.status),
    );
    people.forEach((e, i) => {
      const pod = i % 12,
        extra = Math.floor(i / 12),
        x = 155 + (pod % 6) * 184 + (extra === 1 ? 38 : extra === 2 ? -25 : 0),
        y =
          505 +
          Math.floor(pod / 6) * 106 +
          (extra === 1 ? 13 : extra === 2 ? -5 : 0);
      const palette = characters[i % 4];
      const sprite = this.add
        .sprite(x, y, `${palette.id}-0`)
        .setDepth(y)
        .setInteractive({ useHandCursor: true });
      const label = this.label(x, y + 29, e.firstName, 10, '#415456');
      const bubble = this.add
        .text(x, y - 48, '', {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#2e454b',
          backgroundColor: '#fffff2',
          padding: { x: 9, y: 6 },
          wordWrap: { width: 190 },
        })
        .setOrigin(0.5, 1)
        .setDepth(1800)
        .setVisible(false);
      const marker = this.label(x, y - 37, '!', 20, '#9e4436');
      marker.setDepth(1801);
      this.actors.push({
        sprite,
        label,
        bubble,
        marker,
        id: e.id,
        x,
        y,
        index: i,
      });
      sprite.on(
        'pointerdown',
        (
          _p: unknown,
          _x: unknown,
          _y: unknown,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          this.find(e.id);
        },
      );
    });
    const bossX = south ? 250 : 1050;
    const boss = this.add
      .sprite(bossX, 276, 'md-0')
      .setInteractive({ useHandCursor: true });
    const bossLabel = this.label(bossX, 307, 'MAXWELL / MD', 11, '#764252');
    const bossBubble = this.add
      .text(bossX, 220, '', {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#fff3dd',
        backgroundColor: '#714d60',
        padding: { x: 10, y: 7 },
        wordWrap: { width: 190 },
      })
      .setOrigin(0.5, 1)
      .setDepth(1800);
    const bossMarker = this.label(bossX, 230, '!', 22, '#973e38');
    this.actors.push({
      sprite: boss,
      label: bossLabel,
      bubble: bossBubble,
      marker: bossMarker,
      id: 'md',
      x: bossX,
      y: 276,
      index: 99,
    });
    boss.on(
      'pointerdown',
      (
        _p: unknown,
        _x: unknown,
        _y: unknown,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.find('md');
      },
    );
    this.targets = [
      { id: 'travel', name: 'Travel desk', x: 1056, y: 720, kind: 'travel' },
      { id: 'laptop', name: 'Your laptop', x: 304, y: 726, kind: 'laptop' },
    ];
    this.rect(295, 718, 25, 16, 0x344b57);
    this.rect(298, 720, 19, 10, 0x89bfc2);
    this.label(307, 750, 'LAPTOP', 10);
    this.keys = this.input.keyboard!.addKeys(
      'W,A,S,D,UP,DOWN,LEFT,RIGHT,E',
      false,
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.finder.setGrid(this.grid);
    this.finder.setAcceptableTiles([0]);
    this.finder.setIterationsPerCalculation(2000);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.bridge.blocked()) this.walk(pointer.worldX, pointer.worldY);
    });
    this.input.on(
      'wheel',
      (_p: unknown, _g: unknown, _dx: number, dy: number) =>
        this.zoom(dy > 0 ? -0.1 : 0.1),
    );
    this.cameras.main.setBounds(0, 0, 1280, 864);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.resize();
    this.scale.on('resize', this.resize, this);
    this.events.once('shutdown', () =>
      this.scale.off('resize', this.resize, this),
    );
  }
  private resize() {
    this.cameras.main.setZoom(
      this.scale.width < 700
        ? 0.85
        : Math.min(1.15, this.scale.width / 1320, this.scale.height / 880),
    );
  }
  zoom(amount: number) {
    this.cameras.main.setZoom(
      Phaser.Math.Clamp(this.cameras.main.zoom + amount, 0.55, 1.8),
    );
  }
  private allTargets() {
    return [
      ...this.targets,
      ...this.actors
        .filter((a) => a.sprite.visible)
        .map((a) => ({
          id: a.id,
          name:
            a.id === 'md'
              ? mdName
              : (this.bridge
                  .getSession()
                  .game.employees.find((e) => e.id === a.id)?.firstName ??
                'Colleague'),
          x: a.sprite.x,
          y: a.sprite.y,
          kind: 'person' as const,
        })),
    ];
  }
  find(id: string) {
    const target = this.allTargets().find((t) => t.id === id);
    if (!target) return;
    if (
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        target.x,
        target.y,
      ) < 80
    ) {
      this.bridge.position(this.player.x, this.player.y);
      this.bridge.interact(target);
    } else this.walk(target.x, target.y, id);
  }
  walk(x: number, y: number, pending: string | null = null) {
    if (this.bridge.blocked()) return;
    const start = {
      x: Phaser.Math.Clamp(Math.floor(this.player.x / 32), 0, 39),
      y: Phaser.Math.Clamp(Math.floor(this.player.y / 32), 0, 26),
    };
    let end = {
      x: Phaser.Math.Clamp(Math.floor(x / 32), 0, 39),
      y: Phaser.Math.Clamp(Math.floor(y / 32), 0, 26),
    };
    if (this.grid[end.y][end.x]) {
      const cells: { x: number; y: number; d: number }[] = [];
      for (let cy = 2; cy < 25; cy++)
        for (let cx = 2; cx < 38; cx++)
          if (!this.grid[cy][cx])
            cells.push({
              x: cx,
              y: cy,
              d: Math.abs(cx - end.x) + Math.abs(cy - end.y),
            });
      end = cells.sort((a, b) => a.d - b.d)[0];
    }
    const was = this.grid[start.y][start.x];
    this.grid[start.y][start.x] = 0;
    this.finder.findPath(start.x, start.y, end.x, end.y, (path) => {
      this.path = (path ?? [])
        .slice(1)
        .map((p) => ({ x: p.x * 32 + 16, y: p.y * 32 + 16 }));
      this.pending = pending;
    });
    this.finder.calculate();
    this.grid[start.y][start.x] = was;
  }
  update(time: number) {
    if (!this.player) return;
    const s = this.bridge.getSession(),
      w = s.world,
      blocked =
        this.bridge.blocked() || s.paused || s.game.status === 'finished';
    this.player.setVelocity(0);
    if (blocked) {
      this.path = [];
      this.pending = null;
    }
    if (!blocked) {
      const touch = this.bridge.direction();
      let x =
        Number(this.keys.D.isDown || this.keys.RIGHT.isDown) -
        Number(this.keys.A.isDown || this.keys.LEFT.isDown) +
        touch.x;
      let y =
        Number(this.keys.S.isDown || this.keys.DOWN.isDown) -
        Number(this.keys.W.isDown || this.keys.UP.isDown) +
        touch.y;
      if (x || y) {
        this.path = [];
        this.pending = null;
      } else if (this.path.length) {
        const p = this.path[0],
          d = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            p.x,
            p.y,
          );
        if (d < 7) this.path.shift();
        else {
          x = (p.x - this.player.x) / d;
          y = (p.y - this.player.y) / d;
        }
      }
      const vector = new Phaser.Math.Vector2(x, y).normalize().scale(180);
      this.player.setVelocity(vector.x, vector.y);
      this.player.setTexture(
        `${w?.avatar ?? 'fixer'}-${x || y ? Math.floor(time / 130) % 4 : 0}`,
      );
      this.player.setFlipX(x < 0);
      if (time - this.lastSave > 750) {
        this.bridge.position(this.player.x, this.player.y);
        this.lastSave = time;
      }
    }
    this.player.setDepth(this.player.y + 1);
    const ring = this.children.getByName(
      'player-ring',
    ) as Phaser.GameObjects.Ellipse;
    ring.setPosition(this.player.x, this.player.y + 20);
    for (const actor of this.actors) {
      const employee = s.game.employees.find((e) => e.id === actor.id);
      const visible =
        actor.id === 'md'
          ? mdOffice(s.elapsed) === this.office
          : !!employee &&
            employee.officeId === this.office &&
            ['active', 'notice', 'absent'].includes(employee.status);
      actor.sprite.setVisible(visible);
      actor.label.setVisible(
        visible && (actor.id === this.nearId || actor.id === 'md'),
      );
      if (!blocked && visible) {
        const drift = Math.sin(time / 1800 + actor.index) * 5;
        actor.sprite.setPosition(
          actor.x + drift,
          actor.y + Math.cos(time / 2200 + actor.index) * 5,
        );
        actor.sprite.setTexture(
          `${actor.id === 'md' ? 'md' : characters[actor.index % 4].id}-${Math.floor(time / 250 + actor.index) % 4}`,
        );
      }
      actor.sprite.setDepth(actor.sprite.y);
      actor.label.setPosition(actor.sprite.x, actor.sprite.y + 30);
      const active = w?.cases.find(
        (c) => c.employeeId === actor.id && !c.choice,
      );
      actor.marker
        .setVisible(visible && !!active)
        .setPosition(actor.sprite.x, actor.sprite.y - 32);
      const speaking =
        visible &&
        !blocked &&
        (Math.floor(time / 6000) % Math.max(1, this.actors.length) ===
          actor.index ||
          (actor.id === 'md' && Math.floor(time / 8000) % 3 === 0));
      actor.bubble
        .setVisible(speaking)
        .setPosition(actor.sprite.x, actor.sprite.y - 45);
      if (speaking)
        actor.bubble.setText(
          actor.id === 'md'
            ? 'I NEED THIS YESTERDAY.\nWhatever it is.'
            : chatter[
                (actor.index + Math.floor(time / 12000)) % chatter.length
              ],
        );
    }
    const destinations = this.allTargets();
    const requested = destinations.find((t) => t.id === this.pending);
    if (
      !blocked &&
      requested &&
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        requested.x,
        requested.y,
      ) < 80
    ) {
      this.path = [];
      this.pending = null;
      this.bridge.position(this.player.x, this.player.y);
      this.bridge.interact(requested);
      return;
    }
    const closest = destinations.sort(
      (a, b) =>
        Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
        Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y),
    )[0];
    const near =
      closest &&
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        closest.x,
        closest.y,
      ) < 85
        ? closest
        : null;
    if ((near?.id ?? '') !== this.nearId) {
      this.nearId = near?.id ?? '';
      this.bridge.near(near);
    }
    if (
      !blocked &&
      near &&
      (Phaser.Input.Keyboard.JustDown(this.keys.E) || this.pending === near.id)
    ) {
      this.path = [];
      this.pending = null;
      this.bridge.position(this.player.x, this.player.y);
      this.bridge.interact(near);
    }
  }
}
