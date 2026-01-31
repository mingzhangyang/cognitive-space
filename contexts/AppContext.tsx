import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'zh';
export type Theme = 'light' | 'dark';

interface AppContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (key: keyof typeof translations['en']) => string;
}

const translations = {
  en: {
    living_questions: "Living Questions",
    problems_mind: "Problems currently occupying your mind.",
    space_empty: "Space is empty.",
    no_question_yet: "Your thoughts haven't formed a Question yet.",
    just_write: "Just write. The structure will emerge later.",
    last_active: "Last active",
    write_placeholder: "What's on your mind? Just throw it in...",
    absorbing: "Absorbing...",
    saving: "Saving",
    cast: "Cast",
    detected: "detected.",
    linked_to: "Linked to",
    new_gravity: "New gravity center formed.",
    stored_loosely: "Stored loosely.",
    current_problem: "Current Problem",
    initiated_on: "Initiated on",
    no_thoughts_here: "No thoughts have gathered around this problem yet.",
    add_thought_stream: "Add a thought to this stream",
    footer_philosophy: "I am not recording thoughts, I am accompanying problems.",
    back_problems: "Back to Problems",
    problem_not_found: "Problem not found.",
    // Type labels
    type_question: "Question",
    type_claim: "Claim",
    type_evidence: "Evidence",
    type_trigger: "Trigger",
    type_uncategorized: "Uncategorized"
  },
  zh: {
    living_questions: "鲜活的问题",
    problems_mind: "此刻盘踞在你心头的问题。",
    space_empty: "空空如也。",
    no_question_yet: "你的思绪尚未凝聚成一个问题。",
    just_write: "尽管写。结构会自然浮现。",
    last_active: "最近活跃",
    write_placeholder: "在想什么？尽管丢进来...",
    absorbing: "正在吸收...",
    saving: "正在保存",
    cast: "投掷",
    detected: "已识别。",
    linked_to: "关联至",
    new_gravity: "新的引力中心已形成。",
    stored_loosely: "已松散存储。",
    current_problem: "当前问题",
    initiated_on: "发起于",
    no_thoughts_here: "尚无思绪汇聚于此。",
    add_thought_stream: "向此流中投入思绪",
    footer_philosophy: "我不在记录想法，我在陪伴问题。",
    back_problems: "回到问题列表",
    problem_not_found: "未找到该问题。",
    // Type labels
    type_question: "问题",
    type_claim: "主张",
    type_evidence: "证据",
    type_trigger: "灵感",
    type_uncategorized: "未分类"
  }
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const storedLang = localStorage.getItem('cs_lang') as Language;
    if (storedLang) setLanguageState(storedLang);

    const storedTheme = localStorage.getItem('cs_theme') as Theme;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (storedTheme) {
      setThemeState(storedTheme);
    } else if (systemPrefersDark) {
      setThemeState('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('cs_theme', theme);
  }, [theme]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('cs_lang', lang);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || key;
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, theme, toggleTheme, t }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};