import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cutline OS",
    short_name: "Cutline OS",
    description: "Business Operating System for Creative Professionals",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/cutline-logo.JPG",
        sizes: "512x512",
        type: "image/jpeg",
      },
    ],
  };
}
