module.exports = async () => {
  // Clean up database connection
  if (global.__DB__) {
    await global.__DB__.destroy();
  }
  
  // Any other cleanup needed
};