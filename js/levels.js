import { BLOCK, MODES } from "./constants.js";

/** Level object helpers */
const b = (x, y, w = 1, h = 1) => ({ type: "block", x: x * BLOCK, y: y * BLOCK, w: w * BLOCK, h: h * BLOCK });
const spike = (x, y, dir = "up") => ({ type: "spike", x: x * BLOCK, y: y * BLOCK, w: BLOCK, h: BLOCK, dir });
const pad = (x, y, kind = "yellow") => ({ type: "pad", x: x * BLOCK, y: y * BLOCK + BLOCK * 0.7, w: BLOCK, h: BLOCK * 0.3, kind });
const orb = (x, y, kind = "yellow") => ({ type: "orb", x: x * BLOCK + BLOCK * 0.2, y: y * BLOCK + BLOCK * 0.2, w: BLOCK * 0.6, h: BLOCK * 0.6, kind });
const portal = (x, y, mode, h = 3) => ({ type: "portal", x: x * BLOCK, y: y * BLOCK, w: BLOCK * 0.6, h: h * BLOCK, mode });
const grav = (x, y, flip = true, h = 3) => ({ type: "gravity", x: x * BLOCK, y: y * BLOCK, w: BLOCK * 0.6, h: h * BLOCK, flip });
const finish = (x) => ({ type: "finish", x: x * BLOCK, y: -BLOCK * 8, w: BLOCK * 2, h: BLOCK * 16 });
const coin = (x, y) => ({
  type: "coin",
  x: x * BLOCK + BLOCK * 0.25,
  y: y * BLOCK + BLOCK * 0.25,
  w: BLOCK * 0.5,
  h: BLOCK * 0.5,
  collected: false,
  value: 1,
});

/** Coloca moedas em posições (x,y em blocos). Cada uma vale R$1. */
function placeCoins(objs, spots) {
  for (const [x, y] of spots) objs.push(coin(x, y));
  return objs;
}

function platformRow(fromX, toX, y) {
  const out = [];
  for (let x = fromX; x <= toX; x++) out.push(b(x, y));
  return out;
}

function spikeRow(fromX, toX, y, dir = "up") {
  const out = [];
  for (let x = fromX; x <= toX; x++) out.push(spike(x, y, dir));
  return out;
}

function buildStereoMadness() {
  const objs = [];
  // intro floor
  objs.push(...platformRow(-2, 40, 8));
  objs.push(...spikeRow(12, 13, 7));
  objs.push(...spikeRow(18, 18, 7));
  objs.push(b(22, 7), b(23, 7), b(23, 6));
  objs.push(...spikeRow(26, 27, 7));
  objs.push(pad(29, 8, "yellow"));
  objs.push(...platformRow(32, 55, 8));
  objs.push(...spikeRow(36, 36, 7));
  objs.push(b(39, 7), b(40, 6), b(41, 5));
  objs.push(orb(43, 3, "yellow"));
  objs.push(...spikeRow(45, 47, 7));
  objs.push(b(50, 7), b(51, 7), b(52, 6), b(53, 5));
  objs.push(...platformRow(56, 90, 8));
  objs.push(...spikeRow(60, 61, 7));
  objs.push(pad(64, 8, "pink"));
  objs.push(b(68, 6), b(69, 5), b(70, 4));
  objs.push(...spikeRow(72, 74, 7));
  objs.push(orb(76, 4, "blue"));
  objs.push(b(79, 7), b(80, 6), b(81, 7));
  objs.push(...spikeRow(84, 85, 7));
  // ship section
  objs.push(portal(88, 4, MODES.SHIP, 4));
  objs.push(...platformRow(90, 140, 10));
  objs.push(...platformRow(90, 140, 1));
  objs.push(b(96, 7), b(97, 7), b(102, 4), b(103, 4), b(108, 7), b(109, 7));
  objs.push(spike(112, 9), spike(116, 2, "down"), spike(120, 9), spike(124, 2, "down"));
  objs.push(b(128, 5), b(129, 5), b(130, 6), b(134, 4), b(135, 4));
  // back to cube
  objs.push(portal(138, 4, MODES.CUBE, 4));
  objs.push(...platformRow(140, 180, 8));
  objs.push(...spikeRow(145, 146, 7));
  objs.push(pad(149, 8, "yellow"));
  objs.push(b(152, 6), b(153, 5), b(154, 4), b(155, 5), b(156, 6));
  objs.push(...spikeRow(159, 161, 7));
  objs.push(orb(164, 4, "yellow"));
  objs.push(b(168, 7), b(169, 6), b(170, 5), b(171, 4));
  objs.push(...spikeRow(174, 175, 7));
  objs.push(finish(178));
  placeCoins(objs, [
    [6, 6], [15, 6], [25, 5], [34, 6], [42, 2], [48, 6], [58, 6], [66, 5],
    [75, 3], [83, 6], [100, 5], [110, 5], [122, 5], [132, 5], [144, 6], [163, 3], [172, 6],
  ]);
  return objs;
}

