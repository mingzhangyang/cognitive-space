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
    analyzing: "Analyzing...",
    analysis_notice_title: "Analysis complete",
    analysis_notice_question: "Promoted to a Question.",
    analysis_notice_linked: "Filed under \"{title}\".",
    analysis_notice_moved: "Moved out of Dark Matter.",
    downgrade_question_action: "Release",
    downgrade_question_title: "Release this question?",
    downgrade_question_body: "It will become {type}.",
    downgrade_question_related: "Releases {count} related notes back into Dark Matter.",
    downgrade_question_related_none: "No related notes to release.",
    downgrade_question_label: "Downgrade to",
    downgrade_question_destination_label: "Related notes",
    downgrade_question_destination_release: "Release to Dark Matter",
    downgrade_question_destination_relink: "Relink to another question",
    downgrade_question_select_question: "Choose a question",
    downgrade_question_relink: "Links this note and {count} related notes to \"{title}\".",
    downgrade_question_relink_none: "No other questions to link to.",
    assistant_inbox_label: "Assistant",
    assistant_inbox_title: "Message Center",
    assistant_inbox_running: "Running",
    assistant_inbox_suggestions: "Suggestions",
    assistant_inbox_empty: "No messages right now.",
    assistant_job_note: "Analyzing a note",
    assistant_job_dark_matter: "Analyzing dark matter ({count})",
    assistant_suggestion_note: "Note suggestion",
    assistant_suggestion_type: "Suggested type",
    assistant_suggestion_related: "Related question",
    assistant_suggestion_confidence: "Confidence",
    assistant_suggestion_apply: "Apply",
    assistant_suggestion_dismiss: "Dismiss",
    assistant_suggestion_dark_matter: "Dark Matter analysis",
    assistant_dark_matter_ready_title: "Dark Matter results ready",
    assistant_dark_matter_ready_body: "{count} possible groupings found.",
    assistant_dark_matter_ready_empty: "No strong groupings yet.",
    assistant_suggestion_open_dark_matter: "Open Dark Matter",
    saving: "Saving",
    save: "Save",
    edit: "Edit",
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
    visualize: "Visualize",
    hide_visualization: "Hide visualization",
    question_constellation: "Question Constellation",
    stats_related_notes: "Related notes",
    stats_type_distribution: "Type distribution",
    stats_last_updated: "Last updated",
    stats_relation_density: "Relation density",
    help: "Help",
    menu_language_label: "Language",
    menu_language_action_en: "Switch to 中文",
    menu_language_action_zh: "Switch to English",
    menu_theme_label: "Theme",
    menu_theme_action_light: "Switch to Dark",
    menu_theme_action_dark: "Switch to Light",
    menu_help_action: "Guide on GitHub",
    menu_open: "Open menu",
    menu_close: "Close menu",
    privacy_title: "Privacy Policy",
    issues_title: "Feedback",
    privacy_updated: "Last updated: February 3, 2026",
    privacy_intro: "Cognitive Space runs primarily in your browser. We store your notes locally and do not sell your data.",
    privacy_local_title: "Local storage",
    privacy_local_item_notes: "Notes, links, and related metadata are stored in your browser's IndexedDB.",
    privacy_local_item_prefs: "Language and theme preferences are stored in localStorage.",
    privacy_ai_title: "AI analysis",
    privacy_ai_body: "If you use the AI analysis feature, the text you submit (including dark matter fragments when requesting grouping) and a list of existing question titles are sent to the /api/analyze or /api/dark-matter/analyze endpoints for classification. Those endpoints may be backed by a third-party model provider and may cache responses briefly for performance.",
    privacy_tracking_title: "No ads or analytics",
    privacy_tracking_body: "This app does not embed third-party advertising or analytics scripts. Your hosting provider may still record basic access logs.",
    privacy_choices_title: "Your choices",
    privacy_choices_body: "You can delete notes within the app or clear site data using your browser settings.",
    privacy_changes_title: "Changes",
    privacy_changes_body: "We will update this page with a new date when this policy changes.",
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
    cancel: "Cancel",
    delete: "Delete",
    confirm: "Confirm",
    dark_matter_ai_title: "Possible constellations",
    dark_matter_ai_desc: "Optional AI grouping for drifting fragments.",
    dark_matter_ai_action: "Analyze Dark Matter",
    dark_matter_ai_running: "Listening for patterns...",
    dark_matter_ai_empty: "No strong groupings yet.",
    dark_matter_ai_suggestions: "Suggestions",
    dark_matter_ai_kind_new: "Proposed question",
    dark_matter_ai_kind_existing: "Existing question",
    dark_matter_ai_action_create: "Create question + link all",
    dark_matter_ai_action_link: "Link all",
    dark_matter_ai_action_dismiss: "Dismiss",
    dark_matter_ai_confidence_likely: "Likely",
    dark_matter_ai_confidence_possible: "Possible",
    dark_matter_ai_confidence_loose: "Loose",
    load_more: "Load more",
    loading_more: "Loading more...",
    dark_matter_confirm_create: "Create question \"{title}\" and link {count} fragments?",
    dark_matter_confirm_link: "Link {count} fragments to \"{title}\"?"
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
    analyzing: "正在分析...",
    analysis_notice_title: "分析完成",
    analysis_notice_question: "已升级为问题。",
    analysis_notice_linked: "已归入「{title}」。",
    analysis_notice_moved: "已移出暗物质。",
    downgrade_question_action: "释放",
    downgrade_question_title: "释放这个问题？",
    downgrade_question_body: "它将变为{type}。",
    downgrade_question_related: "将 {count} 条相关笔记放回暗物质。",
    downgrade_question_related_none: "没有关联笔记需要释放。",
    downgrade_question_label: "降为",
    downgrade_question_destination_label: "相关笔记",
    downgrade_question_destination_release: "放回暗物质",
    downgrade_question_destination_relink: "改归到另一个问题",
    downgrade_question_select_question: "选择一个问题",
    downgrade_question_relink: "将此条与 {count} 条相关笔记归入「{title}」。",
    downgrade_question_relink_none: "没有可归入的问题。",
    assistant_inbox_label: "助手",
    assistant_inbox_title: "消息中心",
    assistant_inbox_running: "运行中",
    assistant_inbox_suggestions: "建议",
    assistant_inbox_empty: "暂无消息。",
    assistant_job_note: "正在分析一条笔记",
    assistant_job_dark_matter: "正在分析暗物质（{count} 条）",
    assistant_suggestion_note: "笔记建议",
    assistant_suggestion_type: "建议类型",
    assistant_suggestion_related: "相关问题",
    assistant_suggestion_confidence: "置信度",
    assistant_suggestion_apply: "应用",
    assistant_suggestion_dismiss: "忽略",
    assistant_suggestion_dark_matter: "暗物质分析",
    assistant_dark_matter_ready_title: "暗物质结果已就绪",
    assistant_dark_matter_ready_body: "发现 {count} 组可能关联。",
    assistant_dark_matter_ready_empty: "暂未发现清晰的归类。",
    assistant_suggestion_open_dark_matter: "打开暗物质",
    saving: "正在保存",
    save: "保存",
    edit: "编辑",
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
    visualize: "可视化",
    hide_visualization: "收起可视化",
    question_constellation: "问题星图",
    stats_related_notes: "关联笔记数",
    stats_type_distribution: "类型分布",
    stats_last_updated: "最近更新",
    stats_relation_density: "关联密度",
    help: "使用指南",
    menu_language_label: "语言",
    menu_language_action_en: "切换到 中文",
    menu_language_action_zh: "切换到 English",
    menu_theme_label: "主题",
    menu_theme_action_light: "切换到深色",
    menu_theme_action_dark: "切换到浅色",
    menu_help_action: "查看 GitHub 指南",
    menu_open: "打开菜单",
    menu_close: "关闭菜单",
    privacy_title: "隐私政策",
    issues_title: "反馈",
    privacy_updated: "更新日期：2026年2月3日",
    privacy_intro: "Cognitive Space 主要在你的浏览器中运行。你的笔记保存在本地，我们不会出售你的数据。",
    privacy_local_title: "本地存储",
    privacy_local_item_notes: "笔记、链接与相关元数据保存在浏览器的 IndexedDB 中。",
    privacy_local_item_prefs: "语言与主题偏好保存在 localStorage 中。",
    privacy_ai_title: "AI 分析",
    privacy_ai_body: "当你使用 AI 分析功能时，你提交的文本（包括请求暗物质归类时的碎片）与已有问题标题列表会发送至 /api/analyze 或 /api/dark-matter/analyze 进行分类处理。该端点可能由第三方模型服务提供，并会为性能进行短暂缓存。",
    privacy_tracking_title: "无广告或分析",
    privacy_tracking_body: "本应用不内嵌第三方广告或分析脚本。你的托管平台仍可能记录基础访问日志。",
    privacy_choices_title: "你的选择",
    privacy_choices_body: "你可以在应用内删除笔记，或通过浏览器设置清除站点数据。",
    privacy_changes_title: "变更",
    privacy_changes_body: "如本政策更新，我们会在此页更新日期。",
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
    cancel: "取消",
    delete: "删除",
    confirm: "确认",
    dark_matter_ai_title: "可能的星群",
    dark_matter_ai_desc: "可选的 AI 归类建议。",
    dark_matter_ai_action: "分析暗物质",
    dark_matter_ai_running: "正在捕捉关联...",
    dark_matter_ai_empty: "暂未发现清晰的归类。",
    dark_matter_ai_suggestions: "建议",
    dark_matter_ai_kind_new: "新问题建议",
    dark_matter_ai_kind_existing: "关联到已有问题",
    dark_matter_ai_action_create: "创建问题并关联",
    dark_matter_ai_action_link: "全部关联",
    dark_matter_ai_action_dismiss: "忽略",
    dark_matter_ai_confidence_likely: "较可能",
    dark_matter_ai_confidence_possible: "可能",
    dark_matter_ai_confidence_loose: "松散",
    load_more: "加载更多",
    loading_more: "正在加载...",
    dark_matter_confirm_create: "创建问题「{title}」并关联 {count} 条碎片？",
    dark_matter_confirm_link: "将 {count} 条碎片关联到「{title}」？"
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
