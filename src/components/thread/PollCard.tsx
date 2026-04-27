import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Poll } from '@/types/thread';
import { getPoll, votePoll } from '@/services/api/pollService';

interface PollCardProps {
  pollId: string;
}

export function PollCard({ pollId }: PollCardProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [voting, setVoting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getPoll(pollId).then(setPoll);
  }, [pollId]);

  const myVote = poll && user ? poll.voterUids?.[user.uid] : undefined;

  // Sync selected state with server vote
  useEffect(() => {
    if (myVote) setSelected(myVote);
  }, [myVote]);

  const hasVoted = !!myVote;

  const handleSelect = (optionId: string) => {
    if (hasVoted) return;
    setSelected((prev) => (prev === optionId ? null : optionId));
  };

  const handleSubmitVote = useCallback(async () => {
    if (!user || !poll || voting || !selected) return;
    if (myVote === selected) return;
    setVoting(true);
    try {
      await votePoll(pollId, selected, user.uid, myVote);
      const updated = await getPoll(pollId);
      setPoll(updated);
    } catch {
      // silently fail
    } finally {
      setVoting(false);
    }
  }, [user, poll, pollId, myVote, selected, voting]);

  if (!poll) return null;

  const maxVotes = Math.max(...poll.options.map((o) => o.votes), 1);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Question */}
      <Text style={[styles.question, { color: colors.text }]}>{poll.question}</Text>

      {/* Subtitle */}
      {!hasVoted && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>回答を1件選択</Text>
      )}

      {/* Options */}
      <View style={styles.optionsList}>
        {poll.options.map((option) => {
          const percent = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
          const isMyVote = myVote === option.id;
          const isSelected = selected === option.id;
          const isWinning = option.votes === maxVotes && poll.totalVotes > 0;

          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => hasVoted ? undefined : handleSelect(option.id)}
              disabled={voting || hasVoted}
              activeOpacity={0.7}
              style={[
                styles.option,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: (isSelected || isMyVote) ? colors.primary : colors.surfaceVariant,
                },
              ]}
            >
              {/* Progress fill (after voting) */}
              {hasVoted && (
                <View
                  style={[
                    styles.optionFill,
                    {
                      backgroundColor: isMyVote ? colors.primary + '30' : colors.border + '80',
                      width: `${percent}%`,
                    },
                  ]}
                />
              )}

              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    (isMyVote || isWinning) && { fontWeight: '600' },
                  ]}
                  numberOfLines={2}
                >
                  {option.text}
                </Text>

                {hasVoted ? (
                  <Text
                    style={[
                      styles.percent,
                      { color: isWinning ? colors.primary : colors.textSecondary },
                      isWinning && { fontWeight: '700' },
                    ]}
                  >
                    {Math.round(percent)}%
                  </Text>
                ) : (
                  /* Radio circle */
                  <View
                    style={[
                      styles.radio,
                      { borderColor: isSelected ? colors.primary : colors.textTertiary },
                      isSelected && { borderWidth: 5, borderColor: colors.primary },
                    ]}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Vote button (before voting) */}
      {!hasVoted && (
        <TouchableOpacity
          onPress={handleSubmitVote}
          disabled={!selected || voting}
          activeOpacity={0.7}
          style={[
            styles.voteButton,
            {
              backgroundColor: selected ? colors.primary : colors.primary + '40',
            },
          ]}
        >
          <Text style={styles.voteButtonText}>投票</Text>
        </TouchableOpacity>
      )}

      {/* Footer */}
      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        {poll.totalVotes}票
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    alignSelf: 'stretch',
    width: '100%',
  },
  question: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.sm,
  },
  optionsList: {
    gap: 6,
  },
  option: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  optionFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  percent: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginLeft: Spacing.sm,
  },
  voteButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  voteButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  footer: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
});
