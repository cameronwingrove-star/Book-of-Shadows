const React = require('react');
const ReactDOMServer = require('react-dom/server');

// Mock out Lucide icons and other complex imports if they break, but since we externalized react and react-dom, testApp.js has window/document issues maybe? Let's just try to require it.
try {
  // Mock window/document
  global.window = { location: { origin: 'http://localhost' }, innerWidth: 1024, innerHeight: 768, addEventListener: () => {}, removeEventListener: () => {} };
  global.document = { getElementById: () => null };
  global.navigator = {};
  
  const originalConsoleError = console.error;
  console.error = function(...args) {
    if (args[0] && args[0].includes('Encountered two children with the same key')) {
        console.log("=== FOUND IT ===", args);
    }
    originalConsoleError.apply(console, args);
  };
  
  global.localStorage = {
    getItem: () => JSON.stringify({ characterId: 'piper', level: 10, xp: 0, mana: 100000, gems: 10, currentWorldId: 'halliwell_manor', worldProgress: {}, buildingUpgrades: {}, position: 0, shields: 0, potions: 5, bookScrolls: 0, scrollsRemaining: 100, achievements: [], dailyQuests: [], unlockedSpellIds: [], tutorialPhase: 10, hasSeenTutorial: true, hasSeenCombatTutorial: true, chronicle: ['Started test'] }),
    setItem: () => {}
  };
  const App = require('../testApp.cjs').default;
  if (!App) console.log("No default export found");
  else {
      ReactDOMServer.renderToString(React.createElement(App));
      console.log("Render completed");
  }
} catch(e) {
  console.error("Exec failed", e);
}
