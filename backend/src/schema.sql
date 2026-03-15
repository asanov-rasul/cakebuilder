import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import useCakeStore from '../../store/cakeStore';
import styles from './Cake3DViewer.module.css';

/* ── Colour palettes ─────────────────────────────────────────────────────── */
const FILLING_COLORS = {
  'Chocolate': { base: 0x2e1006, mid: 0x5c2210, light: 0x9b5a30 },
  'Vanilla':   { base: 0xf0d878, mid: 0xf5e498, light: 0xfdf5cc },
  'Strawberry':{ base: 0xc0182c, mid: 0xe03050, light: 0xff7090 },
  'Red Velvet':{ base: 0x7a0000, mid: 0x9a0808, light: 0xc01818 },
  default:     { base: 0xb07840, mid: 0xd09a60, light: 0xe8c080 },
};
const CREAM_COLORS = {
  'Buttercream':     { top: 0xfff5dc, side: 0xffeebb, drip: 0xffd980 },
  'Chocolate Cream': { top: 0x2a0e04, side: 0x3d1608, drip: 0x1a0803 },
  'Vanilla Cream':   { top: 0xfffce8, side: 0xfff7c8, drip: 0xffee88 },
  default:           { top: 0xfff5dc, side: 0xffeebb, drip: 0xffd980 },
};

const snoise = (x, y, s = 1) =>
  Math.sin(x * s * 2.1 + 0.5) * Math.cos(y * s * 1.7 + 1.3) * 0.5;

/* ── Heart helpers ───────────────────────────────────────────────────────── */
function makeHeartShape(r) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 128; i++) {
    const t = (i / 128) * Math.PI * 2;
    const x =  r * (16 * Math.sin(t) ** 3) / 16;
    const y =  r * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) / 16;
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

// Returns geometry whose Y-axis range is [0, height].
function makeHeartSolidGeo(r, height) {
  const geo = new THREE.ExtrudeGeometry(makeHeartShape(r), {
    depth: height, bevelEnabled: true,
    bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 3,
  });
  // Shape is in XY, extruded along +Z.
  // After rotateX(-PI/2): old +Z → new +Y  ✓
  geo.rotateX(-Math.PI / 2);
  return geo; // Y ∈ [0, height]
}

// Flat heart cap (zero thickness, lies at Y=0).
function makeHeartCapGeo(r) {
  const geo = new THREE.ShapeGeometry(makeHeartShape(r), 32);
  geo.rotateX(-Math.PI / 2); // lies flat in XZ
  return geo;
}

/* ── Decorations – all positions are ABSOLUTE inside the scene group ──────
   surfY = the Y-coordinate of the cake's top surface inside the group.      */

function addStrawberry(group, x, surfY, z) {
  // LatheGeometry: v[0] = bottom tip (y=0), v[last] = top centre (y=0.122)
  // We place body so its tip is at surfY.
  const pts = [
    new THREE.Vector2(0.000, 0.000),
    new THREE.Vector2(0.028, 0.014),
    new THREE.Vector2(0.048, 0.038),
    new THREE.Vector2(0.052, 0.062),
    new THREE.Vector2(0.046, 0.088),
    new THREE.Vector2(0.032, 0.108),
    new THREE.Vector2(0.014, 0.120),
    new THREE.Vector2(0.000, 0.124),
  ];
  const H = 0.124; // total height of the lathe
  const bodyGeo = new THREE.LatheGeometry(pts, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcc1122, roughness: 0.45, metalness: 0.05 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(x, surfY, z); // tip (y=0 local) sits on surface
  body.rotation.y = Math.random() * Math.PI * 2;
  body.userData.isCake = true;
  group.add(body);

  // Seeds — placed relative to body position
  for (let s = 0; s < 14; s++) {
    const phi   = 0.2 + Math.random() * 1.0;
    const theta = Math.random() * Math.PI * 2;
    const R = 0.048 * Math.sin(phi);
    const seedGeo = new THREE.SphereGeometry(0.005, 4, 4);
    const seedMat = new THREE.MeshStandardMaterial({ color: 0xffee88, roughness: 0.8 });
    const seed = new THREE.Mesh(seedGeo, seedMat);
    seed.position.set(
      x + R * Math.cos(theta),
      surfY + 0.052 * (1 - Math.cos(phi)),   // climbs up the body
      z + R * Math.sin(theta)
    );
    seed.userData.isCake = true;
    group.add(seed);
  }

  // Leaves at the very top of the strawberry body
  for (let l = 0; l < 5; l++) {
    const la = (l / 5) * Math.PI * 2;
    const leafGeo = new THREE.PlaneGeometry(0.020, 0.034);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.8, side: THREE.DoubleSide });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(
      x + Math.cos(la) * 0.016,
      surfY + H + 0.004,   // right at the top of the berry
      z + Math.sin(la) * 0.016
    );
    leaf.rotation.set(Math.PI / 5, la, 0);
    leaf.userData.isCake = true;
    group.add(leaf);
  }
}