function buildBackOnTrack() {
  const objs = [];
  objs.push(...platformRow(-2, 35, 8));
  objs.push(...spikeRow(10, 11, 7));
  objs.push(b(14, 7), b(15, 6), pad(16, 8, "yellow"));
  objs.push(...spikeRow(20, 22, 7));
  objs.push(orb(24, 4, "yellow"));
  objs.push(b(27, 7), b(28, 6), b(29, 5));
  objs.push(...platformRow(36, 70, 8));
  objs.push(portal(38, 5, MODES.BALL, 3));
  objs.push(...spikeRow(44, 45, 7));
  objs.push(b(48, 3), b(49, 3)); // ceiling contact for ball
  objs.push(...platformRow(36, 70, 2));
  objs.push(spike(52, 3, "down"), spike(56, 7), spike(60, 3, "down"));
  objs.push(portal(66, 5, MODES.CUBE, 3));
  objs.push(...platformRow(70, 110, 8));
  objs.push(...spikeRow(74, 75, 7));
  objs.push(pad(78, 8, "pink"));
  objs.push(b(82, 6), b(83, 5), b(84, 4));
  objs.push(...spikeRow(87, 89, 7));
  objs.push(orb(92, 3, "blue"));
  objs.push(b(96, 7), b(97, 7), b(98, 6));
  objs.push(portal(100, 4, MODES.UFO, 4));
  objs.push(...platformRow(102, 135, 10));
  objs.push(...platformRow(102, 135, 1));
  objs.push(spike(108, 9), b(112, 6), b(113, 6), spike(118, 2, "down"), spike(124, 9), b(128, 5));
  objs.push(portal(132, 4, MODES.CUBE, 4));
  objs.push(...platformRow(134, 165, 8));
  objs.push(...spikeRow(140, 141, 7));
  objs.push(pad(145, 8, "yellow"));
  objs.push(b(149, 6), b(150, 5), b(151, 4), b(152, 5));
  objs.push(...spikeRow(156, 158, 7));
  objs.push(finish(162));
  placeCoins(objs, [
    [5, 6], [16, 5], [26, 5], [42, 6], [54, 5], [70, 6], [80, 5], [94, 4],
    [110, 5], [120, 5], [138, 6], [148, 5], [155, 6],
  ]);
  return objs;
}

function buildPolargeist() {
  const objs = [];
  objs.push(...platformRow(-2, 30, 8));
  objs.push(...spikeRow(9, 9, 7));
  objs.push(b(12, 7), pad(13, 8, "yellow"));
  objs.push(...spikeRow(17, 19, 7));
  objs.push(orb(21, 4, "yellow"));
  objs.push(...platformRow(30, 55, 8));
  objs.push(portal(32, 4, MODES.WAVE, 4));
  objs.push(...platformRow(34, 80, 10));
  objs.push(...platformRow(34, 80, 1));
  // wave corridors
  for (let i = 0; i < 8; i++) {
    const x = 38 + i * 5;
    objs.push(b(x, 6 + (i % 2)), b(x + 1, 6 + (i % 2)));
    objs.push(b(x, 3 - (i % 2)), b(x + 1, 3 - (i % 2)));
  }
  objs.push(portal(78, 4, MODES.CUBE, 4));
  objs.push(...platformRow(80, 120, 8));
  objs.push(...spikeRow(85, 86, 7));
  objs.push(pad(90, 8, "pink"));
  objs.push(b(94, 6), b(95, 5), b(96, 4), b(97, 3));
  objs.push(...spikeRow(100, 102, 7));
  objs.push(orb(105, 3, "yellow"));
  objs.push(grav(108, 4, true, 4));
  objs.push(...platformRow(110, 130, 2));
  objs.push(spike(114, 3, "down"), spike(118, 3, "down"));
  objs.push(grav(122, 4, true, 4));
  objs.push(...platformRow(124, 155, 8));
  objs.push(...spikeRow(130, 131, 7));
  objs.push(pad(135, 8, "yellow"));
  objs.push(b(140, 7), b(141, 6), b(142, 5), b(143, 4));
  objs.push(...spikeRow(147, 149, 7));
  objs.push(finish(152));
  placeCoins(objs, [
    [5, 6], [14, 5], [23, 5], [40, 5], [50, 5], [62, 5], [84, 6], [98, 5],
    [106, 4], [126, 6], [138, 5], [146, 6],
  ]);
  return objs;
}

