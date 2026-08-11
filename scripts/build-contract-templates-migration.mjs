#!/usr/bin/env node
/**
 * Reads LEGAL/*.md → migration 0057 (templates + clauses).
 * Usage: node scripts/build-contract-templates-migration.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(
  root,
  "diedericks-dobermanns",
  "supabase",
  "migrations",
  "0057_contract_templates_legal_seed.sql",
);

const MAIN_KEY = "puppy_sale_agreement";
const ADDENDUM_KEY = "addendum_a_elite_developed";

function escSql(s) {
  return s.replace(/'/g, "''");
}

function stripAttorneyNotes(md) {
  return md.replace(
    />\s*\*\*Not yet legal advice\.\*\*[\s\S]*?(?=\n---|\n## )/g,
    "",
  );
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function convert(md, clauseRefFor) {
  const text = stripAttorneyNotes(md).replace(/\r\n/g, "\n");
  const clauses = [];
  const lines = text.split("\n");
  let html = "";
  let i = 0;
  let para = [];

  const inline = (s) => {
    let out = escapeHtml(s);
    out = out.replace(/`\{\{(\w+)\}\}`/g, "{{$1}}");
    out = out.replace(/\{\{(\w+)\}\}/g, "{{$1}}");
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    return out;
  };

  const flushPara = () => {
    if (para.length === 0) return;
    const joined = para.join(" ").trim();
    para = [];
    if (joined) html += `<p>${inline(joined)}</p>\n`;
  };

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    const box =
      trimmed.match(/^☐\s+\*\*(.+)\*\*\s*$/) || trimmed.match(/^☐\s+(.+)\s*$/);
    if (box) {
      flushPara();
      let label = box[1].trim().replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
      const ref = clauseRefFor(label, clauses.length);
      clauses.push({ clause_ref: ref, label, sort_order: clauses.length + 1 });
      html += `<p class="contract-ack" data-clause-ref="${escapeHtml(ref)}" data-required="true">${escapeHtml(label)}</p>\n`;
      i += 1;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushPara();
      html += `<h1>${inline(trimmed.slice(2))}</h1>\n`;
      i += 1;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushPara();
      html += `<h2>${inline(trimmed.slice(3))}</h2>\n`;
      i += 1;
      continue;
    }
    if (trimmed === "---") {
      flushPara();
      html += `<hr />\n`;
      i += 1;
      continue;
    }
    if (trimmed.startsWith(">")) {
      flushPara();
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      html += `<blockquote><p>${inline(quoteLines.join(" "))}</p></blockquote>\n`;
      continue;
    }
    if (trimmed.startsWith("|")) {
      flushPara();
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        if (!cells.every((c) => /^[-:]+$/.test(c))) rows.push(cells);
        i += 1;
      }
      if (rows.length) {
        const [head, ...body] = rows;
        html += "<table>\n<thead><tr>" + head.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead>\n<tbody>\n";
        for (const r of body) {
          html += "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>\n";
        }
        html += "</tbody></table>\n";
      }
      continue;
    }
    if (!trimmed) {
      flushPara();
      i += 1;
      continue;
    }
    para.push(trimmed);
    i += 1;
  }
  flushPara();
  return { html: html.trim(), clauses };
}

function mainRefFactory() {
  return (label, index) => {
    const lower = label.toLowerCase();
    if (lower.includes("lifelong interest")) return "preamble";
    if (lower.includes("ownership is conditional")) return "1";
    if (lower.includes("72-hour")) return "2";
    if (lower.includes("health undertaking")) return "3";
    if (lower.includes("obligations of care")) return "4_care";
    if (lower.includes("warm, dry shelter")) return "4_shelter";
    if (lower.includes("welfare inspection")) return "5";
    if (lower.includes("never be sold")) return "6_transfer";
    if (lower.includes("must return it")) return "6_return";
    if (lower.includes("recall and remove")) return "7_recall";
    if (lower.includes("will not be refunded")) return "7_refund";
    if (lower.includes("no breeding rights")) return "8_rights";
    if (lower.includes("liable for a penalty")) return "8_penalty";
    if (lower.includes("registered name")) return "9";
    if (lower.includes("dies, is stolen")) return "10";
    if (lower.includes("addendum listed")) return "11";
    if (lower.includes("clauses 11.1")) return "12";
    if (lower.includes("read this agreement in full")) return "ack_1";
    if (lower.includes("drawn to my attention") && !lower.includes("clause a2")) return "ack_2";
    if (lower.includes("independent legal advice")) return "ack_3";
    if (lower.includes("not as an agent")) return "ack_4";
    if (lower.includes("application is true")) return "ack_5";
    if (lower.includes("electronic acceptance")) return "ack_6";
    return `clause_${index + 1}`;
  };
}

function addendumRefFactory() {
  return (label, index) => {
    const lower = label.toLowerCase();
    if (lower.includes("record of the work")) return "A1";
    if (lower.includes("developed dog, not a fully trained")) return "A2_developed";
    if (lower.includes("not a trained protection dog")) return "A2_not_protection";
    if (lower.includes("foundation and pre-work only")) return "A2_prework";
    if (lower.includes("will not advertise")) return "A2_represent";
    if (lower.includes("continue this dog's development in obedience")) return "A3_continue";
    if (lower.includes("competent protection trainer")) return "A3_trainer";
    if (lower.includes("amateur or unqualified")) return "A3_amateur";
    if (lower.includes("attend the handover")) return "A4";
    if (lower.includes("owner and i am responsible")) return "A5_owner";
    if (lower.includes("held liable for harm")) return "A5_liable";
    if (lower.includes("third-party liability insurance")) return "A5_insurance";
    if (lower.includes("failing to continue")) return "A6";
    if (lower.includes("difference between a")) return "A_ack_1";
    if (lower.includes("was not told")) return "A_ack_2";
    if (lower.includes("future depends substantially")) return "A_ack_3";
    if (lower.includes("clause a2") || lower.includes("specifically drawn")) return "A_ack_4";
    if (lower.includes("accept this addendum")) return "A_ack_5";
    return `A_clause_${index + 1}`;
  };
}

function clauseInserts(varName, clauses) {
  return clauses
    .map(
      (c) => `  INSERT INTO contract_clauses (template_id, clause_ref, label, sort_order, is_required)
  VALUES (${varName}, '${escSql(c.clause_ref)}', '${escSql(c.label)}', ${c.sort_order}, true);`,
    )
    .join("\n");
}

const main = convert(
  fs.readFileSync(path.join(root, "LEGAL", "PUPPY_SALE_AGREEMENT.md"), "utf8"),
  mainRefFactory(),
);
const add = convert(
  fs.readFileSync(path.join(root, "LEGAL", "ADDENDUM_A_ELITE_DEVELOPED_PUPPY.md"), "utf8"),
  addendumRefFactory(),
);

console.log(`Main clauses: ${main.clauses.length} → ${main.clauses.map((c) => c.clause_ref).join(", ")}`);
console.log(`Addendum clauses: ${add.clauses.length} → ${add.clauses.map((c) => c.clause_ref).join(", ")}`);

const sql = `-- 0057_contract_templates_legal_seed.sql
-- Seeds Puppy Sale Agreement + Elite Developed Addendum (verbatim from LEGAL/).
-- Schema (programme_tier, is_addendum, version, contract_clauses, …) is already live.
--
-- APPLY MANUALLY — Cursor cannot reach Supabase.
-- Regenerate: node scripts/build-contract-templates-migration.mjs

BEGIN;

DO $$
DECLARE
  v_main uuid;
  v_add uuid;
BEGIN
  SELECT id INTO v_main FROM contract_templates WHERE description = 'key:${MAIN_KEY}' LIMIT 1;
  IF v_main IS NULL THEN
    INSERT INTO contract_templates (
      name, contract_title, description, body_html, is_active, sort_order,
      programme_tier, is_addendum, version
    ) VALUES (
      'Puppy Sale and Placement Agreement',
      'Puppy Sale and Placement Agreement',
      'key:${MAIN_KEY}',
      $main$${main.html}$main$,
      true, 10, NULL, false, 1
    ) RETURNING id INTO v_main;
  ELSE
    UPDATE contract_templates SET
      name = 'Puppy Sale and Placement Agreement',
      contract_title = 'Puppy Sale and Placement Agreement',
      body_html = $main$${main.html}$main$,
      is_active = true,
      sort_order = 10,
      programme_tier = NULL,
      is_addendum = false,
      version = 1,
      updated_at = now()
    WHERE id = v_main;
  END IF;

  DELETE FROM contract_clauses WHERE template_id = v_main;
${clauseInserts("v_main", main.clauses)}

  SELECT id INTO v_add FROM contract_templates WHERE description = 'key:${ADDENDUM_KEY}' LIMIT 1;
  IF v_add IS NULL THEN
    INSERT INTO contract_templates (
      name, contract_title, description, body_html, is_active, sort_order,
      programme_tier, is_addendum, version
    ) VALUES (
      'Addendum A — Elite Developed Puppy',
      'Addendum A — Elite Developed Puppy',
      'key:${ADDENDUM_KEY}',
      $add$${add.html}$add$,
      true, 20, 'elite_developed', true, 1
    ) RETURNING id INTO v_add;
  ELSE
    UPDATE contract_templates SET
      name = 'Addendum A — Elite Developed Puppy',
      contract_title = 'Addendum A — Elite Developed Puppy',
      body_html = $add$${add.html}$add$,
      is_active = true,
      sort_order = 20,
      programme_tier = 'elite_developed',
      is_addendum = true,
      version = 1,
      updated_at = now()
    WHERE id = v_add;
  END IF;

  DELETE FROM contract_clauses WHERE template_id = v_add;
${clauseInserts("v_add", add.clauses)}
END $$;

COMMIT;
`;

fs.writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${outPath} (${Math.round(sql.length / 1024)} KB)`);
