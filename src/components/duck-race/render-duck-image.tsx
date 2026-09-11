"use client";

import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { DuckIcon } from "./duck-icon";

export function renderDuckToImage(color: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    document.body.appendChild(container);
    const root = createRoot(container);

    setTimeout(() => {
      flushSync(() => {
        root.render(<DuckIcon color={color} size={128} />);
      });
      const svg = container.querySelector("svg");
      if (!svg) {
        root.unmount();
        container.remove();
        reject(new Error("DuckIcon SVG not found"));
        return;
      }
      const svgString = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        root.unmount();
        container.remove();
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        root.unmount();
        container.remove();
        reject(new Error("DuckIcon image load failed"));
      };
      img.src = url;
    }, 0);
  });
}
