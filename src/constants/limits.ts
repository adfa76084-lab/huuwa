export const TWEET_MAX_LENGTH = 280;
export const THREAD_TITLE_MAX_LENGTH = 100;
export const THREAD_REPLY_MAX_LENGTH = 1000;
export const BIO_MAX_LENGTH = 160;
export const DISPLAY_NAME_MAX_LENGTH = 50;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_MIN_LENGTH = 3;
export const CHAT_MESSAGE_MAX_LENGTH = 500;
export const GROUP_NAME_MAX_LENGTH = 50;
export const MAX_TWEET_IMAGES = 4;
export const MAX_HOBBIES = 10;
export const PAGE_SIZE = 20;
export const SHORTS_PAGE_SIZE = 8;
export const CHAT_PAGE_SIZE = 30;
export const IMAGE_MAX_WIDTH = 1080;
export const IMAGE_QUALITY = 0.8;
export const SHORT_CAPTION_MAX_LENGTH = 150;
export const SHORT_MAX_DURATION = 60; // seconds
export const OPEN_CHAT_NAME_MAX_LENGTH = 50;
export const OPEN_CHAT_DESC_MAX_LENGTH = 200;

// Rich media limits
export const VOICE_MAX_DURATION_MS = 60_000; // 60 seconds (LINE-style)
export const VOICE_MIN_DURATION_MS = 1_000; // 1 second — anything shorter is auto-cancelled
export const VIDEO_REPLY_MAX_DURATION = 120; // 2 minutes (seconds)
export const FILE_MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 6;
export const POLL_QUESTION_MAX_LENGTH = 200;
export const POLL_OPTION_MAX_LENGTH = 60;

// Hashtag limits
export const MAX_HASHTAGS_PER_TWEET = 10;
export const HASHTAG_MAX_LENGTH = 30;
export const HASHTAG_SUGGEST_LIMIT = 8;
export const TRENDING_HASHTAGS_LIMIT = 10;

// Mention limits
export const MAX_MENTIONS_PER_POST = 10;
export const MENTION_SUGGEST_LIMIT = 8;
