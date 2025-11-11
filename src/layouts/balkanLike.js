// src/layouts/balkanLike.js
import * as d3 from "d3";

/**
 * Build a d3.hierarchy from flat rows: {id, parentId, ...}
 * If multiple roots, creates a virtual root "__virtual_root__".
 */
export function buildHierarchy(rows) {
  const byId = new Map();
  rows.forEach(r => byId.set(String(r.id), { ...r, children: [] }));

  const roots = [];
  for (const r of rows) {
    const id = String(r.id);
    const pid = r.parentId == null ? null : String(r.parentId);
    const me = byId.get(id);
    if (pid && byId.has(pid)) {
      byId.get(pid).children.push(me);
    } else {
      roots.push(me);
    }
  }

  let rootData;
  if (roots.length === 1) {
    rootData = roots[0];
  } else {
    // virtual root so d3.tree works with multiple top nodes
    rootData = { id: "__virtual_root__", children: roots, _virtual: true };
  }
  return d3.hierarchy(rootData, d => d.children || []);
}

/**
 * Compute size/position (X,Y) for each node according to a "Balkan-like" preset.
 * Mutates nodes: node.X, node.Y (top-left corner for our foreignObject).
 *
 * layoutKey: one of
 *  "normal","mixed","tree","treeLeft","treeLeftOffset","treeRight","treeRightOffset","grid"
 */
export function applyBalkanLayout(root, layoutKey, opts) {
  const {
    nodeW = 320,
    nodeH = 120,
    levelGap = 140, // depth distance (along main axis)
    hGap = 40,      // cross-axis gap between siblings
    vGap = 60,      // for grid rows
    compactBetween = 24,
    compactPair = 28,
    maxCols = 6
  } = opts || {};

  // store node size on data for renderer
  root.each(n => {
    n.data._nodeW = n.data._nodeW || nodeW;
    n.data._nodeH = n.data._nodeH || nodeH;
  });

  const isOffset = k => k === "treeLeftOffset" || k === "treeRightOffset";
  const isLeft   = k => k === "treeLeft" || k === "treeLeftOffset";
  const isRight  = k => k === "treeRight" || k === "treeRightOffset";
  const isGrid   = k => k === "grid";

  if (isGrid) {
    layoutGrid(root, { nodeW, nodeH, hGap, vGap, maxCols });
    normalizeToOrigin(root);
    return;
  }

  const orient =
    isLeft(layoutKey) ? "left" :
    isRight(layoutKey) ? "right" : "top";

  const separation = (a, b) => {
    if (layoutKey === "mixed") {
      const aLeafy = !a.children || a.children.length === 0;
      const bLeafy = !b.children || b.children.length === 0;
      return (a.parent === b.parent ? 1 : 1.2) * (aLeafy && bLeafy ? 0.8 : 1.0);
    }
    if (layoutKey === "tree") return a.parent === b.parent ? 1.0 : 1.2;
    return a.parent === b.parent ? 1.1 : 1.3;
  };

  // d3.tree computes (x,y): x = breadth, y = depth
  d3.tree()
    .separation(separation)
    .nodeSize([Math.max(nodeH, 1) + hGap, Math.max(nodeW, 1) + levelGap])(root);

  // Map to our final (X,Y) — top-left corner for each node box
  projectCoordinates(root, orient);

  // Staggered look for *offset* variants
  if (isOffset(layoutKey)) {
    addAlternatingOffset(root, orient, nodeW, compactBetween, compactPair);
  }

  normalizeToOrigin(root);
}

/* ---------------- helpers ---------------- */

function projectCoordinates(root, orient) {
  // After d3.tree, nodes have coords (x, y); y grows with depth; x is breadth.
  // We compute X,Y as the *top-left corner* for foreignObject.
  const nodes = root.descendants();

  // normalize x so minimum is baseline
  const xExtent = d3.extent(nodes, n => n.x);
  const xMin = xExtent[0] ?? 0;

  for (const n of nodes) {
    const w = n.data._nodeW || 320;
    const h = n.data._nodeH || 120;

    if (orient === "top") {
      const X = (n.x - xMin) - w / 2;
      const Y = n.y;
      n.X = X;
      n.Y = Y;
    } else if (orient === "left") {
      const X = n.y;
      const Y = (n.x - xMin) - h / 2;
      n.X = X;
      n.Y = Y;
    } else {
      // orient === "right": start mirrored; normalizeToOrigin will flip to positive
      const X = -n.y;
      const Y = (n.x - xMin) - h / 2;
      n.X = X;
      n.Y = Y;
    }
  }
}

function addAlternatingOffset(root, orient, nodeW, compactBetween, compactPair) {
  // Offset every odd depth *across the cross-axis* for a staggered look.
  const cross = Math.round(nodeW * 0.5);
  for (const n of root.descendants()) {
    if (n.depth % 2 === 1) {
      if (orient === "top") {
        n.X += cross;
      } else {
        n.Y += Math.round(cross * 0.6);
      }
    }
  }
}

function normalizeToOrigin(root) {
  const nodes = root.descendants();
  let minX = Infinity, minY = Infinity;
  for (const n of nodes) {
    if (n.X < minX) minX = n.X;
    if (n.Y < minY) minY = n.Y;
  }
  const pad = 20;
  for (const n of nodes) {
    n.X = Math.round(n.X - minX + pad);
    n.Y = Math.round(n.Y - minY + pad);
  }
}

function layoutGrid(root, { nodeW, nodeH, hGap, vGap, maxCols }) {
  // Place by depth levels in rows, wrap to next row after maxCols
  const levels = d3.group(root.descendants(), d => d.depth);
  const pad = 20;
  let curY = pad;

  // Avoid arrow functions inside forEach (fixes no-loop-func)
  const depths = Array.from(levels.keys()).sort((a, b) => a - b);

  for (let i = 0; i < depths.length; i++) {
    const depth = depths[i];
    const row = levels.get(depth) || [];
    let curX = pad;
    let col = 0;

    for (let j = 0; j < row.length; j++) {
      const n = row[j];
      n.X = curX;
      n.Y = curY;
      curX += nodeW + hGap;
      col += 1;

      if (col >= maxCols) {
        // wrap
        col = 0;
        curX = pad;
        curY += nodeH + vGap;
      }
    }
    if (col !== 0) {
      curY += nodeH + vGap;
    }
  }
}
