module.exports = {
  apps: [
    {
      name: "at-digital-menu",
      script: "./dist/index.js",
      cwd: "/var/www/at-digital-menu",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: "3012",

        // ==== MongoDB ====
        // Replace with your production MongoDB connection string
        MONGODB_URI: "mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/atdigitalmenu?retryWrites=true&w=majority",

        // ==== Auth ====
        // Generate a strong random string, e.g.: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
        JWT_SECRET: "REPLACE_WITH_LONG_RANDOM_SECRET",

        // ==== Email (Gmail SMTP for OTP / notifications) ====
        // Use a Gmail App Password (not your account password)
        EMAIL_USER: "your-email@gmail.com",
        EMAIL_PASS: "your-gmail-app-password",

        // ==== App URL (used for links in emails, CORS, etc.) ====
        APP_URL: "https://admin.atdigitalmenu.com",
      },
    },
  ],
};
