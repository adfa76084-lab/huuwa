import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize } from '@/constants/theme';

interface PolicySection {
  heading: string;
  body: string;
}

const TERMS_SECTIONS: PolicySection[] = [
  {
    heading: '第1条 (本規約への同意)',
    body: '本規約は、本サービスを利用するすべての方に適用されます。本サービスをご利用いただいた時点で、本規約に同意いただいたものとみなします。',
  },
  {
    heading: '第2条 (アカウント)',
    body: 'ユーザーは、自身のアカウント情報を適切に管理する責任を負います。アカウントの不正利用が発生した場合、運営は当該アカウントを停止または削除することがあります。',
  },
  {
    heading: '第3条 (禁止事項)',
    body: '法令違反、第三者の権利侵害、誹謗中傷、なりすまし、スパム、運営を妨害する行為などを禁止します。違反が確認された場合、投稿の削除やアカウント停止などの措置を行います。',
  },
  {
    heading: '第4条 (投稿コンテンツ)',
    body: 'ユーザーが投稿したコンテンツの著作権は投稿者に帰属します。ただし、本サービスの提供・改善のために必要な範囲で、運営は投稿コンテンツを利用できるものとします。',
  },
  {
    heading: '第5条 (免責事項)',
    body: '運営は本サービスの内容について正確性・完全性を保証しません。本サービスの利用により生じた損害について、運営は一切の責任を負いません。',
  },
  {
    heading: '第6条 (本規約の変更)',
    body: '運営は、必要と判断した場合に本規約を変更できるものとします。変更後の規約は本サービス上に掲示した時点で効力を生じます。',
  },
];

const PRIVACY_SECTIONS: PolicySection[] = [
  {
    heading: '1. 取得する情報',
    body: 'アカウント登録時にご提供いただくメールアドレス、ユーザー名、プロフィール情報のほか、投稿内容、利用ログ、端末情報などを取得します。',
  },
  {
    heading: '2. 利用目的',
    body: '本サービスの提供・運営、ユーザーサポート、不正利用の防止、機能改善、統計分析、重要なお知らせの通知などに利用します。',
  },
  {
    heading: '3. 第三者提供',
    body: '法令に基づく場合や、ユーザーの同意がある場合を除き、取得した個人情報を第三者へ提供することはありません。',
  },
  {
    heading: '4. 安全管理',
    body: '取得した個人情報は、漏えい・改ざん・不正アクセスを防ぐため、適切な安全管理措置を講じて取り扱います。',
  },
  {
    heading: '5. 開示・訂正・削除',
    body: 'ユーザーはご自身の個人情報について、開示・訂正・削除を求めることができます。お問い合わせは設定画面のヘルプセンターよりご連絡ください。',
  },
  {
    heading: '6. お問い合わせ',
    body: '本ポリシーに関するご質問は、ヘルプセンターまたは運営までお問い合わせください。',
  },
];

export default function TermsScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={[styles.title, { color: colors.text }]}>利用規約</Text>
      <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
        最終更新日: 2026年4月26日
      </Text>
      {TERMS_SECTIONS.map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text style={[styles.heading, { color: colors.text }]}>{s.heading}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{s.body}</Text>
        </View>
      ))}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Text style={[styles.title, { color: colors.text }]}>プライバシーポリシー</Text>
      <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
        最終更新日: 2026年4月26日
      </Text>
      {PRIVACY_SECTIONS.map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text style={[styles.heading, { color: colors.text }]}>{s.heading}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{s.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: 40,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  lastUpdated: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  heading: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xl,
  },
});
