#!/usr/bin/env node

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generateVercelConfig = () => {
  const apiBaseUrl = process.env.VITE_API_BASE_URL;
  const aiBaseUrl = process.env.VITE_CHATBOT_BASE_URL;

  const config = {
    rewrites: [
      {
        source: "/api/(.*)",
        destination: `${apiBaseUrl}/api/$1`,
      },
      {
        source: "/trends/(.*)",
        destination: `${aiBaseUrl}/trends/$1`,
      },
      {
        source: "/(.*)",
        destination: "/index.html",
      },
    ],
  };

  const configPath = join(__dirname, "..", "vercel.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

  console.log("✅ Generated vercel.json with URLs:");
  console.log(`   API: ${apiBaseUrl}`);
  console.log(`   AI:  ${aiBaseUrl}`);
};

generateVercelConfig();
