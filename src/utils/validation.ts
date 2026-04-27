import {
  TWEET_MAX_LENGTH,
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  CHAT_MESSAGE_MAX_LENGTH,
  THREAD_TITLE_MAX_LENGTH,
} from '@/constants/limits';

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Invalid email format';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
}

export function validateUsername(username: string): string | null {
  if (!username.trim()) return 'Username is required';
  if (username.length < USERNAME_MIN_LENGTH) return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  if (username.length > USERNAME_MAX_LENGTH) return `Username must be at most ${USERNAME_MAX_LENGTH} characters`;
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
  return null;
}

export function validateDisplayName(name: string): string | null {
  if (!name.trim()) return 'Display name is required';
  if (name.length > DISPLAY_NAME_MAX_LENGTH) return `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`;
  return null;
}

export function validateTweetContent(content: string): string | null {
  if (!content.trim()) return 'Tweet cannot be empty';
  if (content.length > TWEET_MAX_LENGTH) return `Tweet must be at most ${TWEET_MAX_LENGTH} characters`;
  return null;
}

export function validateBio(bio: string): string | null {
  if (bio.length > BIO_MAX_LENGTH) return `Bio must be at most ${BIO_MAX_LENGTH} characters`;
  return null;
}

export function validateChatMessage(message: string): string | null {
  if (!message.trim()) return 'Message cannot be empty';
  if (message.length > CHAT_MESSAGE_MAX_LENGTH) return `Message must be at most ${CHAT_MESSAGE_MAX_LENGTH} characters`;
  return null;
}

export function validateThreadTitle(title: string): string | null {
  if (!title.trim()) return 'Thread title is required';
  if (title.length > THREAD_TITLE_MAX_LENGTH) return `Title must be at most ${THREAD_TITLE_MAX_LENGTH} characters`;
  return null;
}
