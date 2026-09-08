type RGB = [number, number, number];

function rgb(hex: string): RGB {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as RGB;
}

function hex(channels: RGB): string {
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function luminance(color: string): number {
  const channels = rgb(color).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(first: string, second: string): number {
  const firstLight = luminance(first);
  const secondLight = luminance(second);
  return (Math.max(firstLight, secondLight) + 0.05) / (Math.min(firstLight, secondLight) + 0.05);
}

/** sRGB mixing matches the templates' existing color-mix backgrounds. */
export function mixBrandColor(accent: string, other: string, accentWeight: number): string {
  const base = rgb(accent);
  const target = rgb(other);
  return hex(base.map((channel, index) => channel * accentWeight + target[index] * (1 - accentWeight)) as RGB);
}

/** Keep white or the template ink when readable; black covers the narrow midtone gap. */
export function textOnBrandColor(background: string): string {
  if (contrastRatio("#ffffff", background) >= 4.5) return "#ffffff";
  return contrastRatio("#111318", background) >= 4.5 ? "#111318" : "#000000";
}

/** Preserve the brand hue while darkening only text shown on the template's light surfaces. */
export function readableBrandText(accent: string, backgrounds: readonly string[]): string {
  for (let amount = 0; amount <= 100; amount += 1) {
    const candidate = mixBrandColor(accent, "#000000", 1 - amount / 100);
    if (backgrounds.every((background) => contrastRatio(candidate, background) >= 4.5)) return candidate;
  }
  return "#000000";
}
