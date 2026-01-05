export function useTranslation() {
  // Minimal placeholder translation hook.
  // Replace with real implementation (next-intl or i18n) as needed.
  const t = (key: string) => {
    const dict: Record<string, string> = {
      home: 'Home',
      complaints: 'Complaints',
      assignmentRequests: 'Assignment Requests',
      agents: 'Agents',
      analytics: 'Analytics',
      triage: 'Triage',
      audit: 'Audit',
      notifications: 'Notifications',
      profile: 'Profile',
      settings: 'Settings',
      resolveFast: 'ResolveFast',
      complaintManagement: 'Complaint Management',
      performance: 'Performance',
      logout: 'Logout',
    };
    return dict[key] ?? key;
  };

  return { t };
}

export default useTranslation;