function addOrangeSlice(group, x, surfY, z) {
  const sliceH = 0.020;
  // Outer rind — bottom face at surfY
  const outerGeo = new THREE.CylinderGeometry(0.065, 0.065, sliceH, 32);
  const outer = new THREE.Mesh(outerGeo,
    new THREE.MeshStandardMaterial({ color: 0xff7700, roughness: 0.5 }));
  outer.position.set(x, surfY + sliceH / 2, z);
  outer.userData.isCake = true; group.add(outer);

  // Flesh
  const flesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.054, 0.054, sliceH + 0.002, 32),
    new THREE.MeshStandardMaterial({ color: 0xffaa22, roughness: 0.4 }));
  flesh.position.set(x, surfY + sliceH / 2 + 0.001, z);
  flesh.userData.isCake = true; group.add(flesh);

  // Segment lines
  for (let s = 0; s < 8; s++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.003, sliceH + 0.004, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xffcc44, roughness: 0.6 }));
    line.position.set(x, surfY + sliceH / 2 + 0.002, z);
    line.rotation.y = (s / 8) * Math.PI * 2;
    line.userData.isCake = true; group.add(line);
  }
}

function addBlueberry(group, x, surfY, z) {
  const R = 0.027;
  const geo = new THREE.SphereGeometry(R, 12, 12);
  geo.scale(1, 0.84, 1);
  const berry = new THREE.Mesh(geo,
    new THREE.MeshStandardMaterial({ color: 0x3a1a6e, roughness: 0.22, metalness: 0.18 }));
  // Bottom of squashed sphere is at -R*0.84; shift up so bottom = surfY
  berry.position.set(x, surfY + R * 0.84, z);
  berry.userData.isCake = true; group.add(berry);

  // Crown dimple — at the very top of the berry
  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.012, 0.006, 6),
    new THREE.MeshStandardMaterial({ color: 0x1a0a3a, roughness: 0.8 }));
  crown.position.set(x, surfY + R * 0.84 * 2 - 0.003, z);
  crown.userData.isCake = true; group.add(crown);
}

function addSprinkles(group, surfY, radius, count = 80) {
  const colors = [0xff3366, 0x33aaff, 0xffcc00, 0x66dd44, 0xff8800, 0xcc44ff, 0xff66aa, 0x00ccee];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rr    = Math.random() * radius * 0.88;
    const sp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.030, 6),
      new THREE.MeshStandardMaterial({ color: colors[~~(Math.random() * colors.length)], roughness: 0.5, metalness: 0.2 }));
    sp.rotation.set(
      Math.PI / 2 + (Math.random() - 0.5) * 0.4, // lie mostly flat
      Math.random() * Math.PI * 2,
      0
    );
    sp.position.set(Math.cos(angle) * rr, surfY + 0.010, Math.sin(angle) * rr);
    sp.userData.isCake = true; group.add(sp);
  }
}

