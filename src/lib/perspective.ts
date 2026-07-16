// Minimal 3D-perspective helpers for the screenshot editor. A device frame is
// rendered flat to an off-screen canvas, its corners are rotated in 3D and
// projected back to 2D, and the flat render is warped onto that quad with a
// subdivided triangle mesh. Pure canvas 2D — no WebGL/three.js dependency, so
// the live preview and the PNG export share the exact same pixels.

export interface Point {
	x: number;
	y: number;
}

/** Destination quad corners in draw order: TL, TR, BR, BL. */
export type Quad = [Point, Point, Point, Point];

/** Perspective camera distance as a multiple of the rect's larger side. */
const PERSPECTIVE_DISTANCE_FACTOR = 2.4;

const DEG_TO_RAD = Math.PI / 180;

/**
 * Rotate the corners of a `width`×`height` rect (centered at `cx`,`cy`) by the
 * given Euler angles (degrees) and project them back to screen space with a
 * simple pinhole perspective. Rotation order: X (pitch), then Y (yaw), then
 * Z (roll) — matches how the tilt sliders read. Pure.
 */
export function projectRectCorners(
	cx: number,
	cy: number,
	width: number,
	height: number,
	rotationX: number,
	rotationY: number,
	rotationZ: number,
): Quad {
	const rx = rotationX * DEG_TO_RAD;
	const ry = rotationY * DEG_TO_RAD;
	const rz = rotationZ * DEG_TO_RAD;
	const cosX = Math.cos(rx);
	const sinX = Math.sin(rx);
	const cosY = Math.cos(ry);
	const sinY = Math.sin(ry);
	const cosZ = Math.cos(rz);
	const sinZ = Math.sin(rz);
	const distance = Math.max(width, height) * PERSPECTIVE_DISTANCE_FACTOR;

	const project = (px: number, py: number): Point => {
		// Rotate around X: y/z change.
		const y1 = py * cosX;
		const z1 = py * sinX;
		// Rotate around Y: x/z change.
		const x2 = px * cosY + z1 * sinY;
		const z2 = -px * sinY + z1 * cosY;
		// Rotate around Z: x/y change.
		const x3 = x2 * cosZ - y1 * sinZ;
		const y3 = x2 * sinZ + y1 * cosZ;
		// Pinhole projection; clamp so points behind the camera never explode.
		const depth = Math.max(distance - z2, distance * 0.2);
		const s = distance / depth;
		return { x: cx + x3 * s, y: cy + y3 * s };
	};

	const hw = width / 2;
	const hh = height / 2;
	return [
		project(-hw, -hh),
		project(hw, -hh),
		project(hw, hh),
		project(-hw, hh),
	];
}

/** Axis-aligned bounding box of a quad. Used for hit-testing tilted devices. */
export function quadBounds(quad: Quad): {
	x: number;
	y: number;
	width: number;
	height: number;
} {
	const xs = quad.map((p) => p.x);
	const ys = quad.map((p) => p.y);
	const minX = Math.min(...xs);
	const minY = Math.min(...ys);
	return {
		x: minX,
		y: minY,
		width: Math.max(...xs) - minX,
		height: Math.max(...ys) - minY,
	};
}

// Coefficients mapping the unit square (u,v ∈ 0..1) onto an arbitrary quad:
// X = (a·u + b·v + c) / (g·u + h·v + 1), Y = (d·u + e·v + f) / (…). Closed-form
// square→quad homography (Heckbert's projective mapping).
interface Homography {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;
	g: number;
	h: number;
}

function squareToQuad(quad: Quad): Homography {
	const [p0, p1, p2, p3] = quad;
	const dx1 = p1.x - p2.x;
	const dx2 = p3.x - p2.x;
	const dy1 = p1.y - p2.y;
	const dy2 = p3.y - p2.y;
	const sx = p0.x - p1.x + p2.x - p3.x;
	const sy = p0.y - p1.y + p2.y - p3.y;
	const denom = dx1 * dy2 - dx2 * dy1 || 1e-9;
	const g = (sx * dy2 - dx2 * sy) / denom;
	const h = (dx1 * sy - sx * dy1) / denom;
	return {
		a: p1.x - p0.x + g * p1.x,
		b: p3.x - p0.x + h * p3.x,
		c: p0.x,
		d: p1.y - p0.y + g * p1.y,
		e: p3.y - p0.y + h * p3.y,
		f: p0.y,
		g,
		h,
	};
}

