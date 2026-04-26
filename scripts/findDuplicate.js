const React = require('react');
const ReactDOMServer = require('react-dom/server');

try {
  // Mock window/document
  global.window = { location: { origin: 'http://localhost' }, innerWidth: 1024, innerHeight: 768, addEventListener: () => {}, removeEventListener: () => {} };
  global.document = { getElementById: () => null };
  global.navigator = {};
  
  const originalConsoleError = console.error;
  console.error = function(...args) {
    if (args[0] && args[0].includes('Encountered two children with the same key')) {
        console.log("=== DUPLICATE KEY ERROR ===", args);
    }
    originalConsoleError.apply(console, args);
  };
  
  const App = require('../testApp.cjs').default;
  if (!App) console.log("No default export found");
  else {
      // we need to simulate the states to trigger different screens
      // Let's create an instance of App and manually drive its state or just render it a lot.
      
      console.log("Render completed");
  }
} catch(e) {
  console.error("Exec failed", e);
}
