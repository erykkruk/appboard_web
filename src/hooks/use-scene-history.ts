"use client";

import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

/** Maximum undo depth. Old snapshots are dropped from the bottom. */
const HISTORY_LIMIT = 60;

/**
 * Rapid changes arriving within this window are coalesced into ONE undo entry,
 * so a pointer drag (dozens of updates per second) undoes in a single step.
 */
const COALESCE_MS = 400;

export interface SceneHistoryControls {
	undo: () => void;
	redo: () => void;
	canUndo: boolean;
	canRedo: boolean;
	/** Drop all history (used when a different scene is loaded). */
	reset: () => void;
}

/**
 * `useState` with an undo/redo stack. Every change made through the returned
 * setter snapshots the previous value; changes closer together than
 * {@link COALESCE_MS} share one snapshot so drags collapse to a single undo
 * step. Undo/redo are O(1) and never mutate the stored scenes.
 */
export function useSceneHistory<T>(
	initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>, SceneHistoryControls] {
	const [value, setValueRaw] = useState<T>(initial);
	const valueRef = useRef<T>(value);
	useEffect(() => {
		valueRef.current = value;
	}, [value]);

	const undoStack = useRef<T[]>([]);
	const redoStack = useRef<T[]>([]);
	const lastChangeAt = useRef(0);
	// Mirrored as state (not read from refs) so buttons re-render on change.
	const [flags, setFlags] = useState({ canRedo: false, canUndo: false });
	const syncFlags = useCallback(() => {
		setFlags({
			canRedo: redoStack.current.length > 0,
			canUndo: undoStack.current.length > 0,
		});
	}, []);

	const setValue = useCallback<Dispatch<SetStateAction<T>>>(
		(action) => {
			const now = Date.now();
			if (now - lastChangeAt.current > COALESCE_MS) {
				undoStack.current.push(valueRef.current);
				if (undoStack.current.length > HISTORY_LIMIT) {
					undoStack.current.shift();
				}
			}
			lastChangeAt.current = now;
			redoStack.current = [];
			setValueRaw(action);
			syncFlags();
		},
		[syncFlags],
	);

	const undo = useCallback(() => {
		const prev = undoStack.current.pop();
		if (prev === undefined) return;
		redoStack.current.push(valueRef.current);
		// Force the next change to open a fresh undo entry.
		lastChangeAt.current = 0;
		setValueRaw(prev);
		syncFlags();
	}, [syncFlags]);

	const redo = useCallback(() => {
		const next = redoStack.current.pop();
		if (next === undefined) return;
		undoStack.current.push(valueRef.current);
		lastChangeAt.current = 0;
		setValueRaw(next);
		syncFlags();
	}, [syncFlags]);

	const reset = useCallback(() => {
		undoStack.current = [];
		redoStack.current = [];
		lastChangeAt.current = 0;
		syncFlags();
	}, [syncFlags]);

	return [
		value,
		setValue,
		{
			canRedo: flags.canRedo,
			canUndo: flags.canUndo,
			redo,
			reset,
			undo,
		},
	];
}
