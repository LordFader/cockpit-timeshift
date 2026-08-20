"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parsePo, pluralExpr, buildLocaleData } = require("../scripts/po2js.js");

const SAMPLE_PO = `msgid ""
msgstr ""
"Project-Id-Version: cockpit-timeshift 0.1.0-beta\\n"
"Language: pt_PT\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "Snapshots"
msgstr "Instantâneos"

msgid "Restore"
msgstr "Restaurar"

msgid "restore point available"
msgid_plural "restore points available"
msgstr[0] "ponto de restauro disponível"
msgstr[1] "pontos de restauro disponíveis"

msgid "Multi\\nline"
msgstr "Várias\\nlinhas"
`;

test("parsePo: extracts header plural-forms and language", () => {
  const entries = parsePo(SAMPLE_PO);
  const header = entries.find(e => e.header);
  assert.ok(header);
  assert.equal(header.pluralForms, "nplurals=2; plural=(n != 1);");
  assert.equal(header.language, "pt_PT");
});

test("parsePo: plain entries with msgid/msgstr", () => {
  const entries = parsePo(SAMPLE_PO);
  const snaps = entries.find(e => e.msgid === "Snapshots");
  assert.deepEqual(snaps, { msgid: "Snapshots", msgstr: ["Instantâneos"], plural: false, pluralMsgid: null });
});

test("parsePo: plural entries keep msgstr forms", () => {
  const entries = parsePo(SAMPLE_PO);
  const plural = entries.find(e => e.msgid === "restore point available");
  assert.equal(plural.plural, true);
  assert.equal(plural.pluralMsgid, "restore points available");
  assert.deepEqual(plural.msgstr, ["ponto de restauro disponível", "pontos de restauro disponíveis"]);
});

test("parsePo: escaped sequences are unescaped", () => {
  const entries = parsePo(SAMPLE_PO);
  const multi = entries.find(e => e.msgid === "Multi\nline");
  assert.equal(multi.msgstr[0], "Várias\nlinhas");
});

test("pluralExpr: converts gettext Plural-Forms to arrow function", () => {
  assert.equal(pluralExpr("nplurals=2; plural=(n != 1);"), "(n) => (n != 1)");
  assert.equal(pluralExpr("nplurals=1; plural=0;"), "(n) => (0)");
});

test("buildLocaleData: emits po2json data with header and entries", () => {
  const entries = parsePo(SAMPLE_PO);
  const data = buildLocaleData(entries, "pt_PT") + "";
  assert.match(data, /"plural-forms": \(n\) => \(n != 1\)/);
  assert.match(data, /"language": "pt_PT"/);
  assert.match(data, /"language-direction": "ltr"/);
  assert.match(data, /"Snapshots": \[\n  null,\n  "Instantâneos"\n \]/);
  assert.match(data, /"restore point available": \[null,"ponto de restauro disponível","pontos de restauro disponíveis"\]/);
});