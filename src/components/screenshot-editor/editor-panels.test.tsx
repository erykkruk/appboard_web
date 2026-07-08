import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { SceneData } from "@/lib/types";

import { LayersPanel, PropertiesPanel } from "./editor-panels";

afterEach(cleanup);

function buildScene(textCount: number): SceneData {
	return {
		width: 1290,
		height: 2796,
		background: { type: "color", value: "#000" },
		device: { frame: "iphone", scale: 0.72, offsetX: 0, offsetY: 0.12 },
		textLayers: Array.from({ length: textCount }, (_, i) => ({
			id: `t${i}`,
			text: `Layer ${i}`,
			x: 0.5,
			y: 0.2,
			fontFamily: "sans",
			fontSize: 80,
			color: "#fff",
			align: "center" as const,
		})),
	};
}

const noopLayerProps = {
	onAddText: mock(() => {}),
	onDeleteText: mock(() => {}),
	onAddAnnotation: mock(() => {}),
	onAddImage: mock(() => {}),
	onDeleteAnnotation: mock(() => {}),
};

const noopPropertiesProps = {
	onPatchScene: mock(() => {}),
	onPatchTextLayer: mock(() => {}),
	onPatchAnnotation: mock(() => {}),
	onPickBackgroundImage: mock(() => {}),
	onPickScreenshot: mock(() => {}),
	onUploadFont: mock(() => {}),
	onReplaceAnnotationImage: mock(() => {}),
	onDeleteAnnotation: mock(() => {}),
};

function sceneWithBadge(): SceneData {
	return {
		...buildScene(0),
		annotations: [
			{
				id: "a0",
				type: "badge",
				text: "NOWOŚĆ",
				x: 0.5,
				y: 0.5,
				fontSize: 60,
				color: "#fff",
				bg: "#f00",
			},
		],
	};
}

describe("LayersPanel", () => {
	test("renders background, device and each text layer", () => {
		render(
			<LayersPanel
				scene={buildScene(2)}
				selectedLayerId={null}
				onSelectLayer={mock(() => {})}
				{...noopLayerProps}
			/>,
		);
		expect(screen.getByText("Tło")).toBeInTheDocument();
		expect(screen.getByText("Urządzenie + screenshot")).toBeInTheDocument();
		expect(screen.getByText("Layer 0")).toBeInTheDocument();
		expect(screen.getByText("Layer 1")).toBeInTheDocument();
	});

	test("shows an empty hint when there are no text layers", () => {
		render(
			<LayersPanel
				scene={buildScene(0)}
				selectedLayerId={null}
				onSelectLayer={mock(() => {})}
				{...noopLayerProps}
			/>,
		);
		expect(screen.getByText("Brak napisów.")).toBeInTheDocument();
	});

	test("fires onSelectLayer with the layer id when clicked", async () => {
		const onSelectLayer = mock((id: string | null) => id);
		render(
			<LayersPanel
				scene={buildScene(1)}
				selectedLayerId={null}
				onSelectLayer={onSelectLayer}
				{...noopLayerProps}
			/>,
		);
		await userEvent.click(screen.getByText("Layer 0"));
		expect(onSelectLayer).toHaveBeenCalledWith("t0");
	});

	test("fires onAddText when the Tekst button is clicked", async () => {
		const onAddText = mock(() => {});
		render(
			<LayersPanel
				scene={buildScene(0)}
				selectedLayerId={null}
				onSelectLayer={mock(() => {})}
				{...noopLayerProps}
				onAddText={onAddText}
			/>,
		);
		await userEvent.click(screen.getByText("Tekst"));
		expect(onAddText).toHaveBeenCalled();
	});

	test("fires onDeleteText with the layer id from the trash button", async () => {
		const onDeleteText = mock((id: string) => id);
		render(
			<LayersPanel
				scene={buildScene(1)}
				selectedLayerId="t0"
				onSelectLayer={mock(() => {})}
				{...noopLayerProps}
				onDeleteText={onDeleteText}
			/>,
		);
		await userEvent.click(screen.getByLabelText("Usuń napis"));
		expect(onDeleteText).toHaveBeenCalledWith("t0");
	});

	test("lists annotations and shows an empty hint when there are none", () => {
		const { rerender } = render(
			<LayersPanel
				scene={buildScene(0)}
				selectedLayerId={null}
				onSelectLayer={mock(() => {})}
				{...noopLayerProps}
			/>,
		);
		expect(screen.getByText("Brak adnotacji.")).toBeInTheDocument();

		rerender(
			<LayersPanel
				scene={sceneWithBadge()}
				selectedLayerId={null}
				onSelectLayer={mock(() => {})}
				{...noopLayerProps}
			/>,
		);
		expect(screen.getByText("NOWOŚĆ")).toBeInTheDocument();
	});

	test("fires onDeleteAnnotation from the annotation trash button", async () => {
		const onDeleteAnnotation = mock((id: string) => id);
		render(
			<LayersPanel
				scene={sceneWithBadge()}
				selectedLayerId="a0"
				onSelectLayer={mock(() => {})}
				{...noopLayerProps}
				onDeleteAnnotation={onDeleteAnnotation}
			/>,
		);
		await userEvent.click(screen.getByLabelText("Usuń adnotację"));
		expect(onDeleteAnnotation).toHaveBeenCalledWith("a0");
	});
});

describe("PropertiesPanel — Do Not Translate toggle", () => {
	test("toggling 'Nie tłumacz' patches doNotTranslate on the selected layer", async () => {
		const onPatchTextLayer = mock(
			(id: string, patch: Record<string, unknown>) => ({ id, patch }),
		);
		render(
			<PropertiesPanel
				scene={buildScene(1)}
				selectedLayerId="t0"
				{...noopPropertiesProps}
				onPatchTextLayer={onPatchTextLayer}
			/>,
		);

		await userEvent.click(screen.getByLabelText("Nie tłumacz"));
		expect(onPatchTextLayer).toHaveBeenCalledWith("t0", {
			doNotTranslate: true,
		});
	});
});

describe("PropertiesPanel — annotation editing", () => {
	test("editing the annotation text patches the selected annotation", async () => {
		const onPatchAnnotation = mock(
			(id: string, patch: Record<string, unknown>) => ({ id, patch }),
		);
		render(
			<PropertiesPanel
				scene={sceneWithBadge()}
				selectedLayerId="a0"
				{...noopPropertiesProps}
				onPatchAnnotation={onPatchAnnotation}
			/>,
		);

		const textarea = screen.getByDisplayValue("NOWOŚĆ");
		await userEvent.type(textarea, "!");
		expect(onPatchAnnotation).toHaveBeenCalled();
		expect(onPatchAnnotation.mock.calls[0][0]).toBe("a0");
	});
});
