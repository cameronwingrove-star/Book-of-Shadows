const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /\/\/ Spell backfires \/ failure\n(\s+)const failDmg = isBoss \? 80 : 40;\n(\s+)const essenceDrain = isBoss \? 4000 : 1500;/,
  `// Spell backfires / failure\n$1let failDmg = isBoss ? 80 : 40;\n$1const hasShields = prev.unlockedSpellIds.some(id => CHARMED_SPELLS.find(s => s.id === id)?.effect === 'shield');\n$1if (hasShields && tile.type === 'battle') failDmg = Math.floor(failDmg / 2);\n$2const essenceDrain = isBoss ? 4000 : 1500;`
);

code = code.replace(
  /const demonStrike = isBoss \? 40 : 10;\n(\s+)const dodged = Math\.random\(\) < getPlayerStats\(prev\)\.dodgeChance;/,
  `let demonStrike = isBoss ? 40 : 10;\n$1const hasShields = prev.unlockedSpellIds.some(id => CHARMED_SPELLS.find(s => s.id === id)?.effect === 'shield');\n$1if (hasShields && tile.type === 'battle') demonStrike = Math.floor(demonStrike / 2);\n$1const dodged = Math.random() < getPlayerStats(prev).dodgeChance;`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched shield checks.");
