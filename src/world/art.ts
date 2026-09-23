export interface Palette {
  skin: string;
  coat: string;
  hair: string;
}
export function spriteCanvas(p: Palette, frame = 0, boss = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 48;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const box = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  };
  c.fillStyle = '#17232944';
  c.beginPath();
  c.ellipse(16, 44, 12, 3, 0, 0, Math.PI * 2);
  c.fill();
  const bob = frame % 2,
    leg = frame > 1 ? 2 : 0;
  box(8, 32, 6, 10 - leg, '#283038');
  box(18, 32, 6, 8 + leg, '#283038');
  box(6, 40 - leg, 9, 4, '#182029');
  box(18, 40 + leg, 9, 4, '#182029');
  box(5, 20 + bob, 22, 15, '#1e292f');
  box(7, 20 + bob, 18, 13, p.coat);
  box(14, 21 + bob, 4, 9, '#f4f4df');
  box(15, 24 + bob, 2, 9, boss ? '#cf5c48' : '#cdb65c');
  box(3, 24 + bob, 4, 11, p.skin);
  box(25, 24 + bob, 4, 11, p.skin);
  box(7, 3 + bob, 18, 19, '#253035');
  box(9, 5 + bob, 14, 15, p.skin);
  box(6, 8 + bob, 3, 8, p.skin);
  box(23, 8 + bob, 3, 8, p.skin);
  box(7, 2 + bob, 18, 6, p.hair);
  box(7, 7 + bob, 4, 4, p.hair);
  box(21, 6 + bob, 4, 5, p.hair);
  box(11, 12 + bob, 2, 3, '#18242c');
  box(20, 12 + bob, 2, 3, '#18242c');
  box(15, 18 + bob, 5, 1, '#7c4c3d');
  if (boss) {
    box(8, 11 + bob, 7, 4, '#18232c');
    box(18, 11 + bob, 7, 4, '#18232c');
    box(15, 12 + bob, 3, 1, '#18232c');
  }
  return canvas;
}
