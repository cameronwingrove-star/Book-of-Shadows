export interface StoryChapter {
  id: string;
  title: string;
  content: string;
  images: string[];
  triggerLevel: number;
  puzzleId?: string;
}

export const STORY_CHAPTERS: StoryChapter[] = Array.from({ length: 200 }, (_, i) => {
  const chapterNumber = i + 1;
  const act = chapterNumber <= 50 ? 'The Manor Chronicles' : 
            chapterNumber <= 100 ? 'Underworld Ascendance' : 
            chapterNumber <= 150 ? 'Chronicles of Time' : 'The Final War';
            
  const themes = ['Shadows', 'Ectoplasm', 'Runes', 'Demons', 'Artifacts', 'Ancestry'];
  const theme = themes[i % themes.length];
  
  return {
    id: `chapter_${chapterNumber}`,
    title: `Chapter ${chapterNumber}: ${act} - The ${theme}`,
    content: `${act}: Encounter ${chapterNumber}. The ancient forces of the ${theme} are stirring, demanding your immediate attention. Solve the enigma and vanquish the threat that blocks your path.`,
    images: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200'
    ],
    triggerLevel: (i * 2) + 1,
    puzzleId: i % 4 === 0 ? `puzzle_${chapterNumber}` : undefined
  };
});
