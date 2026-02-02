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
    recall_label: "Recall a thread",
    recall_placeholder: "Type a word, a worry, a name...",
    recall_hint: "A light touch—this only sifts living questions.",
    clear_recall: "Clear recall",
    no_recall_results: "No living questions matched that recall.",
    space_empty: "Space is empty.",
    no_question_yet: "Your thoughts haven't formed a Question yet.",
    just_write: "Just write. The structure will emerge later.",
    last_active: "Last active",
    write_placeholder: "What's on your mind? Just throw it in...",
    absorbing: "Absorbing...",
    saving: "Saving",
    cast: "Cast",
    related_hint: "May relate to",
    view_question: "View",
    merge_prompt: "Possibly the same as",
    merge_action: "Merge",
    separate_action: "Keep separate",
    current_problem: "Current Problem",
    initiated_on: "Initiated on",
    no_thoughts_here: "No thoughts have gathered around this problem yet.",
    add_thought_stream: "Add a thought to this stream",
    section_claims: "Claims",
    section_evidence: "Evidence",
    section_triggers: "Triggers",
    section_other: "Other",
    no_claims: "No claims yet.",
    no_evidence: "No evidence yet.",
    no_triggers: "No triggers yet.",
    no_other: "Nothing else yet.",
    footer_philosophy: "Meaning will unfurl of its own accord.",
    back_problems: "Back to Problems",
    problem_not_found: "Problem not found.",
    // Type labels
    type_question: "Question",
    type_claim: "Claim",
    type_evidence: "Evidence",
    type_trigger: "Trigger",
    type_uncategorized: "Uncategorized",
    // Dark Matter
    dark_matter: "Dark Matter",
    dark_matter_desc: "Fragments drifting in the void, not yet bound to any question.",
    dark_matter_count: "fragments",
    link_to_question: "Link to question",
    promote_to_question: "Promote to question",
    no_dark_matter: "No dark matter. All thoughts have found their orbit.",
    back_home: "Back to Home",
    select_question: "Select a question",
    cancel: "Cancel"
  },
  zh: {
    living_questions: "鲜活的问题",
    problems_mind: "此刻盘踞在你心头的问题。",
    recall_label: "回想一条线",
    recall_placeholder: "写下一个词、一个担忧、一个名字...",
    recall_hint: "轻轻一找——只筛选鲜活的问题。",
    clear_recall: "清空回想",
    no_recall_results: "没有匹配的鲜活问题。",
    space_empty: "空空如也。",
    no_question_yet: "你的思绪尚未凝聚成一个问题。",
    just_write: "尽管写。结构会自然浮现。",
    last_active: "最近活跃",
    write_placeholder: "在想什么？尽管丢进来...",
    absorbing: "正在吸收...",
    saving: "正在保存",
    cast: "投掷",
    related_hint: "可能与此相关",
    view_question: "查看",
    merge_prompt: "可能是同一个问题：",
    merge_action: "合并",
    separate_action: "保持独立",
    current_problem: "当前问题",
    initiated_on: "发起于",
    no_thoughts_here: "尚无思绪汇聚于此。",
    add_thought_stream: "向此流中投入思绪",
    section_claims: "判断",
    section_evidence: "证据",
    section_triggers: "触发物",
    section_other: "其他",
    no_claims: "尚无判断。",
    no_evidence: "尚无证据。",
    no_triggers: "尚无触发物。",
    no_other: "暂无其他内容。",
    footer_philosophy: "意义的纹理会自行舒展。",
    back_problems: "回到问题列表",
    problem_not_found: "未找到该问题。",
    // Type labels
    type_question: "问题",
    type_claim: "主张",
    type_evidence: "证据",
    type_trigger: "灵感",
    type_uncategorized: "未分类",
    // Dark Matter
    dark_matter: "暗物质",
    dark_matter_desc: "游离在虚空中的碎片，尚未被任何问题捕获。",
    dark_matter_count: "个碎片",
    link_to_question: "关联到问题",
    promote_to_question: "升级为问题",
    no_dark_matter: "没有暗物质。所有思绪都已找到归宿。",
    back_home: "回到首页",
    select_question: "选择一个问题",
    cancel: "取消"
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
