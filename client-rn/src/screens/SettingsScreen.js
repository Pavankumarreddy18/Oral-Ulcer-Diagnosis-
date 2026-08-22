import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import UserProfileModal from '../components/UserProfileModal';

export default function SettingsScreen({ navigation }) {
  const { signOut } = useContext(AuthContext);
  const { isDark, toggleTheme, notifications, toggleNotifications, changeFontSize, fontSizeMultiplier, colors, fs } = useContext(ThemeContext);
  const [user, setUser] = useState({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    AsyncStorage.getItem('user').then(data => {
      if (data) setUser(JSON.parse(data));
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showProfileModal && (
        <UserProfileModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={user}
          onUserUpdated={(u) => setUser(u)}
        />
      )}

      <LinearGradient 
        colors={['#64748b', '#334155']} 
        start={{x: 0, y: 0}} end={{x: 1, y: 1}}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 20) }]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { fontSize: fs(32) }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { fontSize: fs(28) }]}>Settings</Text>
        <Text style={[styles.subtitle, { fontSize: fs(15) }]}>Customize your experience</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        
        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, borderBottomColor: colors.border, fontSize: fs(17) }]}>👤 Profile</Text>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { overflow: 'hidden' }]}>
              {user?.profilePic ? (
                <Image source={{ uri: user.profilePic }} style={{ width: 50, height: 50, borderRadius: 25 }} />
              ) : (
                <Text style={[styles.avatarText, { fontSize: fs(20) }]}>{user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}</Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileEmail, { color: colors.textPrimary, fontSize: fs(16) }]}>{user?.name || user?.email?.split('@')[0]}</Text>
              <Text style={[styles.profileId, { fontSize: fs(13) }]}>{user?.email}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowProfileModal(true)} style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}>
              <Text style={{ color: '#4f46e5', fontWeight: '700', fontSize: fs(13) }}>👁️ View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Appearance */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, borderBottomColor: colors.border, fontSize: fs(17) }]}>🎨 Appearance</Text>
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={[styles.icon, { fontSize: fs(20) }]}>🌙</Text>
              <View>
                <Text style={[styles.label, { color: colors.textPrimary, fontSize: fs(15) }]}>Dark Mode</Text>
                <Text style={[styles.desc, { fontSize: fs(13) }]}>Switch to dark theme</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#cbd5e1', true: '#4f46e5' }}
              thumbColor={'#ffffff'}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={[styles.icon, { fontSize: fs(20) }]}>🔤</Text>
              <View>
                <Text style={[styles.label, { color: colors.textPrimary, fontSize: fs(15) }]}>Font Size</Text>
                <Text style={[styles.desc, { fontSize: fs(13) }]}>Adjust text size</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => changeFontSize(0.8)} style={[styles.sizeBtn, fontSizeMultiplier === 0.8 && styles.sizeBtnActive]}>
                <Text style={[styles.sizeBtnText, fontSizeMultiplier === 0.8 && styles.sizeBtnTextActive]}>A</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeFontSize(1)} style={[styles.sizeBtn, fontSizeMultiplier === 1 && styles.sizeBtnActive]}>
                <Text style={[styles.sizeBtnText, fontSizeMultiplier === 1 && styles.sizeBtnTextActive, { fontSize: 16 }]}>A</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeFontSize(1.2)} style={[styles.sizeBtn, fontSizeMultiplier === 1.2 && styles.sizeBtnActive]}>
                <Text style={[styles.sizeBtnText, fontSizeMultiplier === 1.2 && styles.sizeBtnTextActive, { fontSize: 20 }]}>A</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, borderBottomColor: colors.border, fontSize: fs(17) }]}>⚙️ Preferences</Text>
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={[styles.icon, { fontSize: fs(20) }]}>🔔</Text>
              <View>
                <Text style={[styles.label, { color: colors.textPrimary, fontSize: fs(15) }]}>Notifications</Text>
                <Text style={[styles.desc, { fontSize: fs(13) }]}>Enable app notifications</Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#cbd5e1', true: '#4f46e5' }}
              thumbColor={'#ffffff'}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={[styles.icon, { fontSize: fs(20) }]}>🌐</Text>
              <View>
                <Text style={[styles.label, { color: colors.textPrimary, fontSize: fs(15) }]}>Language</Text>
                <Text style={[styles.desc, { fontSize: fs(13) }]}>Select display language</Text>
              </View>
            </View>
            <Text style={[styles.valueText, { fontSize: fs(14) }]}>English</Text>
          </View>
        </View>

        {/* About */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, borderBottomColor: colors.border, fontSize: fs(17) }]}>ℹ️ About</Text>
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={[styles.icon, { fontSize: fs(20) }]}>📱</Text>
              <View>
                <Text style={[styles.label, { color: colors.textPrimary, fontSize: fs(15) }]}>App Version</Text>
                <Text style={[styles.desc, { fontSize: fs(13) }]}>OUDS Mobile v1.0.0</Text>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={[styles.icon, { fontSize: fs(20) }]}>🔒</Text>
              <View>
                <Text style={[styles.label, { color: colors.textPrimary, fontSize: fs(15) }]}>Privacy Policy</Text>
              </View>
            </View>
            <Text style={[styles.arrowText, { fontSize: fs(20) }]}>›</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={[styles.logoutText, { fontSize: fs(16) }]}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 10,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 34,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500'
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4f46e5',
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  profileId: {
    fontSize: 13,
    color: '#64748b',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  desc: {
    fontSize: 13,
    color: '#64748b',
  },
  valueText: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
  },
  arrowText: {
    fontSize: 20,
    color: '#94a3b8',
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    marginBottom: 20,
  },
  logoutText: {
    color: '#e11d48',
    fontSize: 16,
    fontWeight: '700',
  },
  sizeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  sizeBtnActive: {
    backgroundColor: '#4f46e5',
  },
  sizeBtnText: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  sizeBtnTextActive: {
    color: '#ffffff',
  }
});
