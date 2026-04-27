import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AdUnitIds } from '@/constants/ads';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

export function FeedNativeAd() {
  const colors = useThemeColors();
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedAd: NativeAd | null = null;
    (async () => {
      try {
        const ad = await NativeAd.createForAdRequest(AdUnitIds.native ?? TestIds.NATIVE);
        if (!cancelled) {
          loadedAd = ad;
          setNativeAd(ad);
        } else {
          ad.destroy();
        }
      } catch (e) {
        console.warn('[FeedNativeAd] load failed', e);
      }
    })();
    return () => {
      cancelled = true;
      loadedAd?.destroy();
    };
  }, []);

  if (!nativeAd) return null;

  return (
    <View style={styles.wrapper}>
      <NativeAdView
        nativeAd={nativeAd}
        style={[styles.adView, { backgroundColor: colors.card }]}
      >
        <View style={styles.row}>
          {nativeAd.icon?.url ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
            </NativeAsset>
          ) : (
            <View style={[styles.icon, { backgroundColor: colors.surfaceVariant }]} />
          )}

          <View style={styles.body}>
            <View style={styles.headerRow}>
              <View style={[styles.adBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.adBadgeText, { color: colors.primary }]}>広告</Text>
              </View>
              {nativeAd.advertiser ? (
                <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                  <Text style={[styles.advertiser, { color: colors.textSecondary }]}>
                    {nativeAd.advertiser}
                  </Text>
                </NativeAsset>
              ) : null}
            </View>

            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={[styles.headline, { color: colors.text }]}>
                {nativeAd.headline}
              </Text>
            </NativeAsset>

            {nativeAd.body ? (
              <NativeAsset assetType={NativeAssetType.BODY}>
                <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                  {nativeAd.body}
                </Text>
              </NativeAsset>
            ) : null}

            {nativeAd.callToAction ? (
              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <View style={[styles.cta, { backgroundColor: colors.primary }]}>
                  <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
                </View>
              </NativeAsset>
            ) : null}
          </View>
        </View>
      </NativeAdView>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  adView: {
    width: '100%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl + Spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.full,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  adBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  advertiser: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  headline: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  bodyText: {
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  cta: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    marginTop: 4,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