function addChocolateShards(group, surfY, radius, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const rr = (0.2 + Math.random() * 0.55) * (radius - 0.05);
    const w  = 0.055 + Math.random() * 0.055;
    const h  = 0.080 + Math.random() * 0.090;
    const geo = new THREE.PlaneGeometry(w, h);
    const pos = geo.attributes.position;
    pos.setX(0, pos.getX(0) + (Math.random() - 0.5) * 0.025);
    pos.setX(2, pos.getX(2) + (Math.random() - 0.5) * 0.025);
    pos.needsUpdate = true;
    const shard = new THREE.Mesh(geo,
      new THREE.MeshStandardMaterial({
        color: i % 3 === 0 ? 0xfff4e0 : 0x2d0f04,
        roughness: 0.18, metalness: 0.18, side: THREE.DoubleSide }));
    // Bottom edge of the plane (local y = -h/2) sits at surfY
    shard.position.set(
      Math.cos(angle) * rr,
      surfY + h / 2 + 0.006,  // local centre = surfY + h/2
      Math.sin(angle) * rr
    );
    shard.rotation.set(
      (Math.random() - 0.5) * 0.3,
      angle + Math.PI / 2,
      (Math.random() - 0.5) * 0.25
    );
    shard.userData.isCake = true; group.add(shard);
  }
}

function addMarzipanFlower(group, x, surfY, z, color) {
  for (let p = 0; p < 5; p++) {
    const a   = (p / 5) * Math.PI * 2;
    const geo = new THREE.SphereGeometry(0.022, 8, 8);
    geo.scale(1, 0.44, 1.5);
    const petal = new THREE.Mesh(geo,
      new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    petal.position.set(x + Math.cos(a) * 0.036, surfY + 0.010, z + Math.sin(a) * 0.036);
    petal.rotation.y = a;
    petal.userData.isCake = true; group.add(petal);
  }
  const centre = new THREE.Mesh(
    new THREE.SphereGeometry(0.019, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffee44, roughness: 0.5 }));
  centre.position.set(x, surfY + 0.017, z);
  centre.userData.isCake = true; group.add(centre);
}

