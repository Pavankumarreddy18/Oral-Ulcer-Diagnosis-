import React, { useState, useContext } from 'react';
import { 
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

export default function UserProfileModal({ visible, onClose, user, onUserUpdated }) {
  const { updateUser } = useContext(AuthContext);
  const { colors, fs } = useContext(ThemeContext);

  const [name, setName] = useState(user?.name || '');
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailStep, setEmailStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow access to photo library to select a profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64Image = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setProfilePic(base64Image);
        handleSavePhoto(base64Image);
      }
    } catch (e) {
      Alert.alert("Error", "Could not pick image");
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) return setError("Name cannot be empty");
    setLoading(true); setError(''); setSuccess('');
    try {
      const token = await AsyncStorage.getItem('token');
      const data = await api("/api/auth/profile", "PUT", { name: name.trim() }, token);
      await updateUser({ user: data.user, token: data.token });
      if (onUserUpdated) onUserUpdated(data.user);
      setEditingName(false);
      setSuccess("Name updated successfully!");
    } catch (err) {
      setError(err.message || "Failed to update name");
    }
    setLoading(false);
  };

  const handleSavePhoto = async (newPic) => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const token = await AsyncStorage.getItem('token');
      const data = await api("/api/auth/profile", "PUT", { profilePic: newPic }, token);
      await updateUser({ user: data.user, token: data.token });
      if (onUserUpdated) onUserUpdated(data.user);
      setSuccess(newPic ? "Profile photo updated!" : "Profile photo removed!");
    } catch (err) {
      setError(err.message || "Failed to update photo");
    }
    setLoading(false);
  };

  const handleRemovePhoto = async () => {
    setProfilePic('');
    await handleSavePhoto('');
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail.trim()) return setError("Please enter a new email");
    setLoading(true); setError(''); setSuccess('');
    try {
      const token = await AsyncStorage.getItem('token');
      const data = await api("/api/auth/request-email-change", "POST", { newEmail: newEmail.trim() }, token);
      if (data.needOtp) {
        setEmailStep(true);
        setSuccess(data.msg || "OTP sent to new email address");
      }
    } catch (err) {
      setError(err.message || "Failed to request email change");
    }
    setLoading(false);
  };

  const handleVerifyEmailChange = async () => {
    if (!emailOtp.trim()) return setError("Please enter the 6-digit OTP");
    setLoading(true); setError(''); setSuccess('');
    try {
      const token = await AsyncStorage.getItem('token');
      const data = await api("/api/auth/verify-email-change", "POST", { otp: emailOtp.trim() }, token);
      if (data.success) {
        await updateUser({ user: data.user, token: data.token });
        if (onUserUpdated) onUserUpdated(data.user);
        setEmailStep(false);
        setEditingEmail(false);
        setNewEmail('');
        setEmailOtp('');
        setSuccess("Email updated successfully! Old email revoked.");
      }
    } catch (err) {
      setError(err.message || "Failed to verify email change");
    }
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: fs(19) }]}>👤 Patient Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ fontSize: fs(20), color: colors.textSecondary }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}

            {/* Profile Avatar & Pencil Pick */}
            <View style={styles.avatarSection}>
              <View style={[styles.avatarBox, { borderColor: '#6366f1' }]}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={{ width: '100%', height: '100%', borderRadius: 45 }} />
                ) : (
                  <Text style={{ fontSize: fs(38) }}>👤</Text>
                )}
                <TouchableOpacity onPress={handlePickImage} style={styles.pencilBadge}>
                  <Text style={{ color: '#ffffff', fontSize: fs(12) }}>✏️</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <TouchableOpacity onPress={handlePickImage} style={{ marginRight: profilePic ? 14 : 0 }}>
                  <Text style={{ color: '#4f46e5', fontWeight: '600', fontSize: fs(12) }}>✏️ Update Photo</Text>
                </TouchableOpacity>
                {profilePic ? (
                  <TouchableOpacity onPress={handleRemovePhoto}>
                    <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: fs(12) }}>🗑️ Remove Photo</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Details Box */}
            <View style={[styles.detailsCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              
              {/* Full Name Row */}
              <View style={styles.detailRow}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary, fontSize: fs(12) }]}>FULL NAME</Text>
                  <TouchableOpacity onPress={() => setEditingName(!editingName)} style={styles.pencilBtn}>
                    <Text style={{ fontSize: fs(14) }}>✏️</Text>
                  </TouchableOpacity>
                </View>
                {!editingName ? (
                  <Text style={[styles.detailValue, { color: colors.textPrimary, fontSize: fs(16) }]}>{user?.name || user?.email?.split('@')[0]}</Text>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.border, fontSize: fs(15), marginRight: 8 }]}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter full name"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <TouchableOpacity onPress={handleSaveName} disabled={loading} style={styles.actionBtn}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs(14) }}>Save</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Email Row */}
              <View style={styles.detailRow}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary, fontSize: fs(12) }]}>EMAIL ADDRESS</Text>
                  <TouchableOpacity onPress={() => { setEditingEmail(!editingEmail); setEmailStep(false); }} style={styles.pencilBtn}>
                    <Text style={{ fontSize: fs(14) }}>✏️</Text>
                  </TouchableOpacity>
                </View>
                {!editingEmail ? (
                  <Text style={[styles.detailValue, { color: colors.textPrimary, fontSize: fs(15) }]}>{user?.email}</Text>
                ) : (
                  <View style={{ marginTop: 6 }}>
                    {!emailStep ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.border, fontSize: fs(14), marginRight: 8 }]}
                          value={newEmail}
                          onChangeText={setNewEmail}
                          placeholder="New email address"
                          placeholderTextColor={colors.textSecondary}
                          autoCapitalize="none"
                          keyboardType="email-address"
                        />
                        <TouchableOpacity onPress={handleRequestEmailChange} disabled={loading} style={styles.actionBtn}>
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs(13) }}>Send OTP</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <Text style={{ color: colors.textSecondary, fontSize: fs(13), marginBottom: 6 }}>
                          OTP sent to <Text style={{ fontWeight: '700' }}>{newEmail}</Text>
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <TextInput
                            style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.border, fontSize: fs(15), marginRight: 8 }]}
                            value={emailOtp}
                            onChangeText={setEmailOtp}
                            placeholder="6-digit OTP"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            maxLength={6}
                          />
                          <TouchableOpacity onPress={handleVerifyEmailChange} disabled={loading} style={styles.actionBtn}>
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs(13) }}>Verify</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* User ID Row */}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary, fontSize: fs(12), marginBottom: 4 }]}>ACCOUNT ID</Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary, fontSize: fs(13), fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                  {user?._id || "N/A"}
                </Text>
              </View>

            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  pencilBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  detailRow: {
    paddingVertical: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontWeight: '700',
  },
  detailValue: {
    fontWeight: '700',
    marginTop: 2,
  },
  pencilBtn: {
    padding: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  successText: {
    color: '#15803d',
    backgroundColor: '#dcfce7',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '600',
  },
});
