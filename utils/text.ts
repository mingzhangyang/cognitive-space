export const formatTemplate = (template: string, params: Record<string, string | number>) => {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
};

export const containsCjk = (text: string) => /[\u4e00-\u9fff]/.test(text);

export const truncate = (text: string, max = 80) => (text.length > max ? `${text.slice(0, max)}...` : text);
