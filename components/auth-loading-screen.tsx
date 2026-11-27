import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { GemaBrand } from '@/components/gema-brand';

export function AuthLoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.logo}>
          <GemaBrand />
        </View>
        <ActivityIndicator size="large" color="#06B6D4" />
        <Text style={styles.text}>Cargando...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner: { alignItems: 'center' },
  logo: { marginBottom: 24 },
  text: { marginTop: 8 },
});
