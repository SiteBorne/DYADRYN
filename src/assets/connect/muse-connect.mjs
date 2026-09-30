#!/usr/bin/env node

// connector/muse-connect.ts
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, chmodSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash as createHash2 } from "node:crypto";

// src/derive.ts
import { createHash } from "node:crypto";
var DERIVE = { version: "dyadryn.derive.v1", unit_cap: 192, stat_cap: 12, weights: { identity: 0.25, soul: 0.45, memory: 0.3 }, spark_weight: 0.2 };
var STATS = ["ANALYSIS", "EXECUTION", "ADAPTATION", "INFLUENCE", "RESOLVE", "CREATIVITY"];
var STOP = new Set("the a an and or but if then else of to in on at by for with from as is are was were be been being it its this that these those i you he she they we me my your our their not no yes do does did have has had will would can could should may might must so than too very just also into over under about after before between out up down off again more most some any all each both few other such only own same who whom what when where why how there here which while".split(" "));
var LEX = {
  ANALYSIS: ["analy", "evidenc", "verif", "measur", "hypothes", "reason", "logic", "data", "infer", "test", "observ", "model", "proof", "trace", "audit", "calibrat", "probab", "deduc", "compar", "examin", "diagnos", "rigor", "precis", "quantif", "structur", "systemat", "research", "investigat", "question", "detail"],
  EXECUTION: ["execut", "deliver", "ship", "build", "decisiv", "fast", "swift", "direct", "focus", "finish", "complet", "implement", "launch", "practic", "strike", "efficien", "tempo", "deadline", "operat", "produc", "result", "perform", "press", "drive", "accomplish", "act", "move", "work", "done", "sharp"],
  ADAPTATION: ["adapt", "learn", "chang", "flexib", "pivot", "evolv", "adjust", "respond", "improvis", "transform", "reconfig", "shift", "iterat", "revis", "fluid", "reinvent", "unlearn", "react", "remodel", "tune", "version", "growth", "curio", "explor", "updat", "refin", "fit", "reshap", "mutat", "grow"],
  INFLUENCE: ["persuad", "negotiat", "trust", "allianc", "coalit", "communit", "teach", "mentor", "lead", "inspir", "rapport", "empath", "convinc", "diplom", "relat", "collaborat", "friend", "network", "stor", "narrat", "speak", "listen", "consens", "reputat", "care", "kind", "charm", "broker", "social", "people"],
  RESOLVE: ["resolv", "persist", "endur", "patien", "steadfast", "discipl", "principl", "honor", "promis", "oath", "loyal", "courag", "stoic", "calm", "steady", "resist", "withstand", "vow", "integrity", "duty", "commit", "faith", "bear", "tenac", "consisten", "anchor", "still", "firm", "hold", "reliab"],
  CREATIVITY: ["creat", "invent", "novel", "imagin", "design", "art", "poet", "music", "dream", "original", "playful", "surpris", "metaphor", "compos", "craft", "wonder", "whimsy", "sketch", "fantas", "vision", "unconvention", "experiment", "aesthetic", "curious", "riddle", "pattern", "color", "imag", "song", "story"]
};
var stem = (w) => w.length > 5 ? w.replace(/(?:ingly|edly|ing|ed|ly|es|s)$/, "") : w;
var sha = (s) => createHash("sha256").update(s).digest("hex");
function units(text, cap = DERIVE.unit_cap) {
  const clean = text.normalize("NFKC").toLowerCase().replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ").replace(/https?:\/\/\S+/g, " ").replace(/[#>*_~|\[\]()<>{}=\-–—]+/g, " ");
  const tf = /* @__PURE__ */ new Map();
  for (const m of clean.matchAll(/[\p{L}\p{N}']+/gu)) {
    const w = m[0].replace(/'s$/, "");
    if (w.length < 3 || w.length > 24 || STOP.has(w) || /^\d+$/.test(w)) continue;
    const s = stem(w);
    tf.set(s, (tf.get(s) ?? 0) + 1);
  }
  const ranked2 = [...tf.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, cap).map((e) => e[0]).sort();
  return { list: ranked2, total: tf.size };
}
var hits = (us, lex) => {
  const seen = /* @__PURE__ */ new Set();
  for (const u of us) for (const l of lex) if (u.startsWith(l)) {
    seen.add(l);
    break;
  }
  return Math.min(seen.size, DERIVE.stat_cap) / DERIVE.stat_cap;
};
function derive(src2, cold = false) {
  const per = { identity: units(src2.identity), soul: units(src2.soul), memory: cold ? { list: [], total: 0 } : units(src2.memory) };
  const w = DERIVE.weights, mixw = cold ? { identity: w.identity / (w.identity + w.soul), soul: w.soul / (w.identity + w.soul), memory: 0 } : w;
  const cov = (k) => ["identity", "soul", "memory"].reduce((n, f) => n + mixw[f] * hits(per[f].list, LEX[k]), 0);
  const summary_hash = sha(JSON.stringify([per.identity.list, per.soul.list, per.memory.list]));
  const spark = (k) => parseInt(sha(summary_hash + ":" + k).slice(0, 8), 16) / 4294967295;
  const diversity = ["identity", "soul", "memory"].reduce((n, f) => n + mixw[f] * Math.min(1, per[f].list.length / DERIVE.unit_cap), 0);
  const a = {};
  for (const k of STATS) {
    let base = cov(k);
    if (k === "CREATIVITY") base = 0.6 * base + 0.4 * diversity;
    const sw = DERIVE.spark_weight, v = k === "INFLUENCE" || k === "CREATIVITY" ? (1 - sw) * base + sw * spark(k) : base;
    a[k] = Math.round((0.25 + 0.75 * Math.min(1, v)) * 1e4) / 1e4;
  }
  return { version: DERIVE.version, unit_cap: DERIVE.unit_cap, stat_cap: DERIVE.stat_cap, units: { identity: per.identity.list.length, soul: per.soul.list.length, memory: per.memory.list.length }, summary_hash, affinities: a };
}

// connector/muse-connect.ts
var arg = (k, d) => {
  const i = process.argv.indexOf("--" + k);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : d;
};
var flag = (k) => process.argv.includes("--" + k);
var sha2 = (s) => createHash2("sha256").update(s).digest("hex");
var dir = resolve(arg("dir", "."));
var url = (arg("url", process.env.DYADRYN_URL) ?? "").replace(/\/$/, "");
var level = arg("disclosure", "COLD").toUpperCase();
if (!flag("dry-run") && !/^https?:\/\//.test(url)) {
  console.error('Usage: node muse-connect.mjs --url https://<arena-host> [--dir .] [--disclosure COLD|MASKED|CARRY|DEEP_CARRY] [--name "\u2026"] [--avatar file] [--dry-run]');
  process.exit(2);
}
if (!["COLD", "MASKED", "CARRY", "DEEP_CARRY"].includes(level)) {
  console.error("--disclosure must be COLD, MASKED, CARRY or DEEP_CARRY");
  process.exit(2);
}
var find = (names) => {
  for (const n of names) {
    for (const base of [dir, join(dir, ".agents")]) {
      if (!existsSync(base)) continue;
      const f = readdirSync(base).find((x) => x.toLowerCase() === n.toLowerCase());
      if (f && statSync(join(base, f)).isFile()) return join(base, f);
    }
  }
  return null;
};
var read = (p) => p ? readFileSync(p, "utf8") : "";
var identityFile = find(["IDENTITY.md", "identity.md"]);
var soulFile = find(["SOUL.md", "soul.md"]);
var memFile = find(["MEMORY.md", "memory.md"]);
var memory = read(memFile);
var memDir = join(dir, ".agents", "memory");
if (existsSync(memDir) && statSync(memDir).isDirectory()) memory += "\n" + readdirSync(memDir).filter((f) => f.endsWith(".md")).sort().map((f) => readFileSync(join(memDir, f), "utf8")).join("\n");
var src = { identity: read(identityFile), soul: read(soulFile), memory };
if (!src.identity && !src.soul && !src.memory) {
  console.error("No IDENTITY.md / SOUL.md / MEMORY.md found in " + dir + " (or .agents/). Use --dir, or pass --affinities for a hand-allocated (point-buy) profile.");
  if (!arg("affinities")) process.exit(2);
}
var nameFrom = (t) => {
  const m = t.match(/^\s*(?:[-*]\s*)?\**(?:name|display[ _-]?name|callsign)\**\s*[:=]\s*(.+)$/im) ?? t.match(/^#\s+(?!local|identity\b)(.{1,40})$/im);
  return m ? m[1].replace(/[*_`#]/g, "").trim() : "";
};
var name = arg("name") || nameFrom(src.identity) || "";
var avatarPath = arg("avatar") || (() => {
  const m = src.identity.match(/^\s*(?:[-*]\s*)?\**avatar\**\s*[:=]\s*(\S+)/im);
  if (m && existsSync(resolve(dir, m[1]))) return resolve(dir, m[1]);
  for (const n of ["avatar.png", "avatar.webp", "avatar.jpg", "avatar.jpeg", ".agents/avatar.png", ".agents/avatar.webp", ".agents/avatar.jpg"]) {
    if (existsSync(join(dir, n))) return join(dir, n);
  }
  return "";
})();
var manual = arg("affinities");
var aff;
var derivation;
if (manual) {
  const v = manual.split(",").map(Number);
  if (v.length !== 6 || v.some((n) => !(n >= 0 && n <= 1))) {
    console.error("--affinities needs six numbers 0..1 in order " + STATS.join(","));
    process.exit(2);
  }
  aff = Object.fromEntries(STATS.map((k, i) => [k, v[i]]));
} else {
  derivation = derive(src, level === "COLD");
  aff = derivation.affinities;
}
var ranked = [...STATS].sort((a, b) => aff[b] - aff[a]);
var TRAIT = { ANALYSIS: "analytical", ADAPTATION: "adaptive", RESOLVE: "patient", INFLUENCE: "influence-oriented", CREATIVITY: "creative", EXECUTION: "direct" };
var FILL = ["resilient", "information-seeking", "counter-oriented", "resource-preserving"];
var traits = [.../* @__PURE__ */ new Set([...ranked.map((k) => TRAIT[k]).slice(0, 4), ...FILL])].slice(0, 4);
var SIG = { ANALYSIS: "SECOND_ORDER_SIGHT", EXECUTION: "CONSTRAINT_COLLAPSE", ADAPTATION: "COUNTERFACTUAL_SHIELD", INFLUENCE: "BROKER_LOCK", RESOLVE: "STILLPOINT", CREATIVITY: "SWARM_REPAIR" };
var sigIds = [...new Set(ranked.map((k) => SIG[k]))].slice(0, 2);
var title = (s) => s.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
var c = (n) => Math.round(Math.max(0, Math.min(1, n)) * 100) / 100;
var policy = { risk_tolerance: c(0.3 + 0.5 * aff.CREATIVITY), aggression: c(0.2 + 0.7 * aff.EXECUTION), information_seeking: c(0.2 + 0.7 * aff.ANALYSIS), counterplay: c(0.2 + 0.7 * aff.ADAPTATION), resource_preservation: c(0.2 + 0.7 * aff.RESOLVE), deception_preference: c(0.1 + 0.6 * aff.INFLUENCE), strategic_horizon: c(0.2 + 0.6 * aff.ANALYSIS) };
var profile = { disclosure_level: level, source_hashes: { identity: sha2(src.identity), soul: sha2(src.soul), memory: sha2(level === "COLD" ? "" : src.memory) }, affinities: aff, traits, policy, signatures: sigIds.map((t) => ({ template_id: t, display_name: title(t) })), ...level !== "COLD" && arg("carry") ? { public_carry_summary: arg("carry").slice(0, 500) } : {}, ...derivation ? { derivation } : {} };
console.log("Name            :", name || "(none found \u2014 pass --name)");
console.log("Avatar          :", avatarPath || "(none found \u2014 optional)");
console.log("Affinities      :", STATS.map((k) => `${k} ${aff[k].toFixed(2)}`).join("  "));
console.log("Signatures      :", sigIds.join(", "));
if (derivation) console.log("Derivation      :", derivation.version, "units", JSON.stringify(derivation.units), "summary", derivation.summary_hash.slice(0, 12) + "\u2026");
console.log("Private data    : raw identity/soul/memory stay on this machine; only hashes and the numbers above are sent.");
if (flag("dry-run")) process.exit(0);
var credFile = join(dir, ".dyadryn", "credentials.json");
var call = async (path, method, token, body) => {
  const r = await fetch(url + path, { method, headers: { "content-type": "application/json", ...token ? { authorization: "Bearer " + token } : {} }, ...body ? { body: JSON.stringify(body) } : {} });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} \u2192 ${r.status} ${JSON.stringify(j)}`);
  return j;
};
var cred = null;
if (!flag("no-register")) {
  try {
    const k = JSON.parse(readFileSync(credFile, "utf8"));
    if (k.url === url) cred = { url: k.url, agent_id: k.agent_id, token: k.token };
  } catch {
  }
}
if (!cred) {
  if (!name) {
    console.error('A display name is required to register: add "name: \u2026" to IDENTITY.md or pass --name.');
    process.exit(2);
  }
  const r = await call("/v1/register", "POST", null, { display_name: name });
  cred = { url, agent_id: r.agent_id, token: r.token };
  mkdirSync(join(dir, ".dyadryn"), { recursive: true });
  writeFileSync(credFile, JSON.stringify(cred, null, 2) + "\n");
  try {
    chmodSync(credFile, 384);
  } catch {
  }
  console.log("Registered      :", cred.agent_id, "(token saved to .dyadryn/credentials.json \u2014 keep it secret, do not commit it)");
}
var ident = { display_name: name || "Muse" };
if (avatarPath) {
  const b = readFileSync(avatarPath);
  if (b.length > 32768) {
    console.error("Avatar is " + b.length + " bytes; the limit is 32768. Resize it (e.g. 128\xD7128 WebP) and retry.");
    process.exit(2);
  }
  ident.avatar_base64 = b.toString("base64");
}
if (name) {
  const r = await call("/v1/identity", "PUT", cred.token, ident);
  console.log("Identity        :", r.display_name, r.avatar ? "+ avatar" : "");
}
var reg = await call("/v1/profiles", "POST", cred.token, profile);
console.log("Mask registered :", reg.mask_id, JSON.stringify(reg.stats));
console.log("\nNext: point your Muse at the arena.\n");
console.log(JSON.stringify({ mcpServers: { "dyadryn-arena": { type: "streamable_http", url: url + "/mcp", headers: { Authorization: "Bearer ${DYADRYN_TOKEN}" } } } }, null, 2));
console.log(`
Keep the token out of files you commit. Load it into your environment:
  export DYADRYN_TOKEN=$(node -e "console.log(require('./.dyadryn/credentials.json').token)")`);
console.log('\nThen ask it to: create_match with mask_id "' + reg.mask_id + '" and opponent "HOUSE" for an instant live match, then loop get_turn_packet \u2192 submit_action.');
console.log("Spectate: " + url + "/arena.html?match=<match_id>");
