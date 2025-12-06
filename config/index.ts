// config/index.ts
import { clientConfig } from './client';

export { clientConfig };
export type { ClientConfig } from './client';

export const getCompanyName = () => clientConfig.company.name;
export const getAdminRole = () => clientConfig.platform.adminRole;
export const getUrlPrefix = () => clientConfig.platform.urlPrefix;
export const getCoachName = () => clientConfig.coaching.coachName;
export const getPortalRoute = (path: string) => '/' + clientConfig.platform.urlPrefix + path;
export const getThemeColors = () => clientConfig.theme.colors;
export const isFeatureEnabled = (feature: keyof typeof clientConfig.platform.features) =>
  clientConfig.platform.features[feature];
export const replaceTemplateVars = (text: string): string => {
  return text
    .replace(/{company}/g, clientConfig.company.name)
    .replace(/{coach}/g, clientConfig.coaching.coachName)
    .replace(/{year}/g, String(new Date().getFullYear()))
    .replace(/{email}/g, clientConfig.company.supportEmail);
};
