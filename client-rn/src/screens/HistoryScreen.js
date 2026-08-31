import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

export default function HistoryScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { colors, isDark, fs } = useContext(ThemeContext);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    api("/api/ulcer/records", "GET", null, userToken)
      .then(data => { 
        setRecords(Array.isArray(data) ? data : []); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }, [userToken]);

  const filteredRecords = records.filter(r =>
    `${r.patientName} ${r.userEmail} ${r.diagnosis}`.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => navigation.navigate('Result', { resultText: item.diagnosis })}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: fs(16) }]}>👤 {item.patientName}</Text>
        <Text style={[styles.cardDate, { fontSize: fs(13) }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.cardPreview, { color: colors.textSecondary, fontSize: fs(14) }]} numberOfLines={2}>
        {item.riskLevel ? `Risk: ${item.riskLevel} • ` : ""}{item.diagnosis}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient 
        colors={['#0ea5e9', '#3b82f6']} 
        start={{x: 0, y: 0}} end={{x: 1, y: 1}}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 20) + 16 }]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { fontSize: fs(32) }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { fontSize: fs(28) }]}>Assessment History</Text>
        <Text style={[styles.subtitle, { fontSize: fs(15) }]}>{filteredRecords.length} records</Text>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary, fontSize: fs(16) }]}
          placeholder="Search by patient or diagnosis..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { fontSize: fs(15) }]}>No matching assessments found.</Text>
          }
        />
      )}
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
    fontWeight: '300',
    lineHeight: 34,
  },
  title: {
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500'
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
    color: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  listContent: {
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f8fafc',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: '700',
    color: '#1e293b',
  },
  cardDate: {
    color: '#64748b',
    fontWeight: '500',
  },
  cardPreview: {
    color: '#475569',
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 40,
  }
});
