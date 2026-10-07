export type GlobalChatModerationAction =
  | 'Warning'
  | 'Restriction'
  | 'PermanentBlock';

export interface GlobalChatModeration {
  action: GlobalChatModerationAction;
  message: string;

  warningCount: number;
  restrictionCount: number;

  restrictedUntil: string | null;

  isChatBlocked: boolean;
}
