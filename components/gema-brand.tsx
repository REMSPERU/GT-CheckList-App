import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

export function GemaBrand() {
  return (
    <View style={styles.brand}>
      <Image
        source={require('../assets/images/icon.png')}
        style={styles.icon}
        contentFit="contain"
      />
      <Text style={styles.name}>GEMA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 48, height: 48, borderRadius: 10 },
  name: { color: Colors.light.text, fontSize: 28, fontWeight: '800' },
});
