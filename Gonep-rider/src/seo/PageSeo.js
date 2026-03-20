import React from 'react';
import { Platform } from 'react-native';
import { Helmet } from 'react-helmet-async';
import { SEO_CONFIG } from './meta';
import { APP_CONFIG } from '../config/env';

export function PageSeo({ pageKey }) {
  if (Platform.OS !== 'web') {
    return null;
  }

  const config = SEO_CONFIG[pageKey] || SEO_CONFIG.default;
  const title = config.title
    ? `${config.title} · ${APP_CONFIG.APP_NAME}`
    : APP_CONFIG.APP_NAME;

  return (
    <Helmet>
      <title>{title}</title>
      {config.description ? (
        <meta name="description" content={config.description} />
      ) : null}
      {Array.isArray(config.keywords) && config.keywords.length ? (
        <meta name="keywords" content={config.keywords.join(', ')} />
      ) : null}
      <meta name="application-name" content={APP_CONFIG.APP_NAME} />
    </Helmet>
  );
}

