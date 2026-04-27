import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize } from '@/constants/theme';

const ACCENT = '#6C5CE7';
const GREEN = '#4CAF50';

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (form: {
    title: string;
    description: string;
    date: Date;
    endDate: Date | null;
    allDay: boolean;
    location: string | null;
    rsvpEnabled: boolean;
  }) => Promise<void>;
}

function CheckBox({ checked, color }: { checked: boolean; color: string }) {
  return (
    <View
      style={[
        styles.checkbox,
        { backgroundColor: checked ? color : '#D1D5DB', borderColor: checked ? color : '#D1D5DB' },
      ]}
    >
      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
    </View>
  );
}

export function CreateEventModal({ visible, onClose, onSubmit }: CreateEventModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [rsvpEnabled, setRsvpEnabled] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const reset = () => {
    setTitle('');
    setAllDay(false);
    setStartDate(new Date());
    setEndDate(null);
    setLocation('');
    setRsvpEnabled(true);
    setNotifyEnabled(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'イベント名を入力してください');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: '',
        date: startDate,
        endDate,
        allDay,
        location: location.trim() || null,
        rsvpEnabled,
      });
      reset();
      onClose();
    } catch {
      Alert.alert('エラー', 'イベントの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${day} ${h}:${min}`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Red Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>イベント</Text>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.bodyContent}
        >
          {/* Title Input */}
          <View style={styles.titleSection}>
            <TextInput
              style={[styles.titleInput, { color: colors.text }]}
              placeholder="イベント名を入力"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              multiline
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Form Rows */}
          <View style={styles.formSection}>
            {/* All Day */}
            <TouchableOpacity
              style={styles.formRow}
              onPress={() => setAllDay((v) => !v)}
              activeOpacity={0.6}
            >
              <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
              <Text style={[styles.formLabel, { color: colors.text }]}>終日</Text>
              <CheckBox checked={allDay} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Start Date */}
            <TouchableOpacity
              style={styles.formSubRow}
              onPress={() => setShowStartPicker(true)}
              activeOpacity={0.6}
            >
              <Text style={[styles.formSubLabel, { color: colors.text }]}>
                開始：{formatDate(startDate)}
              </Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode={allDay ? 'date' : 'datetime'}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (selected) setStartDate(selected);
                }}
                minimumDate={new Date()}
              />
            )}

            {/* End Date */}
            <TouchableOpacity
              style={styles.formSubRow}
              onPress={() => setShowEndPicker(true)}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  styles.formSubLabel,
                  { color: endDate ? colors.text : colors.textTertiary },
                ]}
              >
                {endDate ? `終了：${formatDate(endDate)}` : '終了時間'}
              </Text>
            </TouchableOpacity>

            {showEndPicker && (
              <DateTimePicker
                value={endDate ?? startDate}
                mode={allDay ? 'date' : 'datetime'}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (selected) setEndDate(selected);
                }}
                minimumDate={startDate}
              />
            )}

            {/* Location */}
            <View style={styles.formRow}>
              <Ionicons name="location-outline" size={22} color={colors.textSecondary} />
              <TextInput
                style={[styles.formTextInput, { color: colors.text }]}
                placeholder="場所を入力"
                placeholderTextColor={colors.textTertiary}
                value={location}
                onChangeText={setLocation}
                maxLength={200}
              />
            </View>

            {/* RSVP */}
            <TouchableOpacity
              style={styles.formRow}
              onPress={() => setRsvpEnabled((v) => !v)}
              activeOpacity={0.6}
            >
              <Ionicons name="person-outline" size={22} color={colors.textSecondary} />
              <Text style={[styles.formLabel, { color: colors.text }]}>参加確認</Text>
              <CheckBox checked={rsvpEnabled} color={ACCENT} />
            </TouchableOpacity>

            {/* Notification */}
            <TouchableOpacity
              style={styles.formRow}
              onPress={() => setNotifyEnabled((v) => !v)}
              activeOpacity={0.6}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
              <Text style={[styles.formLabel, { color: colors.text }]}>通知を送信</Text>
              <CheckBox checked={notifyEnabled} color={ACCENT} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom || Spacing.lg }]}>
          <TouchableOpacity
            style={[styles.bottomBtn, styles.cancelBtn]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.bottomBtn,
              styles.submitBtn,
              (!title.trim() || loading) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            activeOpacity={0.7}
            disabled={!title.trim() || loading}
          >
            <Text style={styles.submitBtnText}>完了</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },

  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
  },

  // Title
  titleSection: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    minHeight: 120,
  },
  titleInput: {
    fontSize: FontSize.xxl,
    fontWeight: '300',
    lineHeight: 34,
  },

  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },

  // Form
  formSection: {
    paddingVertical: Spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
  },
  formLabel: {
    flex: 1,
    fontSize: FontSize.md,
  },
  formSubRow: {
    paddingLeft: Spacing.xl + 22 + Spacing.lg,
    paddingRight: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  formSubLabel: {
    fontSize: FontSize.md,
  },
  formTextInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },

  // Checkbox
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#9E9E9E',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: GREEN,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