/** Map a unit-square point through the homography. Exposed for tests. */
export function mapUnitPoint(quad: Quad, u: number, v: number): Point {
	const m = squareToQuad(quad);
	const w = m.g * u + m.h * v + 1;
	return {
		x: (m.a * u + m.b * v + m.c) / w,
		y: (m.d * u + m.e * v + m.f) / w,
	};
}

/** Grid resolution of the warp mesh. 24×24 is visually smooth up to ±45°. */
const MESH_SUBDIVISIONS = 24;

/**
 * Overdraw (px) applied to each destination triangle to hide hairline seams
 * between mesh cells caused by antialiased edges.
 */
const SEAM_OVERDRAW = 0.6;

function drawTexturedTriangle(
	ctx: CanvasRenderingContext2D,
	source: CanvasImageSource,
	s0: Point,
	s1: Point,
	s2: Point,
	d0: Point,
	d1: Point,
	d2: Point,
): void {
	// Affine transform mapping the source triangle onto the destination one.
	const denom =
		(s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
	if (Math.abs(denom) < 1e-9) return;
	const a =
		((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / denom;
	const b =
		((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / denom;
	const c =
		((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / denom;
	const d =
		((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / denom;
	const e = d0.x - a * s0.x - b * s0.y;
	const f = d0.y - c * s0.x - d * s0.y;

	// Clip to a slightly inflated destination triangle so adjacent cells overlap
	// by a fraction of a pixel — hides antialiasing seams.
	const cx = (d0.x + d1.x + d2.x) / 3;
	const cy = (d0.y + d1.y + d2.y) / 3;
	const inflate = (p: Point): Point => {
		const dx = p.x - cx;
		const dy = p.y - cy;
		const len = Math.hypot(dx, dy) || 1;
		return {
			x: p.x + (dx / len) * SEAM_OVERDRAW,
			y: p.y + (dy / len) * SEAM_OVERDRAW,
		};
	};
	const i0 = inflate(d0);
	const i1 = inflate(d1);
	const i2 = inflate(d2);

	ctx.save();
	ctx.beginPath();
	ctx.moveTo(i0.x, i0.y);
	ctx.lineTo(i1.x, i1.y);
	ctx.lineTo(i2.x, i2.y);
	ctx.closePath();
	ctx.clip();
	ctx.transform(a, c, b, d, e, f);
	ctx.drawImage(source, 0, 0);
	ctx.restore();
}

/**
 * Draw `source` (its full `srcW`×`srcH` pixels) warped onto the destination
 * quad using a subdivided triangle mesh. The quad's corners correspond to the
 * source corners in order TL, TR, BR, BL.
 */
export function drawImageToQuad(
	ctx: CanvasRenderingContext2D,
	source: CanvasImageSource,
	srcW: number,
	srcH: number,
	quad: Quad,
): void {
	const m = squareToQuad(quad);
	const mapPoint = (u: number, v: number): Point => {
		const w = m.g * u + m.h * v + 1;
		return {
			x: (m.a * u + m.b * v + m.c) / w,
			y: (m.d * u + m.e * v + m.f) / w,
		};
	};

	const n = MESH_SUBDIVISIONS;
	for (let row = 0; row < n; row++) {
		const v0 = row / n;
		const v1 = (row + 1) / n;
		for (let col = 0; col < n; col++) {
			const u0 = col / n;
			const u1 = (col + 1) / n;
			const sTL: Point = { x: u0 * srcW, y: v0 * srcH };
			const sTR: Point = { x: u1 * srcW, y: v0 * srcH };
			const sBR: Point = { x: u1 * srcW, y: v1 * srcH };
			const sBL: Point = { x: u0 * srcW, y: v1 * srcH };
			const dTL = mapPoint(u0, v0);
			const dTR = mapPoint(u1, v0);
			const dBR = mapPoint(u1, v1);
			const dBL = mapPoint(u0, v1);
			drawTexturedTriangle(ctx, source, sTL, sTR, sBR, dTL, dTR, dBR);
			drawTexturedTriangle(ctx, source, sTL, sBR, sBL, dTL, dBR, dBL);
		}
	}
}
