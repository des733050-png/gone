// ─── PageSeo.js ───────────────────────────────────────────────────────────────
// Renders <title> and <meta description> for web only (no-op on native).
// Title pattern: "{Page} · {Role} Dashboard · GONEP Provider"
// e.g. "Appointments · Hospital Admin Dashboard · GONEP Provider"
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Platform } from 'react-native';
import { Helmet } from 'react-helmet-async';
import { SEO_CONFIG } from './meta';
import { APP_CONFIG } from '../config/env';
import { ROLE_LABELS } from '../config/roles';

export function PageSeo({ pageKey, user }) {
  if (Platform.OS !== 'web') return null;

  const config   = SEO_CONFIG[pageKey] || SEO_CONFIG.default;
  const roleLabel = user?.role ? ROLE_LABELS[user.role] || 'Provider' : 'Provider';
  const title    = config.title
    ? `${config.title} · ${roleLabel} Dashboard · ${APP_CONFIG.APP_NAME}`
    : `${APP_CONFIG.APP_NAME} · ${roleLabel}`;

  return (
    <Helmet>
      <title>{title}</title>
      {config.description ? (
        <meta name="description" content={config.description} />
      ) : null}
      <meta name="application-name" content={APP_CONFIG.APP_NAME} />
    </Helmet>
  );
}
