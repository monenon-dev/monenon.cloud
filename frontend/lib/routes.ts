/** App Router paths — `app/` 폴더 구조와 동기화 */
export const routes = {
  home: "/",
  addressbook: "/addressbook",
  agent: {
    history: "/agent/history",
  },
  lifestyle: {
    closet: "/lifestyle/closet",
    refrigerator: "/lifestyle/refrigerator",
    chats: "/lifestyle/chats",
    music: "/lifestyle/music",
    dashboard: "/lifestyle/dashboard",
    schedule: "/lifestyle/schedule",
    settings: "/lifestyle/settings",
  },
  oauth: {
    login: "/oauth/login",
    signup: "/oauth/signup",
    onboarding: "/oauth/onboarding",
    mypage: "/oauth/mypage",
    admin: {
      root: "/oauth/admin",
      login: "/oauth/admin/login",
      dashboard: "/oauth/admin/dashboard",
      userSettings: "/oauth/admin/user-settings",
    },
  },
  mails: {
    mailbox: "/mails/mailbox",
    mail: "/mails/mail",
    calendar: "/mails/calendar",
  },
  lesson: {
    hub: "/lesson",
    titanicHome: "/lesson/titanic-home",
    moneyball: "/lesson/moneyball",
    moneyballChat: "/lesson/moneyball/chat",
    titanicSmith: "/lesson/titanic-home/smith",
    titanicPassengers: "/lesson/titanic-home/passengers",
    vision: "/star-craft/zerg/vision",
    siliconValleyAdmin: "/lesson/silicon-valley/admin",
    samsung: "/lesson/samsung",
    samsungUpload: "/lesson/samsung/upload",
  },
} as const;

export function lifestyleDashboardSection(section: string): string {
  return `${routes.lifestyle.dashboard}?section=${section}`;
}

export function chatsSessionUrl(sessionId: number): string {
  return `${routes.lifestyle.chats}?session=${sessionId}`;
}

export function buildChatsUrl(prompt: string, nonce: string): string {
  const params = new URLSearchParams({ new: "1", prompt, nonce });
  return `${routes.lifestyle.chats}?${params.toString()}`;
}
