import { IS_MOCK } from './env';

const MODULE_INTEGRATION = Object.freeze({
  home: { integrated: true, reason: '' },
  appointments: { integrated: true, reason: '' },
  orders: { integrated: true, reason: '' },
  track: { integrated: true, reason: '' },
  records: { integrated: true, reason: '' },
  vitals: {
    integrated: false,
    reason: 'Backend patient vitals endpoint is not implemented yet.',
  },
  chat: {
    integrated: false,
    reason: 'Backend patient chat endpoint is not implemented yet.',
  },
  notifications: { integrated: true, reason: '' },
  profile: { integrated: true, reason: '' },
  settings: { integrated: true, reason: '' },
  support: { integrated: true, reason: '' },
});

export function isPatientModuleIntegrated(moduleId) {
  if (IS_MOCK) return true;
  return Boolean(MODULE_INTEGRATION[moduleId]?.integrated);
}

export function getPatientModuleIntegrationReason(moduleId) {
  if (IS_MOCK) return '';
  return MODULE_INTEGRATION[moduleId]?.reason || '';
}

export function decoratePatientNavItems(navItems) {
  return navItems.map((item) => {
    const integrated = isPatientModuleIntegrated(item.id);
    const reason = getPatientModuleIntegrationReason(item.id);
    return {
      ...item,
      integrated,
      integrationReason: reason,
      label: integrated ? item.label : `${item.label} (Not integrated)`,
    };
  });
}
