import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useSceneHistory } from "@/hooks/use-scene-history";

afterEach(cleanup);

// The hook coalesces changes closer than 400ms into one undo entry, so tests
// that need separate entries space them out via this fake-time helper.
async function separateEntries() {
	await new Promise((resolve) => setTimeout(resolve, 410));
}

describe("useSceneHistory", () => {
	test("starts with no undo/redo available", () => {
		const { result } = renderHook(() => useSceneHistory({ n: 0 }));
		expect(result.current[2].canUndo).toBe(false);
		expect(result.current[2].canRedo).toBe(false);
	});

	test("undo restores the previous value, redo reapplies it", () => {
		const { result } = renderHook(() => useSceneHistory({ n: 0 }));
		act(() => result.current[1]({ n: 1 }));
		expect(result.current[0]).toEqual({ n: 1 });
		expect(result.current[2].canUndo).toBe(true);

		act(() => result.current[2].undo());
		expect(result.current[0]).toEqual({ n: 0 });
		expect(result.current[2].canRedo).toBe(true);

		act(() => result.current[2].redo());
		expect(result.current[0]).toEqual({ n: 1 });
		expect(result.current[2].canRedo).toBe(false);
	});

	test("rapid changes coalesce into a single undo entry", () => {
		const { result } = renderHook(() => useSceneHistory({ n: 0 }));
		act(() => {
			result.current[1]({ n: 1 });
			result.current[1]({ n: 2 });
			result.current[1]({ n: 3 });
		});
		expect(result.current[0]).toEqual({ n: 3 });
		act(() => result.current[2].undo());
		// One undo jumps back over the whole burst.
		expect(result.current[0]).toEqual({ n: 0 });
		expect(result.current[2].canUndo).toBe(false);
	});

	test("changes spaced in time create separate undo entries", async () => {
		const { result } = renderHook(() => useSceneHistory({ n: 0 }));
		act(() => result.current[1]({ n: 1 }));
		await separateEntries();
		act(() => result.current[1]({ n: 2 }));
		act(() => result.current[2].undo());
		expect(result.current[0]).toEqual({ n: 1 });
		act(() => result.current[2].undo());
		expect(result.current[0]).toEqual({ n: 0 });
	});

	test("a new change clears the redo stack", () => {
		const { result } = renderHook(() => useSceneHistory({ n: 0 }));
		act(() => result.current[1]({ n: 1 }));
		act(() => result.current[2].undo());
		expect(result.current[2].canRedo).toBe(true);
		act(() => result.current[1]({ n: 5 }));
		expect(result.current[2].canRedo).toBe(false);
	});

	test("supports functional updates", () => {
		const { result } = renderHook(() => useSceneHistory({ n: 0 }));
		act(() => result.current[1]((prev) => ({ n: prev.n + 41 })));
		expect(result.current[0]).toEqual({ n: 41 });
	});

	test("undo with an empty stack is a no-op", () => {
		const { result } = renderHook(() => useSceneHistory({ n: 0 }));
		act(() => result.current[2].undo());
		expect(result.current[0]).toEqual({ n: 0 });
	});

	test("reset drops all history", () => {
		const { result } = renderHook(() => useSceneHistory({ n: 0 }));
		act(() => result.current[1]({ n: 1 }));
		act(() => result.current[2].reset());
		expect(result.current[2].canUndo).toBe(false);
		expect(result.current[2].canRedo).toBe(false);
	});
});