/* ── Text texture ────────────────────────────────────────────────────────── */
function makeTextTexture(text) {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(160,60,40,0.28)';
  ctx.lineWidth = 7;
  ctx.setLineDash([15, 10]);
  ctx.beginPath();
  ctx.ellipse(S/2, S/2, S/2 - 18, S/2 - 18, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  const fs = text.length > 14 ? 50 : text.length > 9 ? 62 : 76;
  ctx.font = `bold italic ${fs}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(100,30,10,0.3)';
  ctx.shadowBlur = 10; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
  const g = ctx.createLinearGradient(0, S*0.38, 0, S*0.62);
  g.addColorStop(0, '#c0380a'); g.addColorStop(0.5, '#e04012'); g.addColorStop(1, '#9a2005');
  ctx.fillStyle = g;
  const words = text.split(' ');
  if (words.length > 3 || text.length > 15) {
    const h = Math.ceil(words.length / 2);
    ctx.fillText(words.slice(0, h).join(' '), S/2, S/2 - fs * 0.58);
    ctx.fillText(words.slice(h).join(' '),    S/2, S/2 + fs * 0.58);
  } else {
    ctx.fillText(text, S/2, S/2);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ── Main cake builder ───────────────────────────────────────────────────── */
function buildCake(scene, state) {
  // Remove previous
  const toRemove = [];
  scene.traverse(o => { if (o.userData.isCake) toRemove.push(o); });
  toRemove.forEach(o => {
    o.geometry?.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m?.map?.dispose(); m?.dispose(); });
    scene.remove(o);
  });

  const { shape, size, filling, cream, decorations, cakeText } = state;

  const kg = size ? parseFloat(size.weight_kg) : 1;

  const sn = (shape?.slug || shape?.name || 'round').toLowerCase();
  const isSquare = sn === 'square';
  const isHeart  = false;

  const radius = isSquare ? 0.30 + kg * 0.055 : 0.33 + kg * 0.11;
  const layerH = 0.16 + kg * 0.024;
  const layers = Math.round(1 + kg * 0.8);
  const gapH   = 0.036;

  const fC = FILLING_COLORS[Object.keys(FILLING_COLORS).find(k => filling?.name?.includes(k)) || 'default'];
  const cC = CREAM_COLORS [Object.keys(CREAM_COLORS) .find(k => cream?.name?.includes(k))   || 'default'];

  /* totalH = height of the bare sponge stack.
     All geometry inside `group` is built with Y = 0 at the GROUP'S base
     and Y = totalH at the top surface before cream is added.
     group.position.y will be set to -totalH/2 so the cake is centred.     */
  const totalH = layers * layerH + (layers - 1) * gapH;

  const group = new THREE.Group();
  group.userData.isCake = true;

  /* ── Sponge + filling stripes ──────────────────────────────────────────── */
  for (let i = 0; i < layers; i++) {
    const layerBase = i * (layerH + gapH);   // absolute Y of layer bottom in group

    let geo;
    if (isHeart) {
      geo = makeHeartSolidGeo(radius, layerH); // Y ∈ [0, layerH]
    } else if (isSquare) {
      geo = new THREE.BoxGeometry(radius * 2, layerH, radius * 2, 4, 2, 4);
      // box is centred at Y=0; translate so base = 0
      geo.translate(0, layerH / 2, 0);
    } else {
      geo = new THREE.CylinderGeometry(radius, radius * 1.02, layerH, 64, 4);
      // cylinder centred at Y=0; translate
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const vx = pos.getX(v), vy = pos.getY(v), vz = pos.getZ(v);
        if (vy > layerH * 0.25) {
          const a = Math.atan2(vz, vx), r = Math.hypot(vx, vz);
          if (r > 0) { const n = snoise(a, i, 3) * 0.011; pos.setX(v, vx/r*(r+n)); pos.setZ(v, vz/r*(r+n)); }
        }
      }
      pos.needsUpdate = true; geo.computeVertexNormals();
      geo.translate(0, layerH / 2, 0); // base now at Y=0
    }

    const sponge = new THREE.Mesh(geo,
      new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? fC.mid : fC.base, roughness: 0.88 }));
    sponge.position.y = layerBase; // geo base at Y=0 → mesh base at layerBase ✓
    sponge.castShadow = true; sponge.receiveShadow = true;
    sponge.userData.isCake = true; group.add(sponge);

    // Filling stripe between this layer and the next
    if (i < layers - 1) {
      const stripeBase = layerBase + layerH; // Y of stripe bottom in group
      let fillGeo;
      if (isHeart) {
        // thin extruded heart for gap
        fillGeo = makeHeartSolidGeo(radius * 0.97, gapH);
      } else if (isSquare) {
        fillGeo = new THREE.BoxGeometry(radius * 1.96, gapH, radius * 1.96);
        fillGeo.translate(0, gapH / 2, 0);
      } else {
        fillGeo = new THREE.CylinderGeometry(radius * 0.98, radius * 0.98, gapH, 64);
        fillGeo.translate(0, gapH / 2, 0);
      }
      const fm = new THREE.Mesh(fillGeo,
        new THREE.MeshStandardMaterial({ color: fC.light, roughness: 0.55 }));
      fm.position.y = stripeBase;
      fm.userData.isCake = true; group.add(fm);
    }
  }

  /* surfaceY = top of sponge stack (= totalH inside group) */
  const surfaceY = totalH;

  /* ── Cream ─────────────────────────────────────────────────────────────── */
  const creamTopY = cream ? surfaceY + 0.012 : surfaceY; // Y of cream surface

  if (cream) {
    const sideMat = new THREE.MeshStandardMaterial({ color: cC.side, roughness: 0.52 });
    const topMat  = new THREE.MeshStandardMaterial({ color: cC.top,  roughness: 0.42, metalness: 0.04 });

    if (isHeart) {
      // Side shell only (open ends) — ExtrudeGeometry without bevel
      const shellShape = makeHeartShape(radius * 1.022);
      const shellGeo = new THREE.ExtrudeGeometry(shellShape, {
        depth: totalH, bevelEnabled: false,
      });
      shellGeo.rotateX(-Math.PI / 2);
      const shell = new THREE.Mesh(shellGeo, sideMat);
      shell.position.y = 0; shell.userData.isCake = true; group.add(shell);

      // Top cap — flat ShapeGeometry placed at surfaceY with organic bumps
      const capGeo = makeHeartCapGeo(radius * 1.022);
      const cp = capGeo.attributes.position;
      for (let v = 0; v < cp.count; v++)
        cp.setY(v, snoise(cp.getX(v), cp.getZ(v), 5) * 0.012 + Math.random() * 0.004);
      cp.needsUpdate = true; capGeo.computeVertexNormals();
      const cap = new THREE.Mesh(capGeo, topMat);
      cap.position.y = surfaceY + 0.004;
      cap.userData.isCake = true; group.add(cap);

    } else if (isSquare) {
      const pw = radius * 2 + 0.028;
      [[0, radius+0.014, 0], [0, -(radius+0.014), Math.PI],
       [radius+0.014, 0, Math.PI/2], [-(radius+0.014), 0, -Math.PI/2]
      ].forEach(([px, pz, ry]) => {
        const pg = new THREE.PlaneGeometry(pw, totalH, 2, 8);
        const pos = pg.attributes.position;
        for (let v = 0; v < pos.count; v++)
          pos.setZ(v, snoise(pos.getX(v), pos.getY(v), 8) * 0.006);
        pos.needsUpdate = true; pg.computeVertexNormals();
        const pm = new THREE.Mesh(pg, sideMat.clone());
        pm.position.set(px, totalH / 2, pz); pm.rotation.y = ry;
        pm.userData.isCake = true; group.add(pm);
      });
      const tg = new THREE.PlaneGeometry(radius*2+0.024, radius*2+0.024, 16, 16);
      const tp = tg.attributes.position;
      for (let v = 0; v < tp.count; v++)
        tp.setZ(v, snoise(tp.getX(v), tp.getY(v), 6) * 0.014 + Math.random() * 0.004);
      tp.needsUpdate = true; tg.computeVertexNormals();
      const top = new THREE.Mesh(tg, topMat);
      top.rotation.x = -Math.PI/2; top.position.y = surfaceY + 0.010;
      top.userData.isCake = true; group.add(top);

    } else {
      // Round side
      const sg = new THREE.CylinderGeometry(radius+0.013, radius+0.019, totalH, 64, 6, true);
      const sp = sg.attributes.position;
      for (let v = 0; v < sp.count; v++) {
        const vx = sp.getX(v), vy = sp.getY(v), vz = sp.getZ(v);
        const a = Math.atan2(vz, vx), r = Math.hypot(vx, vz);
        if (r > 0) { const w = snoise(a*3, vy*5) * 0.010; sp.setX(v, vx/r*(r+w)); sp.setZ(v, vz/r*(r+w)); }
      }
      sp.needsUpdate = true; sg.computeVertexNormals();
      const side = new THREE.Mesh(sg, sideMat);
      side.position.y = totalH / 2;                 // cylinder centred at totalH/2 ✓
      side.userData.isCake = true; group.add(side);

      const tg = new THREE.CircleGeometry(radius+0.013, 64);
      const tp = tg.attributes.position;
      for (let v = 0; v < tp.count; v++)
        tp.setZ(v, tp.getZ(v) + snoise(tp.getX(v), tp.getY(v), 6) * 0.014 + Math.random() * 0.004);
      tp.needsUpdate = true; tg.computeVertexNormals();
      const top = new THREE.Mesh(tg, topMat);
      top.rotation.x = -Math.PI/2; top.position.y = surfaceY + 0.008;
      top.userData.isCake = true; group.add(top);
    }

    /* Drips — hang from the top surface down */
    const dripMat   = new THREE.MeshStandardMaterial({ color: cC.drip, roughness: 0.38, metalness: 0.04 });
    const dripCount = isHeart ? 14 : 12;
    for (let d = 0; d < dripCount; d++) {
      let dx, dz;
      if (isHeart) {
        const t = (d / dripCount) * Math.PI * 2;
        // Use same formula as heart shape but at the outer cream edge
        const hr = radius * 1.018;
        dx = hr * (16 * Math.sin(t)**3) / 16;
        dz = hr * (13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t)) / 16;
      } else {
        const a = (d / dripCount) * Math.PI * 2 + (Math.random()-.5)*.3;
        const dr = isSquare ? radius+0.007 : radius+0.010;
        dx = Math.cos(a)*dr; dz = Math.sin(a)*dr;
      }
      const dH = 0.05 + Math.random() * 0.09;
      // Drip top at surfaceY, drip centre at surfaceY - dH/2
      const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.007, dH, 8), dripMat);
      drip.position.set(dx, surfaceY - dH / 2, dz);
      drip.userData.isCake = true; group.add(drip);

      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), dripMat);
      ball.position.set(dx, surfaceY - dH - 0.010, dz);
      ball.userData.isCake = true; group.add(ball);
    }
  }

  /* ── Decorations ─────────────────────────────────────────────────────────
     decoSurfY = the Y where decorations should "sit" (top of cream or top of sponge) */
  const decoSurfY = creamTopY;

  if (decorations && decorations.length > 0) {
    decorations.forEach(({ name = '' }) => {
      if (name.includes('Fruit') || name.includes('Fresh')) {
        for (let i = 0; i < 5; i++) {
          const a = (i/5)*Math.PI*2 + Math.random()*.3, rr = (.25+Math.random()*.55)*(radius-.06);
          addStrawberry(group, Math.cos(a)*rr, decoSurfY, Math.sin(a)*rr);
        }
        for (let i = 0; i < 2; i++) {
          const a = Math.random()*Math.PI*2, rr = .1+Math.random()*(radius-.13);
          addOrangeSlice(group, Math.cos(a)*rr, decoSurfY, Math.sin(a)*rr);
        }
      } else if (name.includes('Berr')) {
        for (let i = 0; i < 16; i++) {
          const a = Math.random()*Math.PI*2, rr = Math.random()*(radius-.05);
          addBlueberry(group, Math.cos(a)*rr, decoSurfY, Math.sin(a)*rr);
        }
        for (let i = 0; i < 3; i++) {
          const a = Math.random()*Math.PI*2, rr = .08+Math.random()*(radius-.13);
          addStrawberry(group, Math.cos(a)*rr, decoSurfY, Math.sin(a)*rr);
        }
      } else if (name.includes('Chocolate')) {
        addChocolateShards(group, decoSurfY, radius, 9);
        for (let i = 0; i < 10; i++) {
          const a = Math.random()*Math.PI*2, rr = Math.random()*(radius-.04), R = 0.020;
          const ball = new THREE.Mesh(new THREE.SphereGeometry(R,8,8),
            new THREE.MeshStandardMaterial({ color:0x2a0e04, roughness:.28, metalness:.22 }));
          ball.position.set(Math.cos(a)*rr, decoSurfY + R, Math.sin(a)*rr);
          ball.userData.isCake = true; group.add(ball);
        }
      } else if (name.includes('Figure') || name.includes('Custom')) {
        const fc = [0xff6b9d, 0xffd166, 0x06d6a0, 0x118ab2];
        for (let i = 0; i < 4; i++) {
          const a = (i/4)*Math.PI*2+.4, rr = (radius-.1)*.62;
          addMarzipanFlower(group, Math.cos(a)*rr, decoSurfY, Math.sin(a)*rr, fc[i]);
        }
        addSprinkles(group, decoSurfY, radius, 50);
      } else {
        addSprinkles(group, decoSurfY, radius, 70);
      }
    });
  }

  /* ── Candles ─────────────────────────────────────────────────────────────
     Candle base sits at decoSurfY.  */
  if (size) {
    const candleColors = [0xff4455, 0x44aaff, 0xffaa00, 0x88ee44, 0xff88dd];
    const candleCount  = Math.min(layers + 1, 5);
    for (let c = 0; c < candleCount; c++) {
      const a  = (c / candleCount) * Math.PI * 2;
      const cr = radius * 0.46;
      const cx = Math.cos(a)*cr, cz = Math.sin(a)*cr;
      const cH = 0.12 + (c % 3) * 0.022;

      // Candle body: base at decoSurfY, top at decoSurfY+cH
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, cH, 12),
        new THREE.MeshStandardMaterial({ color: candleColors[c % 5], roughness: 0.55 }));
      candle.position.set(cx, decoSurfY + cH / 2, cz); // cylinder centred → base at decoSurfY ✓
      candle.userData.isCake = true; group.add(candle);

      // Wick: base at top of candle
      const wickH = 0.020;
      const wick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, wickH, 4),
        new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.9 }));
      wick.position.set(cx, decoSurfY + cH + wickH / 2, cz);
      wick.userData.isCake = true; group.add(wick);

      // Flame: bottom at top of wick
      const flameBottom = decoSurfY + cH + wickH;
      const flamePts = [
        new THREE.Vector2(0, 0), new THREE.Vector2(0.012, 0.016),
        new THREE.Vector2(0.015, 0.034), new THREE.Vector2(0.009, 0.053),
        new THREE.Vector2(0, 0.066),
      ];
      const flame = new THREE.Mesh(
        new THREE.LatheGeometry(flamePts, 10),
        new THREE.MeshStandardMaterial({ color:0xffdd00, emissive:0xff5500, emissiveIntensity:0.9,
          roughness:0.1, transparent:true, opacity:0.9 }));
      // LatheGeometry starts at Y=0 (bottom), so position = flameBottom
      flame.position.set(cx, flameBottom, cz);
      flame.userData.isCake = true; flame.userData.isFlame = true; group.add(flame);

      const ptLight = new THREE.PointLight(0xff8833, 0.30, 0.65);
      ptLight.position.set(cx, flameBottom + 0.05, cz);
      ptLight.userData.isCake = true; group.add(ptLight);
    }
  }

  /* ── Text ────────────────────────────────────────────────────────────────
     Rendered as a flat plane just above the cream surface.               */
  if (cakeText && cakeText.trim()) {
    const tr  = radius * (isHeart ? 0.70 : 0.84);
    const tGeo = isSquare
      ? new THREE.PlaneGeometry(tr*1.9, tr*1.9)
      : isHeart
        ? new THREE.PlaneGeometry(tr*1.85, tr*1.85)
        : new THREE.CircleGeometry(tr, 64);
    const tMat = new THREE.MeshStandardMaterial({
      map: makeTextTexture(cakeText.trim()),
      transparent: true, roughness: 0.6, depthWrite: false,
    });
    const tm = new THREE.Mesh(tGeo, tMat);
    tm.rotation.x  = -Math.PI / 2;
    tm.position.y  = creamTopY + 0.018; // float just above cream
    tm.renderOrder = 2;
    tm.userData.isCake = true; group.add(tm);
  }

  /* Centre group so cake mid-point sits at world Y=0 */
  // Cake bottom at Y=0 (plate surface), top at Y=totalH
  group.position.y = 0;
  scene.add(group);
  return { totalH, radius, isSquare };
}

/* ── Plate ───────────────────────────────────────────────────────────────── */
function buildPlate(scene, radius, isSquare) {
  const old = [];
  scene.traverse(o => { if (o.userData.isPlate) old.push(o); });
  old.forEach(o => { o.geometry?.dispose(); o.material?.dispose(); scene.remove(o); });

  const r = isSquare ? radius * 1.52 : radius + 0.12;

  // Plate sits with its TOP surface at Y=0 (where cake bottom sits)
  const plateH = 0.028;
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.5, metalness: 0.0 });

  // Top disc at Y=0
  const topDisc = new THREE.Mesh(new THREE.CircleGeometry(r, 72), plateMat);
  topDisc.rotation.x = -Math.PI / 2;
  topDisc.position.y = 0;
  topDisc.receiveShadow = true; topDisc.userData.isPlate = true; scene.add(topDisc);

  // Side band — open cylinder, top at Y=0, bottom at Y=-plateH
  const sideBand = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r * 0.93, plateH, 72, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.55, metalness: 0.0, side: THREE.FrontSide }));
  sideBand.position.y = -plateH / 2;
  sideBand.userData.isPlate = true; scene.add(sideBand);

  // Rim ring right at plate top edge
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(r - 0.01, 0.010, 8, 72),
    new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.5, metalness: 0.0 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0;
  rim.userData.isPlate = true; scene.add(rim);
}

/* ── React component ─────────────────────────────────────────────────────── */
export default function Cake3DViewer() {
  const canvasRef   = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef    = useRef(null);
  const cameraRef   = useRef(null);
  const frameRef    = useRef(null);
  const isDragging  = useRef(false);
  const lastX       = useRef(0);
  const targetRot   = useRef(0);
  const currentRot  = useRef(0);

  const { shape, size, filling, cream, decorations, cakeText } = useCakeStore();

  useEffect(() => {
    if (!sceneRef.current) return;
    const { radius, isSquare } = buildCake(sceneRef.current, { shape, size, filling, cream, decorations, cakeText });
    buildPlate(sceneRef.current, radius, isSquare);
  }, [shape, size, filling, cream, decorations, cakeText]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.clientWidth || 400, H = canvas.clientHeight || 340;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(W, H, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, W/H, 0.01, 100);
    camera.position.set(0, 0.8, 2.4);
    camera.lookAt(0, 0.3, 0);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0xfff5e0, 0.65));
    const key = new THREE.DirectionalLight(0xfff8ee, 2.0);
    key.position.set(2.5, 4, 2.5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.1; key.shadow.camera.far = 14;
    key.shadow.camera.left = -2.5; key.shadow.camera.right = 2.5;
    key.shadow.camera.top  =  2.5; key.shadow.camera.bottom = -2.5;
    key.shadow.bias = -0.001; scene.add(key);
    const rimL = new THREE.DirectionalLight(0xc8e0ff, 0.75);
    rimL.position.set(-2, 2, -2); scene.add(rimL);
    const fill = new THREE.PointLight(0xffe8cc, 0.28, 5);
    fill.position.set(0, -1.2, 0); scene.add(fill);

    const { radius, isSquare } = buildCake(scene, { shape:null, size:null, filling:null, cream:null, decorations:[], cakeText:'' });
    buildPlate(scene, radius, isSquare);



    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.016;
      currentRot.current += (targetRot.current - currentRot.current) * 0.055;
      if (!isDragging.current) targetRot.current += 0.004;

      scene.traverse(obj => {
        if (obj.userData.isFlame) {
          obj.scale.x = 1 + Math.sin(t * 8.5 + obj.position.x * 12) * 0.13;
          obj.scale.z = 1 + Math.cos(t * 7.2 + obj.position.z * 11) * 0.11;
          obj.scale.y = 1 + Math.sin(t * 6.3) * 0.07;
          if (obj.material) obj.material.emissiveIntensity = 0.75 + Math.sin(t * 10) * 0.18;
        }
        if (obj.userData.isCake && obj.parent === scene)
          obj.rotation.y = currentRot.current;
      });

      camera.position.y = 0.8 + Math.sin(t * 0.35) * 0.018;
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w/h; camera.updateProjectionMatrix();
    });
    ro.observe(canvas);

    const onDown = e => { isDragging.current = true; lastX.current = e.clientX ?? e.touches?.[0]?.clientX; };
    const onMove = e => {
      if (!isDragging.current) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      targetRot.current += (x - lastX.current) * 0.009; lastX.current = x;
    };
    const onUp = () => { isDragging.current = false; };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: true });
    canvas.addEventListener('touchmove', onMove,  { passive: true });
    canvas.addEventListener('touchend',  onUp);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
      renderer.dispose();
    };
  }, []);

  return (
    <div className={styles.viewer}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.hint}>Drag to rotate</div>
    </div>
  );
}
