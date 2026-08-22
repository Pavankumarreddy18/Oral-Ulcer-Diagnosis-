import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, Image, Keyboard
} from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

GoogleSignin.configure({
  webClientId: '686103643374-qkr3j4ld2ltck2c2dt03d0ndj91jkcjl.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
});

export default function AuthScreen() {
  const { signIn } = React.useContext(AuthContext);
  const { colors, fs } = React.useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [otpStep, setOtpStep] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        const savedPassword = await AsyncStorage.getItem('savedPassword');
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) setPassword(savedPassword);
      } catch (e) {}
    };
    loadCredentials();
  }, []);

  const handleAuth = async () => {
    Keyboard.dismiss();
    if (otpStep) return verifyOtp();
    
    if (mode === 'forgot') {
      if (!email) return setError("Please enter your email");
      setLoading(true); setError("");
      try {
        const data = await api("/api/auth/forgot-password", "POST", { email });
        if (data.needOtp) setOtpStep(true);
        else setError(data.msg || "Error");
      } catch (err) { setError(err.message || "Failed to send reset email"); }
      setLoading(false);
      return;
    }

    if (!email || !password) return setError("Please fill in all fields");
    if (mode === 'register') {
      if (!name) return setError("Please enter your name");
      if (password !== confirmPassword) return setError("Passwords do not match");
    }
    setLoading(true); setError("");

    try {
      const data = await api(
        mode === 'register' ? "/api/auth/register" : "/api/auth/login",
        "POST",
        mode === 'register' ? { name, email, password } : { email, password }
      );
      if (mode === 'register' && data.needOtp) {
        setOtpStep(true);
      } else if (data.token) {
        await AsyncStorage.setItem('savedEmail', email);
        await AsyncStorage.setItem('savedPassword', password);
        signIn(data);
      } else {
        setError(data.msg || "Something went wrong");
      }
    } catch (err) {
      setError(err.message || "Server error. Please try again.");
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      try { await GoogleSignin.signOut(); } catch (e) {}
      
      const response = await GoogleSignin.signIn();
      const idToken = response.data ? response.data.idToken : response.idToken;
      
      if (!idToken) throw new Error("No ID token returned");

      setLoading(true);
      const data = await api("/api/auth/google", "POST", { credential: idToken });
      
      if (data.token) signIn(data);
      else setError(data.msg || "Google login failed");
    } catch (err) {
      if (err.code !== statusCodes.SIGN_IN_CANCELLED) setError(err.message || "Google sign in error");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    Keyboard.dismiss();
    if (!otp) return setError("Please enter OTP");
    setLoading(true); setError("");
    try {
      if (mode === 'forgot') {
        const data = await api("/api/auth/reset-password", "POST", { email, otp, newPassword });
        if (data.success) {
          // Auto-login with new password so Google Password Manager updates saved credentials
          try {
            const loginData = await api("/api/auth/login", "POST", { email, password: newPassword });
            if (loginData.token) {
              signIn(loginData);
            } else {
              setMode('login'); setOtpStep(false); setOtp(""); setNewPassword("");
              Alert.alert("Success", "Password reset successful. Please sign in.");
            }
          } catch {
            setMode('login'); setOtpStep(false); setOtp(""); setNewPassword("");
            Alert.alert("Success", "Password reset successful. Please sign in.");
          }
        } else setError(data.msg || "Reset failed");
      } else {
        const data = await api("/api/auth/verify-otp", "POST", { email, otp });
        if (data.token) signIn(data); 
        else setError(data.msg || "OTP verification failed");
      }
    } catch (err) { setError(err.message || "OTP verification failed"); }
    setLoading(false);
  };

  const switchMode = (m) => {
    setMode(m);
    setOtpStep(false);
    setOtp('');
    setError('');
  };

  return (
    <LinearGradient colors={['#eef2ff', '#e0e7ff', '#c7d2fe']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <BlurView intensity={80} tint="light" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.logoBox}>
            <Image source={require('../../assets/icon.png')} style={{ width: 64, height: 64, borderRadius: 20 }} resizeMode="contain" />
          </View>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: fs(28) }]}>
          {otpStep ? (mode === 'forgot' ? "Reset Password" : "Verify OTP") : mode === 'forgot' ? "Reset Password" : mode === 'register' ? "Create Account" : "Welcome Back"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: fs(15) }]}>
          {otpStep ? `OTP sent to ${email}` : mode === 'forgot' ? "Enter your email to receive a reset code" : mode === 'register' ? "Register with email verification" : "Sign in to continue"}
        </Text>

        {error ? <Text style={[styles.errorText, { fontSize: fs(14) }]}>{error}</Text> : null}

        {!otpStep ? (
          <>
            {mode === 'register' && (
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput 
                  style={[styles.input, { color: colors.textPrimary, fontSize: fs(16) }]} 
                  placeholder="Full Name"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput 
                style={[styles.input, { color: colors.textPrimary, fontSize: fs(16) }]} 
                placeholder="Email Address"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="username"
                autoComplete="username"
                importantForAutofill="yes"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {mode !== 'forgot' && (
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput 
                  style={[styles.input, { color: colors.textPrimary, fontSize: fs(16), flex: 1 }]} 
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  textContentType={mode === 'register' ? "newPassword" : "password"}
                  autoComplete={mode === 'register' ? "password-new" : "password"}
                  importantForAutofill="yes"
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10, marginRight: -10 }}>
                  <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {mode === 'register' && (
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput 
                  style={[styles.input, { color: colors.textPrimary, fontSize: fs(16), flex: 1 }]} 
                  placeholder="Confirm Password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  textContentType="newPassword"
                  autoComplete="password-new"
                  importantForAutofill="yes"
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 10, marginRight: -10 }}>
                  <MaterialIcons name={showConfirmPassword ? "visibility" : "visibility-off"} size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {mode === 'login' && (
              <TouchableOpacity onPress={() => switchMode('forgot')} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
                <Text style={[styles.linkText, { fontSize: fs(15) }]}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleAuth} disabled={loading}>
              <LinearGradient 
                colors={['#4f46e5', '#8b5cf6']} 
                start={{x: 0, y: 0}} end={{x: 1, y: 0}} 
                style={styles.primaryButton}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={[styles.primaryButtonText, { fontSize: fs(17) }]}>
                    {mode === 'forgot' ? "Send Reset Code" : mode === 'register' ? "Send OTP" : "Sign In"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity onPress={handleGoogleSignIn} disabled={loading} style={{marginTop: 16}}>
                <View style={[styles.googleButton, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row' }]}>
                  <AntDesign name="google" size={20} color={colors.textPrimary} style={{ marginRight: 10 }} />
                  <Text style={[styles.googleButtonText, { color: colors.textPrimary, fontSize: fs(16) }]}>Continue with Google</Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.switchContainer}>
              <Text style={[styles.switchText, { color: colors.textSecondary, fontSize: fs(15) }]}>
                {mode === 'forgot' ? "Remember your password? " : mode === 'register' ? "Already have an account? " : "Don't have an account? "}
              </Text>
              <TouchableOpacity onPress={() => switchMode(mode === 'forgot' ? 'login' : mode === 'register' ? 'login' : 'register')}>
                <Text style={[styles.linkText, { fontSize: fs(15) }]}>{mode === 'forgot' || mode === 'register' ? "Sign In" : "Sign Up"}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border, opacity: 0.7 }]}>
              <TextInput 
                style={[styles.input, { color: colors.textPrimary, fontSize: fs(16) }]} 
                value={email}
                editable={false}
                textContentType="username"
                autoComplete="username"
                importantForAutofill="yes"
              />
            </View>

            <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput 
                style={[styles.input, { color: colors.textPrimary, fontSize: fs(16) }]} 
                placeholder="Enter 6-digit OTP"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                value={otp}
                onChangeText={setOtp}
              />
            </View>

            {mode === 'forgot' && (
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput 
                  style={[styles.input, { color: colors.textPrimary, fontSize: fs(16), flex: 1 }]} 
                  placeholder="New Password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showNewPassword}
                  textContentType="newPassword"
                  autoComplete="password-new"
                  importantForAutofill="yes"
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: 10, marginRight: -10 }}>
                  <MaterialIcons name={showNewPassword ? "visibility" : "visibility-off"} size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity onPress={handleAuth} disabled={loading}>
              <LinearGradient 
                colors={['#4f46e5', '#8b5cf6']} 
                start={{x: 0, y: 0}} end={{x: 1, y: 0}} 
                style={styles.primaryButton}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={[styles.primaryButtonText, { fontSize: fs(17) }]}>
                    {mode === 'forgot' ? "Reset Password" : "Verify OTP"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => switchMode('login')} style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={[styles.linkText, { fontSize: fs(15) }]}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
        </BlurView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  card: {
    padding: 32,
    borderRadius: 28,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 35,
    elevation: 5,
    borderWidth: 1,
    overflow: 'hidden'
  },
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 3,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#4f46e5',
  },
  title: {
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    marginBottom: 32,
    lineHeight: 22,
    textAlign: 'center'
  },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 20,
    height: 58,
    justifyContent: 'center',
  },
  input: {
    fontWeight: '500'
  },
  errorText: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    color: '#e11d48',
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)'
  },
  primaryButton: {
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  googleButton: {
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  googleButtonText: {
    fontWeight: '700',
  },
  linkText: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  switchText: {
    fontWeight: '500'
  },
});
