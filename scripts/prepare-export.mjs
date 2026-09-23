import { readdirSync, copyFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Next 16's Windows export nests segment separators. The router requests dotted
// filenames. Preserve originals and add aliases; on Linux this is a no-op.
const root = path.resolve("out");
let count = 0;
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file);
    else {
      const parts = path.relative(root, file).split(path.sep);
      const index = parts.findIndex(part => part.startsWith("__next."));
      if (index < 0 || index === parts.length - 1 || !file.endsWith(".txt")) continue;
      const alias = path.join(root, ...parts.slice(0, index), parts.slice(index).join("."));
      if (existsSync(alias) && !readFileSync(alias).equals(readFileSync(file))) {
        throw new Error(`Conflicting segment alias: ${alias}`);
      }
      copyFileSync(file, alias);
      count++;
    }
  }
}
visit(root);
console.log(`Prepared ${count} static navigation aliases.`);
