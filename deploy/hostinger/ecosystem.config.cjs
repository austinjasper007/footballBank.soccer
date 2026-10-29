const path = require("node:path");

const appRoot = process.env.FOOTBALLBANK_ROOT || path.resolve(__dirname, "../..");
const isStaging = process.env.DEPLOY_ENV === "staging";
const suffix = isStaging ? "-staging" : "";
const mainPort = isStaging ? 3100 : 3000;
const portalPort = isStaging ? 3101 : 3001;

module.exports = {
  apps: [
    {
      name: `footballbank-main${suffix}`,
      cwd: appRoot,
      script: "npm",
      args: "run start",
      env: { NODE_ENV: "production", PORT: String(mainPort) },
      autorestart: true,
      max_restarts: 10,
      time: true,
    },
    {
      name: `footballbank-media-portal${suffix}`,
      cwd: path.join(appRoot, "apps", "media-portal"),
      script: "npm",
      args: "run start",
      env: { NODE_ENV: "production", PORT: String(portalPort) },
      autorestart: true,
      max_restarts: 10,
      time: true,
    },
  ],
};
