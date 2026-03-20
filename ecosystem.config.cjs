module.exports = {
  apps: [
    {
      name: "restaurant-management-app",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      }
    }
  ]
};
