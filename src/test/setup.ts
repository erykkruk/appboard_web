import { GlobalWindow } from "happy-dom";
import { expect } from "bun:test";
import * as matchers from "@testing-library/jest-dom/matchers";

const window = new GlobalWindow();

for (const key of Object.getOwnPropertyNames(window)) {
	if (!(key in globalThis)) {
		Object.defineProperty(globalThis, key, {
			value: (window as Record<string, unknown>)[key],
			configurable: true,
			writable: true,
		});
	}
}

Object.defineProperty(globalThis, "window", { value: window, configurable: true, writable: true });
Object.defineProperty(globalThis, "document", { value: window.document, configurable: true, writable: true });
Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true, writable: true });
Object.defineProperty(globalThis, "HTMLElement", { value: window.HTMLElement, configurable: true, writable: true });

expect.extend(matchers);
