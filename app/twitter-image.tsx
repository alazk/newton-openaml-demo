// Same image for X cards. Config is declared here (not re-exported) because
// Next reads these fields statically from each image route file.
import OpengraphImage from "./opengraph-image";

export const alt =
  "Newton Protocol × FINOS: check a wallet before you pay it. Address labels from OpenAML, enforced by Newton Protocol.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TwitterImage() {
  return OpengraphImage();
}
