import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';

import { colors, shadows } from '../constants/theme';

export default function StudentAvatar({
  backgroundColor = colors.white,
  iconSize = 30,
  size = 58,
  uri = null,
}) {
  const [failedUri, setFailedUri] = useState(null);
  const canRenderRemoteAvatar = Boolean(uri && failedUri !== uri);

  useEffect(() => {
    setFailedUri(null);
  }, [uri]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      {canRenderRemoteAvatar ? (
        <SvgUri
          height={size}
          onError={() => setFailedUri(uri)}
          uri={uri}
          width={size}
        />
      ) : (
        <Ionicons name="happy" size={iconSize} color={colors.purple} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.soft,
  },
});
