import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useResetPasswordEmail } from '@/hooks/use-auth-query';

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const resetPasswordMutation = useResetPasswordEmail();

  const [email, setEmail] = useState('');
  const [focusedInput, setFocusedInput] = useState(false);

  const isValidEmail = validateEmail(email);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu correo electrónico');
      return;
    }

    if (!isValidEmail) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync(email.trim());
      Alert.alert(
        'Correo enviado',
        'Hemos enviado un enlace de recuperación a tu correo electrónico. Por favor, revisa tu bandeja de entrada.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo enviar el correo de recuperación';
      Alert.alert('Error', message);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.headerText}>Recuperar contraseña</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <Image
            source={require('../../../assets/logo/image.png')}
            style={styles.logo}
            contentFit="contain"
            transition={1000}
          />

          <Text style={styles.description}>
            Ingresa tu correo electrónico y te enviaremos un enlace para
            recuperar tu contraseña.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={Colors.light.icon}
                style={styles.icon}
              />
              <TextInput
                style={[styles.input, focusedInput && styles.inputFocused]}
                placeholder="Correo electrónico"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="done"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput(true)}
                onBlur={() => setFocusedInput(false)}
                onSubmitEditing={handleSubmit}
                editable={!resetPasswordMutation.isPending}
                accessibilityLabel="Correo electrónico"
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={resetPasswordMutation.isPending}
              style={({ pressed }) => [
                styles.button,
                resetPasswordMutation.isPending && styles.buttonDisabled,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button">
              {resetPasswordMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Enviar enlace</Text>
              )}
            </Pressable>

            <Pressable
              disabled={resetPasswordMutation.isPending}
              style={styles.secondaryButton}
              onPress={() => router.back()}
              accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Volver al login</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: {
    flex: 1,
    backgroundColor: '#E8E9E9',
  },
  header: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  logo: {
    width: 200,
    height: 100,
    marginBottom: 24,
  },
  description: {
    fontSize: 14,
    color: '#565D6D',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingLeft: 44,
    paddingRight: 16,
    paddingVertical: Platform.select({ ios: 14, android: 10 }),
    fontSize: 16,
    lineHeight: 22,
    color: '#565D6D',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  inputFocused: {
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 1,
  },
  icon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -10,
    zIndex: 10,
  },
  button: {
    width: '100%',
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.light.tint,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.84,
  },
});
