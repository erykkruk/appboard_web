import { zipSync } from "fflate";

export interface ZipEntry {
	/** File name inside the archive (e.g. "scene-1of7.png"). */
	name: string;
	data: Uint8Array;
}

/**
 * Pack files into a single ZIP archive. Entries are STORED uncompressed —
 * the editor only zips PNGs, which are already deflate-compressed, so
 * re-compressing wastes time for zero size gain. Pure — testable without DOM.
 */
export function buildZip(entries: ZipEntry[]): Uint8Array {
	const input: Record<string, [Uint8Array, { level: 0 }]> = {};
	for (const entry of entries) {
		input[entry.name] = [entry.data, { level: 0 }];
	}
	return zipSync(input);
}

/** Zip named blobs and trigger a single browser download of the archive. */
export async function downloadBlobsAsZip(
	files: { name: string; blob: Blob }[],
	zipName: string,
): Promise<void> {
	const entries = await Promise.all(
		files.map(async (file) => ({
			data: new Uint8Array(await file.blob.arrayBuffer()),
			name: file.name,
		})),
	);
	const archive = new Blob([buildZip(entries).buffer as ArrayBuffer], {
		type: "application/zip",
	});
	const url = URL.createObjectURL(archive);
	const link = document.createElement("a");
	link.href = url;
	link.download = zipName;
	link.click();
	URL.revokeObjectURL(url);
}
