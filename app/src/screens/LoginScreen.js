import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../theme/theme';

export default function LoginScreen({ route }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const progressAnim = useRef(new Animated.Value(1)).current;
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState('error'); // 'success', 'warning', 'error'
  const [toastMessage, setToastMessage] = useState('');

  const navigation = useNavigation();
  const { signIn } = useAuth();

  const showToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setToastVisible(true);
    
    progressAnim.setValue(1);
    
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 2000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setToastVisible(false);
      }
    });
  };

  useEffect(() => {
    if (route?.params?.registerSuccess) {
      showToast('success', 'Cadastro realizado! Faça login para começar.');
      navigation.setParams({ registerSuccess: undefined });
    }
  }, [route?.params?.registerSuccess]);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('error', 'Preencha todos os campos!');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    
    if (error) {
      const errMsg = error.message.toLowerCase();
      let feedbackMsg = error.message;
      let type = 'error'; // Red
      
      if (errMsg.includes('password') || errMsg.includes('senha') || errMsg.includes('incorrect password')) {
        feedbackMsg = 'A senha está incorreta.';
        type = 'warning'; // Amarelo
      } else if (errMsg.includes('email') || errMsg.includes('invalid email') || errMsg.includes('email incorreto')) {
        feedbackMsg = 'Email incorreto.';
        type = 'warning'; // Amarelo
      } else if (errMsg.includes('confirm') || errMsg.includes('confirme')) {
        feedbackMsg = 'Por favor, confirme seu e-mail antes de fazer login.';
        type = 'warning'; // Amarelo
      } else if (errMsg.includes('not found') || errMsg.includes('invalid grant') || errMsg.includes('não cadastrado')) {
        feedbackMsg = 'Usuário não cadastrado ou dados incorretos.';
        type = 'error';
      }
      showToast(type, feedbackMsg);
    } else {
      await SecureStore.setItemAsync('just_logged_in', 'true');
    }
  };

  return (
    <View style={styles.container}>
      {toastVisible ? (
        <View style={[
          styles.toastContainer, 
          toastType === 'success' ? styles.toastSuccess : (toastType === 'warning' ? styles.toastWarning : styles.toastError)
        ]}>
          <View style={styles.toastContent}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
          <Animated.View style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: toastType === 'success' ? '#45B058' : (toastType === 'warning' ? '#FFC107' : '#FF3B30')
            }
          ]} />
        </View>
      ) : null}

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Ionicons name="business-outline" size={64} color={Theme.Colors.primary} />
          </View>
          <Text style={styles.title}>Condom<Text style={styles.titleAccent}>ínio</Text></Text>
          <Text style={styles.subtitle}>Gestão de Condomínios</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={Theme.Colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Digite seu email"
                placeholderTextColor={Theme.Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Theme.Colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Digite sua senha"
                placeholderTextColor={Theme.Colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Não tem conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Se cadastre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: Theme.Spacing.padding.xl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: Theme.BorderRadius.xl,
    backgroundColor: Theme.Colors.cardBackground,
    borderWidth: 2,
    borderColor: Theme.Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.Spacing.margin.lg,
    alignSelf: 'center',
  },
  title: {
    fontSize: Theme.Typography.fontSize.large,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: Theme.Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  titleAccent: {
    color: Theme.Colors.primary,
  },
  subtitle: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textSecondary,
    marginBottom: Theme.Spacing.margin.xxl,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: Theme.Spacing.margin.lg,
  },
  label: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textPrimary,
    marginBottom: Theme.Spacing.margin.sm,
    fontWeight: Theme.Typography.fontWeight.medium,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.Colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.Colors.border,
    borderRadius: Theme.BorderRadius.md,
    paddingHorizontal: Theme.Spacing.padding.lg,
  },
  inputIcon: {
    marginRight: Theme.Spacing.margin.md,
  },
  input: {
    flex: 1,
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textPrimary,
    paddingVertical: Theme.Spacing.padding.lg,
  },
  button: {
    backgroundColor: Theme.Colors.primary,
    padding: Theme.Spacing.padding.lg,
    borderRadius: Theme.BorderRadius.md,
    alignItems: 'center',
    marginTop: Theme.Spacing.margin.lg,
  },
  buttonText: {
    color: Theme.Colors.textPrimary,
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.bold,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Theme.Spacing.margin.xl,
  },
  registerText: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.textSecondary,
  },
  registerLink: {
    fontSize: Theme.Typography.fontSize.body,
    color: Theme.Colors.primary,
    fontWeight: Theme.Typography.fontWeight.bold,
  },
  toastContainer: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    borderRadius: Theme.BorderRadius.md,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#45B058',
  },
  toastWarning: {
    backgroundColor: '#FFFDE7',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  toastError: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  toastContent: {
    padding: Theme.Spacing.padding.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    fontSize: Theme.Typography.fontSize.body,
    fontWeight: Theme.Typography.fontWeight.bold,
    color: '#333333',
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    width: '100%',
  },
});
