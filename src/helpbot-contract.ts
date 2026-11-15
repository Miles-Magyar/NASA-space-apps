export const HELPBOT_MESSAGE_LIMIT = 800;
export const HELPBOT_HISTORY_LIMIT = 4;

export interface HelpbotTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface HelpbotSource {
  label: string;
  url: string;
}

export interface HelpbotResponse {
  reply: string;
  sources?: HelpbotSource[];
}
