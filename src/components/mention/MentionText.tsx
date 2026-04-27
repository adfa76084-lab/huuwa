import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Mention } from '@/types/mention';

interface MentionTextProps {
  content: string;
  textStyle: TextStyle | TextStyle[];
  mentionColor?: string;
  mentions?: Mention[];
}

/**
 * Renders text with @mentions highlighted in blue and tappable.
 * Also supports #hashtags.
 * If mentions array is provided, uses uid for navigation.
 * Otherwise falls back to username-based navigation.
 */
export function MentionText({ content, textStyle, mentionColor = '#3498DB', mentions }: MentionTextProps) {
  const router = useRouter();

  // Build a username→uid lookup
  const usernameToUid: Record<string, string> = {};
  if (mentions) {
    for (const m of mentions) {
      usernameToUid[m.username] = m.uid;
    }
  }

  // Split by both @mention and #hashtag patterns
  const parts = content.split(/([@#][a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF_]+)/g);

  return (
    <Text style={textStyle}>
      {parts.map((part, index) => {
        if (part.startsWith('@') && part.length > 1) {
          const username = part.slice(1);
          const uid = usernameToUid[username];
          return (
            <Text
              key={index}
              style={{ color: mentionColor, fontWeight: '700' }}
              onPress={() => {
                if (uid) {
                  router.push(`/(tabs)/(home)/profile/${uid}` as any);
                }
              }}
            >
              {part}
            </Text>
          );
        }
        if (part.startsWith('#') && part.length > 1) {
          const tag = part.slice(1);
          return (
            <Text
              key={index}
              style={{ color: mentionColor, fontWeight: '600' }}
              onPress={() => router.push(`/(tabs)/(home)/hashtag/${encodeURIComponent(tag)}` as any)}
            >
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}
