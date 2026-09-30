import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "yaml";
const rules = parse(
  readFileSync(new URL("../../config/rules.v1.yaml", import.meta.url), "utf8"),
);
const output =
  "// Generated from config/rules.v1.yaml. Run npm run rules:generate.\nexport const RULES = " +
  JSON.stringify(rules, null, 2) +
  " as const;\n";
const target = new URL("../src/rules.generated.ts", import.meta.url);
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== output)
    throw new Error("rules_generated_out_of_date");
} else writeFileSync(target, output);