function buildDryOut() {
  const objs = [];
  objs.push(...platformRow(-2, 25, 8));
  objs.push(...spikeRow(8, 10, 7));
  objs.push(pad(12, 8, "yellow"));
  objs.push(b(15, 6), b(16, 5), orb(18, 3, "yellow"));
  objs.push(...platformRow(25, 50, 8));
  objs.push(portal(28, 4, MODES.SHIP, 4));
  objs.push(...platformRow(30, 70, 10));
  objs.push(...platformRow(30, 70, 1));
  objs.push(b(35, 6), b(36, 6), b(42, 4), b(43, 4), spike(48, 9), spike(52, 2, "down"), b(56, 6), b(60, 4));
  objs.push(portal(66, 4, MODES.BALL, 4));
  objs.push(...platformRow(68, 95, 8));
  objs.push(...platformRow(68, 95, 2));
  objs.push(spike(74, 7), spike(78, 3, "down"), spike(82, 7), spike(86, 3, "down"));
  objs.push(portal(90, 4, MODES.UFO, 4));
  objs.push(...platformRow(92, 120, 10));
  objs.push(...platformRow(92, 120, 1));
  objs.push(spike(98, 9), b(102, 5), spike(108, 2, "down"), b(112, 6), spike(116, 9));
  objs.push(portal(118, 4, MODES.WAVE, 4));
  for (let i = 0; i < 6; i++) {
    const x = 122 + i * 5;
    objs.push(b(x, 5), b(x + 1, 5), b(x, 7), b(x + 1, 7));
  }
  objs.push(portal(152, 4, MODES.CUBE, 4));
  objs.push(...platformRow(154, 185, 8));
  objs.push(...spikeRow(160, 162, 7));
  objs.push(pad(166, 8, "pink"));
  objs.push(b(170, 6), b(171, 5), b(172, 4));
  objs.push(...spikeRow(176, 178, 7));
  objs.push(finish(182));
  placeCoins(objs, [
    [4, 6], [14, 5], [22, 6], [38, 5], [50, 5], [64, 5], [80, 5], [104, 5],
    [114, 5], [130, 5], [145, 5], [164, 5], [174, 6],
  ]);
  return objs;
}

function buildBaseAfterBase() {
  const objs = [];
  objs.push(...platformRow(-2, 20, 8));
  objs.push(...spikeRow(7, 8, 7));
  objs.push(orb(11, 5, "yellow"));
  objs.push(b(14, 7), b(15, 6), b(16, 5));
  objs.push(...platformRow(20, 45, 8));
  objs.push(portal(22, 4, MODES.SHIP, 4));
  objs.push(...platformRow(24, 55, 10));
  objs.push(...platformRow(24, 55, 1));
  for (let i = 0; i < 5; i++) {
    objs.push(b(28 + i * 5, 6 - (i % 2)), b(29 + i * 5, 6 - (i % 2)));
  }
  objs.push(portal(52, 4, MODES.CUBE, 4));
  objs.push(...platformRow(54, 85, 8));
  objs.push(...spikeRow(58, 60, 7));
  objs.push(pad(64, 8, "yellow"));
  objs.push(b(68, 6), b(69, 5), b(70, 4), b(71, 5), b(72, 6));
  objs.push(...spikeRow(76, 78, 7));
  objs.push(portal(80, 4, MODES.BALL, 4));
  objs.push(...platformRow(82, 110, 8));
  objs.push(...platformRow(82, 110, 2));
  objs.push(spike(88, 7), spike(92, 3, "down"), pad(96, 8, "pink"), spike(100, 7));
  objs.push(portal(106, 4, MODES.WAVE, 4));
  objs.push(...platformRow(108, 140, 10));
  objs.push(...platformRow(108, 140, 1));
  for (let i = 0; i < 7; i++) {
    const x = 112 + i * 4;
    objs.push(b(x, 4 + (i % 3)), b(x + 1, 4 + (i % 3)));
  }
  objs.push(portal(140, 4, MODES.CUBE, 4));
  objs.push(...platformRow(142, 170, 8));
  objs.push(...spikeRow(148, 150, 7));
  objs.push(orb(154, 4, "blue"));
  objs.push(b(158, 7), b(159, 6), b(160, 5));
  objs.push(...spikeRow(164, 165, 7));
  objs.push(finish(168));
  placeCoins(objs, [
    [4, 6], [12, 4], [26, 5], [40, 5], [56, 6], [72, 5], [90, 5], [104, 5],
    [120, 5], [136, 5], [152, 5], [162, 6],
  ]);
  return objs;
}

