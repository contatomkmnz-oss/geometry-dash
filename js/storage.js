const KEY = "gd_clone_save_v1";

const defaults = () => ({
  stars: 0,
  money: 0,
  bestPercent: {},
  completed: {},
  attempts: {},
  selectedIcon: 0,
  unlockedIcons: [0],
});

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    return defaults();
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Safari privado / storage cheio — não quebra o jogo
  }
}

export function addMoney(save, amount = 1) {
  save.money = (save.money || 0) + amount;
  writeSave(save);
  return save.money;
}

export function recordAttempt(save, levelId) {
  save.attempts[levelId] = (save.attempts[levelId] || 0) + 1;
  writeSave(save);
}

export function recordProgress(save, levelId, percent, completed, starsEarned) {
  const prev = save.bestPercent[levelId] || 0;
  if (percent > prev) save.bestPercent[levelId] = Math.floor(percent);
  if (completed) {
    save.completed[levelId] = true;
    if (!save.unlockedIcons.includes(Math.min(7, levelId + 1))) {
      const next = Math.min(7, levelId + 1);
      if (!save.unlockedIcons.includes(next)) save.unlockedIcons.push(next);
    }
    const already = save._starAwarded?.[levelId];
    if (!save._starAwarded) save._starAwarded = {};
    if (!already) {
      save.stars += starsEarned;
      save._starAwarded[levelId] = starsEarned;
    } else if (starsEarned > already) {
      save.stars += starsEarned - already;
      save._starAwarded[levelId] = starsEarned;
    }
  }
  writeSave(save);
}
