import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

const BASE_URL = 'https://cognitive-space.pages.dev';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

type SeoConfig = {
  title: string;
  description: string;
  image?: string;
  canonical?: string;
};

const normalizePath = (path: string) => {
  if (!path) return '/';
  const trimmed = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const getCanonical = (path: string) => {
  const normalized = normalizePath(path);
  if (normalized === '/') return `${BASE_URL}/`;
  return `${BASE_URL}${normalized}`;
};

const setMetaTag = (selector: string, attrs: Record<string, string>) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'content') return;
      element?.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  Object.entries(attrs).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
};

const setLinkTag = (rel: string, href: string) => {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

const SeoManager = () => {
  const { t, language } = useAppContext();
  const location = useLocation();

  useEffect(() => {
    const path = normalizePath(location.pathname);
    let config: SeoConfig;
    const isPublicRoute = path === '/' || path === '/privacy' || path === '/about';

    if (path.startsWith('/question/')) {
      config = {
        title: t('seo_title_question'),
        description: t('seo_desc_question')
      };
    } else {
      config = (() => {
        switch (path) {
          case '/write':
            return {
              title: t('seo_title_write'),
              description: t('seo_desc_write')
            };
          case '/wandering-planet':
            return {
              title: t('seo_title_wandering_planet'),
              description: t('seo_desc_wandering_planet')
            };
          case '/privacy':
            return {
              title: t('seo_title_privacy'),
              description: t('seo_desc_privacy')
            };
          case '/about':
            return {
              title: t('seo_title_about'),
              description: t('seo_desc_about')
            };
          case '/':
          default:
            return {
              title: t('seo_title_home'),
              description: t('seo_desc_home')
            };
        }
      })();
    }

    const canonical = config.canonical || getCanonical(path);
    const image = config.image || DEFAULT_IMAGE;
    const robots = isPublicRoute
      ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
      : 'noindex,nofollow';

    document.documentElement.lang = language;
    document.title = config.title;

    setMetaTag('meta[name="title"]', { name: 'title', content: config.title });
    setMetaTag('meta[name="description"]', { name: 'description', content: config.description });
    setMetaTag('meta[name="robots"]', { name: 'robots', content: robots });
    setMetaTag('meta[property="og:title"]', { property: 'og:title', content: config.title });
    setMetaTag('meta[property="og:description"]', { property: 'og:description', content: config.description });
    setMetaTag('meta[property="og:url"]', { property: 'og:url', content: canonical });
    setMetaTag('meta[property="og:image"]', { property: 'og:image', content: image });
    setMetaTag('meta[property="twitter:title"]', { property: 'twitter:title', content: config.title });
    setMetaTag('meta[property="twitter:description"]', { property: 'twitter:description', content: config.description });
    setMetaTag('meta[property="twitter:url"]', { property: 'twitter:url', content: canonical });
    setMetaTag('meta[property="twitter:image"]', { property: 'twitter:image', content: image });

    setLinkTag('canonical', canonical);
  }, [language, location.pathname, t]);

  return null;
};

export default SeoManager;
