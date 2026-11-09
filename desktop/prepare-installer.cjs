const fs = require("node:fs");
const path = require("node:path");

const template = path.join(
  __dirname,
  "..",
  "node_modules",
  "app-builder-lib",
  "templates",
  "nsis",
  "include",
  "webPackage.nsh",
);

if (!fs.existsSync(template)) {
  throw new Error(`electron-builder NSIS web template not found: ${template}`);
}

let source = fs.readFileSync(template, "utf8");
const from = "inetc::get ";
const to = 'inetc::get /MODERNPOPUP "Sam\'s Canvas" /CAPTION "Sam\'s Canvas - Creator Studio" /TRANSLATE "Downloading Sam\'s Canvas" "Downloaded:" "Time remaining:" "Speed:" "Cancel" ';
const matches = source.split(from).length - 1;

if (matches === 2) {
  source = source.replaceAll(from, to);
  fs.writeFileSync(template, source);
  console.log("Prepared branded modern download progress for the NSIS web installer.");
} else if (matches === 0 && source.includes("/MODERNPOPUP \"Sam's Canvas\"")) {
  console.log("Branded modern download progress is already prepared.");
} else {
  throw new Error(`Unexpected electron-builder web template (${matches} download calls); refusing an unsafe patch.`);
}
