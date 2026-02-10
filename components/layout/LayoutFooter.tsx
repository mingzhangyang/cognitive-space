import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { getSessionFooterLine } from '../../services/footerLine';
import { formatTemplate } from '../../utils/text';

const LayoutFooter: React.FC = () => {
  const { t, language } = useAppContext();
  const [footerLine, setFooterLine] = useState<string | null>(null);
  const year = new Date().getFullYear();
  const footerBrandLine = formatTemplate(t('footer_brand_line'), { year });

  useEffect(() => {
    let isActive = true;
    void getSessionFooterLine(language).then((line) => {
      if (!isActive) return;
      setFooterLine(line);
    });
    return () => {
      isActive = false;
    };
  }, [language]);

  return (
    <footer className="relative mt-16 sm:mt-20 py-6 text-center text-mini-up text-subtle dark:text-subtle-dark before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-line dark:before:bg-line-dark">
      <p>{footerLine ?? t('footer_philosophy')}</p>
      <p className="mt-1 flex items-center justify-center gap-2">
        <span>{footerBrandLine}</span>
        <span aria-hidden="true" className="text-muted-300 dark:text-muted-700">
          |
        </span>
        <Link
          to="/privacy"
          className="hover:text-ink dark:hover:text-ink-dark transition-colors"
          aria-label={t('privacy_title')}
        >
          {t('privacy_title')}
        </Link>
        <span aria-hidden="true" className="text-muted-300 dark:text-muted-700">
          |
        </span>
        <a
          href="https://github.com/mingzhangyang/cognitive-space/issues"
          className="hover:text-ink dark:hover:text-ink-dark transition-colors"
          target="_blank"
          rel="noreferrer"
          aria-label={t('issues_title')}
        >
          {t('issues_title')}
        </a>
      </p>
    </footer>
  );
};

export default LayoutFooter;