function buildCantLetGo() {
  const objs = [];
  objs.push(...platformRow(-2, 18, 8));
  objs.push(...spikeRow(6, 7, 7));
  objs.push(pad(10, 8, "yellow"));
  objs.push(...spikeRow(14, 15, 7));
  objs.push(...platformRow(18, 40, 8));
  objs.push(portal(20, 4, MODES.UFO, 4));
  objs.push(...platformRow(22, 50, 10));
  objs.push(...platformRow(22, 50, 1));
  objs.push(spike(28, 9), b(32, 5), spike(36, 2, "down"), b(40, 6), spike(44, 9));
  objs.push(portal(48, 4, MODES.SHIP, 4));
  objs.push(...platformRow(50, 80, 10));
  objs.push(...platformRow(50, 80, 1));
  for (let i = 0; i < 6; i++) {
    objs.push(b(54 + i * 4, 5 + (i % 2)), spike(56 + i * 4, i % 2 === 0 ? 9 : 2, i % 2 === 0 ? "up" : "down"));
  }
  objs.push(portal(78, 4, MODES.CUBE, 4));
  objs.push(...platformRow(80, 115, 8));
  objs.push(...spikeRow(85, 87, 7));
  objs.push(orb(90, 4, "yellow"));
  objs.push(b(94, 6), b(95, 5), b(96, 4));
  objs.push(grav(100, 4, true, 4));
  objs.push(...platformRow(102, 125, 2));
  objs.push(spike(108, 3, "down"), spike(112, 3, "down"), pad(116, 2, "yellow"));
  objs.push(grav(120, 4, true, 4));
  objs.push(...platformRow(122, 155, 8));
  objs.push(portal(124, 4, MODES.WAVE, 4));
  for (let i = 0; i < 5; i++) {
    objs.push(b(128 + i * 4, 5), b(129 + i * 4, 5), b(128 + i * 4, 7), b(129 + i * 4, 7));
  }
  objs.push(portal(150, 4, MODES.CUBE, 4));
  objs.push(...platformRow(150, 175, 8));
  objs.push(...spikeRow(156, 158, 7));
  objs.push(pad(162, 8, "pink"));
  objs.push(b(166, 6), b(167, 5), b(168, 4));
  objs.push(finish(172));
  placeCoins(objs, [
    [4, 6], [12, 5], [26, 5], [38, 5], [52, 5], [70, 5], [88, 5], [104, 4],
    [118, 4], [140, 5], [160, 5], [168, 5],
  ]);
  return objs;
}

function buildJumper() {
  const objs = [];
  objs.push(...platformRow(-2, 15, 8));
  for (let i = 0; i < 12; i++) {
    const x = 16 + i * 6;
    objs.push(b(x, 8), b(x + 1, 8));
    if (i % 2 === 0) objs.push(spike(x + 2, 7));
    else objs.push(pad(x + 2, 8, i % 4 === 1 ? "pink" : "yellow"));
    if (i % 3 === 0) objs.push(orb(x + 3, 5, "yellow"));
  }
  objs.push(...platformRow(90, 110, 8));
  objs.push(portal(92, 4, MODES.SHIP, 4));
  objs.push(...platformRow(94, 130, 10));
  objs.push(...platformRow(94, 130, 1));
  for (let i = 0; i < 8; i++) {
    objs.push(b(98 + i * 4, 4 + (i % 3)), b(99 + i * 4, 4 + (i % 3)));
  }
  objs.push(portal(128, 4, MODES.CUBE, 4));
  objs.push(...platformRow(130, 160, 8));
  objs.push(...spikeRow(136, 138, 7));
  objs.push(pad(142, 8, "yellow"));
  objs.push(b(146, 6), b(147, 5), b(148, 4), b(149, 5));
  objs.push(...spikeRow(153, 155, 7));
  objs.push(finish(158));
  placeCoins(objs, [
    [6, 6], [20, 5], [32, 5], [44, 5], [56, 5], [68, 5], [80, 5], [100, 5],
    [112, 5], [134, 6], [144, 5], [152, 6],
  ]);
  return objs;
}

