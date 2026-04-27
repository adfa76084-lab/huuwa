export const Collections = {
  USERS: 'users',
  TWEETS: 'tweets',
  LIKES: 'likes',
  BOOKMARKS: 'bookmarks',
  FOLLOWS: 'follows',
  THREADS: 'threads',
  THREAD_REPLIES: 'replies', // subcollection under threads
  CHAT_ROOMS: 'chatRooms',
  CHAT_MESSAGES: 'messages', // subcollection under chatRooms
  CATEGORIES: 'categories',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  SHORTS: 'shorts',
  SHORT_LIKES: 'shortLikes',
  SHORT_COMMENTS: 'comments', // subcollection under shorts
  POLLS: 'polls',
  CHAT_NOTES: 'notes',        // subcollection under chatRooms
  CHAT_EVENTS: 'events',      // subcollection under chatRooms
  CHAT_FILES: 'files',        // subcollection under chatRooms
  CHAT_NOTIFICATION_PREFS: 'chatNotificationPrefs',
  HASHTAGS: 'hashtags',
  TWEET_VIEWS: 'tweetViews',
  SHORT_BOOKMARKS: 'shortBookmarks',
  FOLLOW_REQUESTS: 'followRequests',
  THREAD_LIKES: 'threadLikes',
} as const;
