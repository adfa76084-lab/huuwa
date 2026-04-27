import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AdUnitIds } from '@/constants/ads';

interface FeedBannerAdProps {
  size?: BannerAdSize;
}

export function FeedBannerAd({ size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER }: FeedBannerAdProps) {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AdUnitIds.banner}
        size={size}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