function buildTimeMachine() {
  const objs = [];
  objs.push(...platformRow(-2, 20, 8));
  objs.push(...spikeRow(8, 9, 7));
  objs.push(pad(12, 8, "yellow"));
  objs.push(b(16, 6), orb(18, 3, "blue"));
  objs.push(...platformRow(20, 40, 8));
  objs.push(portal(22, 4, MODES.SHIP, 4));
  objs.push(...platformRow(24, 55, 10));
  objs.push(...platformRow(24, 55, 1));
  objs.push(b(30, 6), spike(34, 9), b(38, 4), spike(42, 2, "down"), b(46, 6));
  objs.push(portal(52, 4, MODES.BALL, 4));
  objs.push(...platformRow(54, 75, 8));
  objs.push(...platformRow(54, 75, 2));
  objs.push(spike(58, 7), spike(62, 3, "down"), spike(66, 7), spike(70, 3, "down"));
  objs.push(portal(72, 4, MODES.UFO, 4));
  objs.push(...platformRow(74, 100, 10));
  objs.push(...platformRow(74, 100, 1));
  objs.push(spike(80, 9), b(84, 5), spike(88, 2, "down"), b(92, 6), spike(96, 9));
  objs.push(portal(98, 4, MODES.WAVE, 4));
  objs.push(...platformRow(100, 130, 10));
  objs.push(...platformRow(100, 130, 1));
  for (let i = 0; i < 6; i++) {
    objs.push(b(104 + i * 4, 5 + (i % 2)), b(105 + i * 4, 5 + (i % 2)));
  }
  objs.push(portal(128, 4, MODES.CUBE, 4));
  objs.push(...platformRow(130, 165, 8));
  objs.push(...spikeRow(136, 138, 7));
  objs.push(pad(142, 8, "pink"));
  objs.push(b(146, 6), b(147, 5), b(148, 4));
  objs.push(grav(152, 4, true, 4));
  objs.push(...platformRow(154, 170, 2));
  objs.push(spike(158, 3, "down"), spike(162, 3, "down"));
  objs.push(grav(166, 4, true, 4));
  objs.push(...platformRow(168, 190, 8));
  objs.push(...spikeRow(174, 176, 7));
  objs.push(orb(180, 4, "yellow"));
  objs.push(finish(186));
  placeCoins(objs, [
    [4, 6], [14, 5], [28, 5], [44, 5], [60, 5], [78, 5], [90, 5], [110, 5],
    [134, 6], [148, 5], [164, 4], [178, 5],
  ]);
  return objs;
}

export const LEVELS = [
  {
    id: 0,
    name: "Stereo Madness",
    difficulty: "Fácil",
    stars: 1,
    speed: 1,
    bpm: 142,
    theme: 0,
    length: 180 * BLOCK,
    objects: buildStereoMadness(),
  },
  {
    id: 1,
    name: "Back On Track",
    difficulty: "Fácil",
    stars: 2,
    speed: 1.05,
    bpm: 144,
    theme: 1,
    length: 165 * BLOCK,
    objects: buildBackOnTrack(),
  },
  {
    id: 2,
    name: "Polargeist",
    difficulty: "Normal",
    stars: 3,
    speed: 1.1,
    bpm: 148,
    theme: 2,
    length: 155 * BLOCK,
    objects: buildPolargeist(),
  },
  {
    id: 3,
    name: "Dry Out",
    difficulty: "Normal",
    stars: 4,
    speed: 1.12,
    bpm: 150,
    theme: 3,
    length: 185 * BLOCK,
    objects: buildDryOut(),
  },
  {
    id: 4,
    name: "Base After Base",
    difficulty: "Difícil",
    stars: 5,
    speed: 1.15,
    bpm: 152,
    theme: 4,
    length: 170 * BLOCK,
    objects: buildBaseAfterBase(),
  },
  {
    id: 5,
    name: "Cant Let Go",
    difficulty: "Difícil",
    stars: 6,
    speed: 1.18,
    bpm: 155,
    theme: 0,
    length: 175 * BLOCK,
    objects: buildCantLetGo(),
  },
  {
    id: 6,
    name: "Jumper",
    difficulty: "Harder",
    stars: 7,
    speed: 1.2,
    bpm: 158,
    theme: 1,
    length: 160 * BLOCK,
    objects: buildJumper(),
  },
  {
    id: 7,
    name: "Time Machine",
    difficulty: "Harder",
    stars: 8,
    speed: 1.22,
    bpm: 160,
    theme: 2,
    length: 190 * BLOCK,
    objects: buildTimeMachine(),
  },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}
