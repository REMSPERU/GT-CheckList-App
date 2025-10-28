import { Image } from 'expo-image';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';

export function AuthLoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Image
          style={styles.logo}
          source={require('../assets/logo/image.png')}
          contentFit="contain"
        />
        <ActivityIndicator size="large" color="#06B6D4" />
        <Text style={styles.text}>Cargando...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner: { alignItems: 'center' },
  logo: { width: 283, height: 100, marginBottom: 32 },
  text: { marginTop: 8 },
});
