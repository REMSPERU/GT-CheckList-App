import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { supabaseAuthService } from '@/services/supabase-auth.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 45;

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function mapResetErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'No se pudo enviar el correo de recuperacion.';
  }

  const normalized = error.message.toLowerCase();

  if (normalized.includes('rate limit')) {
    return 'Ya se envio un enlace hace poco. Espera unos segundos e intenta nuevamente.';
  }

  if (normalized.includes('network')) {
    return 'Sin conexion a internet. Verifica tu red e intenta nuevamente.';
  }

  return error.message;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const loginHref = '/auth/login' as Href;
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const actionButtonText = useMemo(() => {
    if (isLoading) return '';
    if (cooldownSeconds > 0) {
      return `Reenviar en ${formatCountdown(cooldownSeconds)}`;
    }
    return lastSentEmail ? 'Reenviar enlace' : 'Enviar enlace';
  }, [cooldownSeconds, isLoading, lastSentEmail]);

  const handleSendResetEmail = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isLoading || cooldownSeconds > 0) {
      return;
    }

    if (!normalizedEmail) {
      Alert.alert('Error', 'Ingresa tu correo electronico.');
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      Alert.alert('Error', 'Ingresa un correo electronico valido.');
      return;
    }

    setIsLoading(true);

    try {
      const redirectTo = Linking.createURL('/auth/reset-password');
      await supabaseAuthService.sendPasswordResetEmail(
        normalizedEmail,
        redirectTo,
      );
      setLastSentEmail(normalizedEmail);
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);

      Alert.alert(
        'Correo enviado',
        'Te enviamos un enlace para restablecer tu contrasena. Revisa tu bandeja y spam.',
        [{ text: 'OK' }],
      );
    } catch (error) {
      const message = mapResetErrorMessage(error);

      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenMailApp = async () => {
    try {
      const canOpen = await Linking.canOpenURL('mailto:');
      if (canOpen) {
        await Linking.openURL('mailto:');
        return;
      }
    } catch {
      // noop
    }

    Alert.alert(
      'Correo',
      'No se pudo abrir la app de correo en este dispositivo.',
    );
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Recuperar contrasena</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Ingresa tu correo y te enviaremos un enlace para crear una nueva
            contrasena.
          </Text>

          {lastSentEmail ? (
            <Text style={styles.infoText}>
              Ultimo envio a: {lastSentEmail}. Si no tienes ese correo en este
              celular, abre el enlace desde cualquier dispositivo y compartelo a
              este equipo.
            </Text>
          ) : null}

          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={Colors.light.icon}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Correo electronico"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />
          </View>

          <Pressable
            onPress={handleSendResetEmail}
            disabled={isLoading || cooldownSeconds > 0}
            style={({ pressed }) => [
              styles.button,
              (isLoading || cooldownSeconds > 0) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button">
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{actionButtonText}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleOpenMailApp}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
            disabled={isLoading}
            accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>Abrir app de correo</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace(loginHref)}
            style={({ pressed }) => [
              styles.linkButton,
              pressed && styles.pressed,
            ]}
            disabled={isLoading}
            accessibilityRole="button">
            <Text style={styles.linkButtonText}>Ir a iniciar sesion</Text>
          </Pressable>
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
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 16,
    lineHeight: 22,
  },
  infoText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 14,
    position: 'relative',
  },
  icon: {
    position: 'absolute',
    left: 12,
    top: 16,
    zIndex: 1,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 44,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    width: '100%',
    backgroundColor: '#0089AC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 2,
    paddingVertical: 10,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#0089AC',
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
