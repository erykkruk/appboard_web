import { describe, expect, test } from "bun:test";

import {
	mapUnitPoint,
	projectRectCorners,
	type Quad,
	quadBounds,
} from "@/lib/perspective";

describe("projectRectCorners", () => {
	test("zero rotation returns the rect corners unchanged", () => {
		const quad = projectRectCorners(100, 200, 80, 60, 0, 0, 0);
		expect(quad[0].x).toBeCloseTo(60);
		expect(quad[0].y).toBeCloseTo(170);
		expect(quad[1].x).toBeCloseTo(140);
		expect(quad[1].y).toBeCloseTo(170);
		expect(quad[2].x).toBeCloseTo(140);
		expect(quad[2].y).toBeCloseTo(230);
		expect(quad[3].x).toBeCloseTo(60);
		expect(quad[3].y).toBeCloseTo(230);
	});

	test("yaw (rotation Y) foreshortens one side more than the other", () => {
		const quad = projectRectCorners(0, 0, 100, 200, 0, 30, 0);
		// Left edge swings toward the camera (larger), right edge away (smaller).
		const leftHeight = quad[3].y - quad[0].y;
		const rightHeight = quad[2].y - quad[1].y;
		expect(leftHeight).toBeGreaterThan(rightHeight);
	});

	test("pitch (rotation X) foreshortens top vs bottom", () => {
		const quad = projectRectCorners(0, 0, 100, 200, 25, 0, 0);
		const topWidth = quad[1].x - quad[0].x;
		const bottomWidth = quad[2].x - quad[3].x;
		expect(topWidth).not.toBeCloseTo(bottomWidth);
	});

	test("roll (rotation Z) rotates corners without perspective distortion", () => {
		const quad = projectRectCorners(0, 0, 100, 100, 0, 0, 90);
		// A square rolled 90° maps TL → position of TR.
		expect(quad[0].x).toBeCloseTo(50);
		expect(quad[0].y).toBeCloseTo(-50);
	});
});

describe("quadBounds", () => {
	test("returns the AABB of the quad", () => {
		const quad: Quad = [
			{ x: 10, y: 5 },
			{ x: 50, y: 0 },
			{ x: 55, y: 90 },
			{ x: 0, y: 80 },
		];
		const box = quadBounds(quad);
		expect(box.x).toBe(0);
		expect(box.y).toBe(0);
		expect(box.width).toBe(55);
		expect(box.height).toBe(90);
	});
});

describe("mapUnitPoint", () => {
	const quad: Quad = [
		{ x: 0, y: 0 },
		{ x: 100, y: 10 },
		{ x: 90, y: 110 },
		{ x: -10, y: 100 },
	];

	test("maps unit-square corners onto the quad corners", () => {
		expect(mapUnitPoint(quad, 0, 0).x).toBeCloseTo(0);
		expect(mapUnitPoint(quad, 0, 0).y).toBeCloseTo(0);
		expect(mapUnitPoint(quad, 1, 0).x).toBeCloseTo(100);
		expect(mapUnitPoint(quad, 1, 0).y).toBeCloseTo(10);
		expect(mapUnitPoint(quad, 1, 1).x).toBeCloseTo(90);
		expect(mapUnitPoint(quad, 1, 1).y).toBeCloseTo(110);
		expect(mapUnitPoint(quad, 0, 1).x).toBeCloseTo(-10);
		expect(mapUnitPoint(quad, 0, 1).y).toBeCloseTo(100);
	});

	test("maps the unit-square center inside the quad", () => {
		const p = mapUnitPoint(quad, 0.5, 0.5);
		const box = quadBounds(quad);
		expect(p.x).toBeGreaterThan(box.x);
		expect(p.x).toBeLessThan(box.x + box.width);
		expect(p.y).toBeGreaterThan(box.y);
		expect(p.y).toBeLessThan(box.y + box.height);
	});
});
