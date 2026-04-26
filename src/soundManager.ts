import { Howl } from 'howler';

const sounds = {
  click: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'], volume: 0.5 }),
  spell: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.6 }),
  levelUp: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.7 }),
  battleStart: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1110/1110-preview.mp3'], volume: 0.5 }),
  hit: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'], volume: 0.4 }),
  win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1433/1433-preview.mp3'], volume: 0.6 }),
  lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3'], volume: 0.6 }),
  pageTurn: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2563/2563-preview.mp3'], volume: 0.5 }),
  portal: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3'], volume: 0.5 }),
  music: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/131/131-preview.mp3'], volume: 0.2, loop: true }),
};

export const playSound = (soundName: keyof typeof sounds) => {
  try {
    if (soundName === 'music' && sounds.music.playing()) return;
    sounds[soundName].play();
  } catch (e) {
    console.warn(`Could not play sound: ${soundName}`, e);
  }
};

export const stopSound = (soundName: keyof typeof sounds) => {
  try {
    sounds[soundName].stop();
  } catch (e) {
    console.warn(`Could not stop sound: ${soundName}`, e);
  }
};
