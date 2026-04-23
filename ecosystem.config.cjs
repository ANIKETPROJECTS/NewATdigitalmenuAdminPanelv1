module.exports = {
  apps: [
    {
      name: "at-digital-menu",
      script: "./dist/index.js",
      cwd: "/var/www/NewATdigitalmenuAdminPanelv1",
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
        MONGODB_URI: "mongodb+srv://raneaniket23_db_user:jXzU8puybP5NYp08@adminatdigitalmenu.i8ah2zz.mongodb.net/?appName=ADMINATDIGITALMENU",

        // ==== Auth ====
        // Generate a strong random string, e.g.: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
        JWT_SECRET: "b8kop2T9klVgQdir64ho4Kr5CDsfk12fwgfcAwsKI+5YoZB4hdXU4esRGLJkiGzh2fM4/WqJK2VwWVTN+CvKFg==",

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
