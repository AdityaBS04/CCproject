// Format date to string
export const formatDate = (date) => {
    if (!date) return 'Never';
    
    const d = new Date(date);
    return d.toLocaleString();
  };
  
  // Truncate string to specified length
  export const truncate = (str, length = 50) => {
    if (!str) return '';
    if (str.length <= length) return str;
    
    return str.slice(0, length) + '...';
  };
  
  // Convert milliseconds to human-readable format
  export const formatDuration = (ms) => {
    if (ms < 1000) {
      return `${ms} ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)} s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  };
  
  // Copy text to clipboard
  export const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy text: ', error);
      return false;
    }
  };
  
  // Parse JSON safely
  export const parseJSON = (str) => {
    try {
      return JSON.parse(str);
    } catch (error) {
      return null;
    }
  };
  
  export default {
    formatDate,
    truncate,
    formatDuration,
    copyToClipboard,
    parseJSON,
  };