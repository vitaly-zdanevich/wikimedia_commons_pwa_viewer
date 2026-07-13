// Build-time generation of iOS splash screens and the apple-touch-icon.
// iOS ignores the web manifest for startup images and needs one PNG per
// device profile, linked with <link rel="apple-touch-startup-image">.
// The media attribute supports prefers-color-scheme, which is how the
// dark (#000) and light (#fff) variants are selected.
import { deflateSync } from 'node:zlib';

export interface DeviceProfile {
	width: number; // CSS points, portrait
	height: number;
	dpr: number;
	landscape: boolean;
}

// One entry per unique iPhone/iPad screen profile; duplicates share files.
export const DEVICES: DeviceProfile[] = [
	{ width: 375, height: 667, dpr: 2, landscape: false }, // iPhone SE
	{ width: 414, height: 736, dpr: 3, landscape: false }, // iPhone 8 Plus
	{ width: 375, height: 812, dpr: 3, landscape: false }, // iPhone X/XS/12-13 mini
	{ width: 414, height: 896, dpr: 2, landscape: false }, // iPhone XR/11
	{ width: 414, height: 896, dpr: 3, landscape: false }, // iPhone XS Max/11 Pro Max
	{ width: 390, height: 844, dpr: 3, landscape: false }, // iPhone 12/13/14
	{ width: 428, height: 926, dpr: 3, landscape: false }, // iPhone 12-13 Pro Max/14 Plus
	{ width: 393, height: 852, dpr: 3, landscape: false }, // iPhone 14 Pro/15/16
	{ width: 430, height: 932, dpr: 3, landscape: false }, // iPhone 14 Pro Max/15 Plus
	{ width: 402, height: 874, dpr: 3, landscape: false }, // iPhone 16 Pro
	{ width: 440, height: 956, dpr: 3, landscape: false }, // iPhone 16 Pro Max
	{ width: 744, height: 1133, dpr: 2, landscape: true }, // iPad mini 6
	{ width: 768, height: 1024, dpr: 2, landscape: true }, // iPad 9.7"
	{ width: 810, height: 1080, dpr: 2, landscape: true }, // iPad 10.2"
	{ width: 820, height: 1180, dpr: 2, landscape: true }, // iPad Air 10.9"
	{ width: 834, height: 1194, dpr: 2, landscape: true }, // iPad Pro 11"
	{ width: 1024, height: 1366, dpr: 2, landscape: true }, // iPad Pro 12.9"
];

type Rgb = [number, number, number];

export const THEMES: { scheme: 'light' | 'dark'; bg: Rgb }[] = [
	{ scheme: 'light', bg: [255, 255, 255] },
	{ scheme: 'dark', bg: [0, 0, 0] },
];

const LOGO_BLUE: Rgb = [0, 102, 153];

let crcTable: Uint32Array | undefined;

function crc32(bytes: Uint8Array): number {
	if (!crcTable) {
		crcTable = new Uint32Array(256);
		for (let n = 0; n < 256; n++) {
			let c = n;
			for (let k = 0; k < 8; k++) {
				c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
			}
			crcTable[n] = c;
		}
	}
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
	const out = new Uint8Array(12 + data.length);
	const view = new DataView(out.buffer);
	view.setUint32(0, data.length);
	for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
	out.set(data, 8);
	view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
	return out;
}

// Minimal PNG encoder: 8-bit RGB, no interlace, filter 0 on every row.
export function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
	const ihdr = new Uint8Array(13);
	const view = new DataView(ihdr.buffer);
	view.setUint32(0, width);
	view.setUint32(4, height);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 2; // color type: RGB
	const raw = new Uint8Array(height * (width * 3 + 1));
	for (let y = 0; y < height; y++) {
		raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
	}
	const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
	const parts = [
		signature,
		pngChunk('IHDR', ihdr),
		pngChunk('IDAT', new Uint8Array(deflateSync(raw))),
		pngChunk('IEND', new Uint8Array(0)),
	];
	const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let offset = 0;
	for (const part of parts) {
		png.set(part, offset);
		offset += part.length;
	}
	return png;
}

function setPixel(rgb: Uint8Array, width: number, x: number, y: number, color: Rgb): void {
	const i = (y * width + x) * 3;
	rgb[i] = color[0];
	rgb[i + 1] = color[1];
	rgb[i + 2] = color[2];
}

// Draws the app logo (segmented wheel, matching icon.svg) centered in a
// box of the given size.
function drawLogo(
	rgb: Uint8Array,
	width: number,
	cx: number,
	cy: number,
	size: number,
	color: Rgb,
): void {
	const discR = size * 0.117;
	const ringInner = size * 0.234;
	const ringOuter = size * 0.352;
	const gapDeg = 6;
	const box = Math.ceil(ringOuter) + 1;
	for (let y = Math.floor(cy - box); y <= cy + box; y++) {
		for (let x = Math.floor(cx - box); x <= cx + box; x++) {
			const dx = x - cx;
			const dy = y - cy;
			const r = Math.hypot(dx, dy);
			if (r <= discR) {
				setPixel(rgb, width, x, y, color);
			} else if (r >= ringInner && r <= ringOuter) {
				const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 45;
				if (deg > gapDeg && deg < 45 - gapDeg) {
					setPixel(rgb, width, x, y, color);
				}
			}
		}
	}
}

export function renderImage(width: number, height: number, bg: Rgb, logo: Rgb): Uint8Array {
	const rgb = new Uint8Array(width * height * 3);
	for (let i = 0; i < width * height; i++) {
		rgb[i * 3] = bg[0];
		rgb[i * 3 + 1] = bg[1];
		rgb[i * 3 + 2] = bg[2];
	}
	drawLogo(rgb, width, Math.floor(width / 2), Math.floor(height / 2), Math.min(width, height) * 0.4, logo);
	return rgb;
}

export interface SplashAsset {
	fileName: string;
	media: string;
	png: Uint8Array;
}

export function splashAssets(): SplashAsset[] {
	const assets: SplashAsset[] = [];
	for (const device of DEVICES) {
		for (const theme of THEMES) {
			const orientations = device.landscape ? ['portrait', 'landscape'] : ['portrait'];
			for (const orientation of orientations) {
				let pxWidth = device.width * device.dpr;
				let pxHeight = device.height * device.dpr;
				if (orientation === 'landscape') [pxWidth, pxHeight] = [pxHeight, pxWidth];
				assets.push({
					fileName: `splash/${theme.scheme}-${pxWidth}x${pxHeight}.png`,
					media: [
						'screen',
						`(device-width: ${device.width}px)`,
						`(device-height: ${device.height}px)`,
						`(-webkit-device-pixel-ratio: ${device.dpr})`,
						`(orientation: ${orientation})`,
						`(prefers-color-scheme: ${theme.scheme})`,
					].join(' and '),
					png: encodePng(pxWidth, pxHeight, renderImage(pxWidth, pxHeight, theme.bg, LOGO_BLUE)),
				});
			}
		}
	}
	return assets;
}

export function appleTouchIcon(): Uint8Array {
	const size = 180;
	const rgb = new Uint8Array(size * size * 3);
	for (let i = 0; i < size * size; i++) {
		rgb[i * 3] = LOGO_BLUE[0];
		rgb[i * 3 + 1] = LOGO_BLUE[1];
		rgb[i * 3 + 2] = LOGO_BLUE[2];
	}
	drawLogo(rgb, size, size / 2, size / 2, size, [255, 255, 255]);
	return encodePng(size, size, rgb);
}
