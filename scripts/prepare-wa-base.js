#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envBase =
  process.env.WA_BASE_URL ||
  process.env.SHOPIFY_APP_URL ||
  process.env.APP_URL ||
  "";

if (!envBase) {
  console.error(
    "[prepare-wa-base] 未找到环境变量 WA_BASE_URL / SHOPIFY_APP_URL / APP_URL，用于填充 WhatsApp Float API 基地址。",
  );
  process.exit(1);
}

const normalizedBase = envBase.replace(/\/+$/, "");

const templatePath = path.join(
  __dirname,
  "..",
  "extensions",
  "whatsapp-float",
  "blocks",
  "whatsapp-float.liquid.template",
);

const outputPath = path.join(
  __dirname,
  "..",
  "extensions",
  "whatsapp-float",
  "blocks",
  "whatsapp-float.liquid",
);

if (!fs.existsSync(templatePath)) {
  console.error(
    `[prepare-wa-base] 模板文件不存在: ${templatePath}，无法生成 whatsapp-float.liquid。`,
  );
  process.exit(1);
}

const template = fs.readFileSync(templatePath, "utf8");
const rendered = template.replace(/__WA_BASE_URL__/g, normalizedBase);

fs.writeFileSync(outputPath, rendered);
console.log(
  `[prepare-wa-base] 已将 API 基地址 ${normalizedBase} 写入 ${outputPath}`,
);
