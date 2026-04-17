import { create } from 'zustand';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
  set: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const stored = localStorage.getItem('ql_dark');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const initial = stored ? stored === 'true' : prefersDark;
  // Apply immediately
  if (initial) document.documentElement.classList.add('dark');

  return {
    dark: initial,
    toggle: () => set((s) => {
      const next = !s.dark;
      localStorage.setItem('ql_dark', String(next));
      document.documentElement.classList.toggle('dark', next);
      return { dark: next };
    }),
    set: (dark) => {
      localStorage.setItem('ql_dark', String(dark));
      document.documentElement.classList.toggle('dark', dark);
      set({ dark });
    },
  };
});
