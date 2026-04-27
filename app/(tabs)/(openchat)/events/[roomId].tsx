import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { ChatEvent } from '@/types/chat';
import {
  getEvents,
  createEvent,
  deleteEvent,
  toggleAttendance,
  CreateEventForm,
} from '@/services/api/eventService';
import { EventCard } from '@/components/chat/EventCard';
import { CreateEventModal } from '@/components/chat/CreateEventModal';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Spacing, FontSize, Shadows } from '@/constants/theme';

const ACCENT = '#6C5CE7';
const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_SIZE = Math.floor(SCREEN_WIDTH / 7);
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface CalendarDay {
  year: number;
  month: number; // 0-indexed
  day: number;
  isCurrentMonth: boolean;
}

function getCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      year: month === 0 ? year - 1 : year,
      month: month === 0 ? 11 : month - 1,
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ year, month, day: d, isCurrentMonth: true });
  }

  // Next month padding (fill to 42 = 6 rows)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({
      year: month === 11 ? year + 1 : year,
      month: month === 11 ? 0 : month + 1,
      day: d,
      isCurrentMonth: false,
    });
  }

  return days;
}

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function EventsScreen() {
  const colors = useThemeColors();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user, userProfile } = useAuth();

  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!roomId) return;
    const data = await getEvents(roomId);
    setEvents(data);
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  // Calendar days for current view
  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // Set of date keys that have events
  const eventDateSet = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      const d = e.date?.toDate?.();
      if (d) {
        set.add(toDateKey(d.getFullYear(), d.getMonth(), d.getDate()));
      }
    });
    return set;
  }, [events]);

  // Filtered events for display
  const filteredEvents = useMemo(() => {
    if (selectedDate) {
      return events.filter((e) => {
        const d = e.date?.toDate?.();
        if (!d) return false;
        return toDateKey(d.getFullYear(), d.getMonth(), d.getDate()) === selectedDate;
      });
    }
    // Show all events for the view month
    return events.filter((e) => {
      const d = e.date?.toDate?.();
      if (!d) return false;
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    });
  }, [events, selectedDate, viewYear, viewMonth]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(null);
  };

  const handleDayPress = (cd: CalendarDay) => {
    if (!cd.isCurrentMonth) {
      // Navigate to that month
      setViewYear(cd.year);
      setViewMonth(cd.month);
      setSelectedDate(null);
      return;
    }
    const key = toDateKey(cd.year, cd.month, cd.day);
    setSelectedDate((prev) => (prev === key ? null : key));
  };

  const handleCreate = async (form: CreateEventForm) => {
    if (!roomId || !user || !userProfile) return;
    await createEvent(roomId, user.uid, userProfile, form);
    await load();
  };

  const handleToggleAttendance = async (eventId: string) => {
    if (!roomId || !user) return;
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    const isAttending = event.attendees?.includes(user.uid);
    await toggleAttendance(roomId, eventId, user.uid, isAttending);
    await load();
  };

  const handleDelete = (eventId: string) => {
    Alert.alert('イベントを削除', 'このイベントを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          if (!roomId) return;
          await deleteEvent(roomId, eventId);
          await load();
        },
      },
    ]);
  };

  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const todayDateStr = `${today.getMonth() + 1}/${today.getDate()}`;

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Announcement Banner */}
        {showBanner && (
          <View style={styles.banner}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>大事なイベントはアナウンス！</Text>
              <Text style={styles.bannerDescription}>
                メンバーに通知を送って参加を促しましょう
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowBanner(false)}
              hitSlop={8}
              style={styles.bannerClose}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Calendar Section */}
        <View style={styles.calendarContainer}>
          {/* Year + Today Button */}
          <View style={styles.calendarTopRow}>
            <Text style={styles.yearText}>{viewYear}年</Text>
            <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              <Text style={styles.todayButtonText}>{todayDateStr}</Text>
            </TouchableOpacity>
          </View>

          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goToPrevMonth} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.monthText}>{viewMonth + 1}月</Text>
            <TouchableOpacity onPress={goToNextMonth} hitSlop={12}>
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((wd) => (
              <View key={wd} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{wd}</Text>
              </View>
            ))}
          </View>

          {/* Day Grid */}
          <View style={styles.dayGrid}>
            {calendarDays.map((cd, index) => {
              const key = toDateKey(cd.year, cd.month, cd.day);
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              const hasEvent = eventDateSet.has(key);

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.dayCell}
                  onPress={() => handleDayPress(cd)}
                  activeOpacity={0.6}
                >
                  {isToday && <View style={styles.todayCircle} />}
                  {isSelected && !isToday && <View style={styles.selectedCircle} />}
                  <Text
                    style={[
                      styles.dayText,
                      !cd.isCurrentMonth && styles.dayTextOtherMonth,
                      isToday && styles.dayTextToday,
                    ]}
                  >
                    {cd.day}
                  </Text>
                  {hasEvent && <View style={styles.eventDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Events List */}
        <View style={styles.eventsSection}>
          {filteredEvents.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              イベントはありません
            </Text>
          ) : (
            filteredEvents.map((item) => (
              <EventCard
                key={item.id}
                event={item}
                currentUid={user?.uid ?? ''}
                onToggleAttendance={() => handleToggleAttendance(item.id)}
                canDelete={item.authorUid === user?.uid}
                onDelete={() => handleDelete(item.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, Shadows.lg]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <CreateEventModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Banner
  banner: {
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  bannerDescription: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  bannerClose: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },

  // Calendar
  calendarContainer: {
    backgroundColor: ACCENT,
    paddingBottom: Spacing.md,
  },
  calendarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  yearText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  monthText: {
    color: '#FFFFFF',
    fontSize: FontSize.xl,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'center',
  },

  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  weekdayCell: {
    width: DAY_SIZE,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  weekdayText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: FontSize.xs,
    fontWeight: '600',
  },

  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '500',
    zIndex: 1,
  },
  dayTextOtherMonth: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  dayTextToday: {
    color: ACCENT,
    fontWeight: '700',
  },
  todayCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  selectedCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  eventDot: {
    position: 'absolute',
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },

  // Events List
  eventsSection: {
    paddingTop: Spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: FontSize.md,
    paddingVertical: Spacing.xxxl,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
