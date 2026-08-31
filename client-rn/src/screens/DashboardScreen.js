import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

import UserProfileModal from '../components/UserProfileModal';
import { Modal, Image } from 'react-native';

export default function DashboardScreen({ navigation }) {
  const { signOut } = React.useContext(AuthContext);
  const { colors, isDark, fs } = React.useContext(ThemeContext);
  const [user, setUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    AsyncStorage.getItem('user').then(data => {
      if (data) setUser(JSON.parse(data));
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* User Profile Modal */}
      {showUserProfileModal && (
        <UserProfileModal
          visible={showUserProfileModal}
          onClose={() => setShowUserProfileModal(false)}
          user={user}
          onUserUpdated={(u) => setUser(u)}
        />
      )}

      {/* Profile Details Dropdown Modal */}
      <Modal visible={showProfileDropdown} animationType="fade" transparent={true} onRequestClose={() => setShowProfileDropdown(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProfileDropdown(false)}>
          <View style={[styles.profileDropdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.dropdownAvatarBox}>
              {user?.profilePic ? (
                <Image source={{ uri: user.profilePic }} style={{ width: 64, height: 64, borderRadius: 32 }} />
              ) : (
                <Text style={{ fontSize: fs(30) }}>👤</Text>
              )}
            </View>
            <Text style={[styles.dropdownName, { color: colors.textPrimary, fontSize: fs(18) }]}>{user?.name || user?.email?.split('@')[0]}</Text>
            <Text style={[styles.dropdownEmail, { color: colors.textSecondary, fontSize: fs(13) }]}>{user?.email}</Text>
            <Text style={[styles.dropdownId, { color: colors.textSecondary, fontSize: fs(11) }]}>User ID: {user?._id?.slice(-8) || "N/A"}</Text>

            <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setShowProfileDropdown(false); setShowUserProfileModal(true); }}>
              <Text style={[styles.dropdownOptionText, { color: colors.textPrimary, fontSize: fs(15) }]}>👤 View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setShowProfileDropdown(false); navigation.navigate('Settings'); }}>
              <Text style={[styles.dropdownOptionText, { color: colors.textPrimary, fontSize: fs(15) }]}>⚙️ Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.dropdownOption, { marginTop: 6 }]} onPress={signOut}>
              <Text style={[styles.dropdownOptionText, { color: '#ef4444', fontSize: fs(15) }]}>🚪 Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <LinearGradient 
        colors={['#4f46e5', '#a855f7']} 
        start={{x: 0, y: 0}} end={{x: 1, y: 1}}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 20) + 16 }]}
      >
        <View style={styles.headerTop}>
          <View style={styles.brand}>
            <View style={styles.logoBox}><Text style={[styles.logoIcon, { fontSize: fs(22) }]}>O</Text></View>
            <View>
              <Text style={[styles.brandName, { fontSize: fs(20) }]}>OUDS</Text>
              <Text style={[styles.brandSub, { fontSize: fs(11) }]}>Clinical System</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.avatarButton} onPress={() => setShowProfileDropdown(true)}>
            {user?.profilePic ? (
              <Image source={{ uri: user.profilePic }} style={{ width: 38, height: 38, borderRadius: 19 }} />
            ) : (
              <Text style={[styles.avatarText, { fontSize: fs(18) }]}>{user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeTitle, { fontSize: fs(16) }]}>Welcome back,</Text>
          <Text style={[styles.welcomeName, { fontSize: fs(28) }]}>{user?.name || user?.email?.split('@')[0] || 'Guest'}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
            <Text style={[styles.icon, { fontSize: fs(28) }]}>🔬</Text>
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: fs(20) }]}>Oral Ulcer Diagnosis</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary, fontSize: fs(15) }]}>
            Start a new AI-assisted screening to evaluate oral ulcers and lesions. Takes about 2 minutes.
          </Text>
          
          <TouchableOpacity onPress={() => navigation.navigate('Questionnaire')}>
            <LinearGradient 
              colors={['#4f46e5', '#8b5cf6']} 
              start={{x: 0, y: 0}} end={{x: 1, y: 0}} 
              style={styles.primaryButton}
            >
              <Text style={[styles.primaryButtonText, { fontSize: fs(16) }]}>Start Diagnosis</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
            <Text style={[styles.icon, { fontSize: fs(28) }]}>📅</Text>
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: fs(20) }]}>Assessment History</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary, fontSize: fs(15) }]}>
            View and search past patient diagnoses, clinical findings, and generated reports.
          </Text>
          
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <LinearGradient 
              colors={['#0ea5e9', '#3b82f6']} 
              start={{x: 0, y: 0}} end={{x: 1, y: 0}} 
              style={styles.primaryButton}
            >
              <Text style={[styles.primaryButtonText, { fontSize: fs(16) }]}>View History</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(100, 116, 139, 0.15)' }]}>
            <Text style={[styles.icon, { fontSize: fs(28) }]}>⚙️</Text>
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: fs(20) }]}>Settings</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary, fontSize: fs(15) }]}>
            Customize your app experience, manage your profile, and configure preferences.
          </Text>
          
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]}>
            <Text style={[styles.secondaryButtonText, isDark && styles.secondaryButtonTextDark, { fontSize: fs(16) }]}>Open Settings</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={[styles.logoutText, { fontSize: fs(15) }]}>Sign Out securely</Text>
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
    paddingBottom: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoIcon: {
    fontWeight: '900',
    color: '#ffffff',
  },
  brandName: {
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandSub: {
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  welcomeSection: {
    paddingBottom: 20,
  },
  welcomeTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginBottom: 4,
  },
  welcomeName: {
    fontWeight: '800',
    color: '#ffffff',
  },
  content: {
    paddingHorizontal: 24,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 30,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
  },
  cardTitle: {
    fontWeight: '800',
    marginBottom: 10,
  },
  cardDesc: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    fontWeight: '500'
  },
  primaryButton: {
    width: 250,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  secondaryButton: {
    width: 250,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.2)',
  },
  secondaryButtonText: {
    color: '#475569',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 20,
  },
  profileDropdownCard: {
    width: 260,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  dropdownAvatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  dropdownName: {
    fontWeight: '800',
    marginBottom: 2,
  },
  dropdownEmail: {
    fontWeight: '500',
    marginBottom: 2,
  },
  dropdownId: {
    opacity: 0.7,
    marginBottom: 12,
  },
  dropdownDivider: {
    width: '100%',
    height: 1,
    marginBottom: 10,
  },
  dropdownOption: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  dropdownOptionText: {
    fontWeight: '700',
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  logoutText: {
    color: '#e11d48',
    fontWeight: '700',
  },
  secondaryButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonTextDark: {
    color: '#cbd5e1',
  }
});
