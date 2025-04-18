// Validate function name (alphanumeric with hyphens and underscores only)
const isValidFunctionName = (name) => {
    const regex = /^[a-zA-Z0-9-_]+$/;
    return regex.test(name);
  };
  
  // Validate function route (must start with / and contain only alphanumeric chars, hyphens, and underscores)
  const isValidRoute = (route) => {
    const regex = /^\/[a-zA-Z0-9-_\/]+$/;
    return regex.test(route);
  };
  
  // Validate timeout value (must be a positive number less than max timeout)
  const isValidTimeout = (timeout, maxTimeout = 300000) => {
    return Number.isInteger(timeout) && timeout > 0 && timeout <= maxTimeout;
  };
  
  // Validate language supported by the platform
  const isValidLanguage = (language) => {
    const supportedLanguages = ['javascript', 'python'];
    return supportedLanguages.includes(language);
  };
  
  // Validate environment variables (must be key-value pairs with string values)
  const isValidEnvironment = (env) => {
    if (!env || typeof env !== 'object') return false;
    
    // Check all values are strings
    for (const key in env) {
      if (typeof env[key] !== 'string') return false;
    }
    
    return true;
  };
  
  module.exports = {
    isValidFunctionName,
    isValidRoute,
    isValidTimeout,
    isValidLanguage,
    isValidEnvironment
  };