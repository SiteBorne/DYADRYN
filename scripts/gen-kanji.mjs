// Extracts outlines for a fixed set of Japanese glyphs (IPAGothic, IPA Font License v1.0) into scripts/vendor/kanji.json.
import opentype from 'opentype.js'; import fs from 'node:fs';
const font = opentype.loadSync('/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf');
const set = Array.from(new Set(('響層選決迷路失撃砕防空観圧変映癒滞印守反衝終封幕冷無深示追跡適応仲介静止記録群集幻影防御理探求再起証仮面戦記憶灰錆骨継承修復監査読押守反鏡回復署名熱勢流集中活力気構型霧蜂狩人門灯影夜街機械声沈黙約束契約証明勝負引分決定開始終了対戦試合練習場道場読解視覚鍵封印禁止許可選択予測防衛攻撃移動' + 'ドンゴバシズキャアイウエオカクケコサスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン').split('')));
const out = {};
for (const ch of set) { const g = font.charToGlyph(ch); if (!g || !g.index) continue; const path = g.getPath(0, 880, 1000); out[ch] = [Math.round((g.advanceWidth || 1000) * 1000 / font.unitsPerEm), path.toPathData(1)]; }
fs.writeFileSync('scripts/vendor/kanji.json', JSON.stringify(out)); console.log(Object.keys(out).length, fs.statSync('scripts/vendor/kanji.json').size);
