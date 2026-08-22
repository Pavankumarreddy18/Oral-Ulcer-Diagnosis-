import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';

const STEPS = [
  { id: "profile", title: "Patient Profile", icon: "👤" },
  { id: "habits", title: "Habits and Lifestyle", icon: "🌿" },
  { id: "medical", title: "Medical History", icon: "🏥" },
  { id: "trauma", title: "Trauma Check", icon: "⚠️" },
  { id: "ulcer_history", title: "Ulcer History", icon: "📅" },
  { id: "appearance", title: "Ulcer Appearance", icon: "🔍" },
  { id: "location", title: "Location", icon: "📍" },
  { id: "symptoms", title: "Symptoms", icon: "🩺" },
  { id: "redflags", title: "Red Flags", icon: "🚨" },
  { id: "notes", title: "Photo Upload & Notes", icon: "📝" },
];

const INIT = {
  patientName: "", age: "", gender: "",
  tobaccoUse: "", alcoholUse: "", betelNutUse: "",
  diabetes: null, vitaminDeficiency: null, lowImmunity: null, currentMedications: "",
  bitCheekLip: null, sharpToothRubbing: null, dentureContact: null,
  bracesIrritation: null, burnFromHotFood: null, chemicalContact: null,
  painWhileEating: null, soreRubbingTeeth: null,
  duration: "", firstTimeOrRecurring: "", numberOfSores: "",
  size: "", shape: "", color: "", border: "", bleedsEasily: null,
  soreLocation: "", alongBiteLine: null,
  painLevel: 5, difficultyEating: null, feverSwellingTiredness: null,
  lastingMoreThan2Weeks: null, gettingBigger: null, hardRaisedEdges: null,
  imageNote: "",
  image: "",
};

const SYSTEM_PROMPT = `You are an oral medicine specialist AI. Analyze the patient data and output a structured report. Keep each section concise (2-3 bullets max). You MUST complete ALL 9 sections.

Format:
1. MOST LIKELY DIAGNOSIS: [Name] (Confidence: High/Moderate/Low) - one-line reason
2. DIFFERENTIAL DIAGNOSES: 2-3 alternatives with distinguishing features
3. ULCER CATEGORY: [Benign / Infectious / Autoimmune / Pre-malignant / Malignant / Systemic / Deficiency / Iatrogenic]
4. RISK LEVEL: LOW / MODERATE / HIGH / CRITICAL - one-line justification
5. URGENCY: ROUTINE / SOON / URGENT / EMERGENCY - timeframe
6. KEY FINDINGS: 3-5 significant clinical data points
7. RED FLAGS: warning signs or "None identified"
8. RECOMMENDED ACTION: home care + specialist referral if needed
9. DISCLAIMER: "This AI screening report is for informational purposes only. Consult a licensed dental or medical professional for definitive diagnosis."

Consider: Aphthous (Minor/Major/Herpetiform), Traumatic, Herpetic, Candidal, Lichen Planus, Leukoplakia, Erythroplakia, SCC, Behcet's, Nutritional Deficiency, Drug-induced. Use plain English. Complete ALL sections.`;

export default function QuestionnaireScreen({ navigation }) {
  const { colors, isDark, fs } = useContext(ThemeContext);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INIT);
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const insets = useSafeAreaInsets();

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const buildPrompt = () => {
    const f = formData;
    return `
PATIENT: ${f.patientName}, Age: ${f.age}, Gender: ${f.gender}
HABITS: Tobacco: ${f.tobaccoUse || "None"}, Alcohol: ${f.alcoholUse || "None"}, Betel Nut: ${f.betelNutUse || "None"}
MEDICAL: Diabetes: ${f.diabetes ? "Yes" : "No"}, Vitamin Deficiency: ${f.vitaminDeficiency ? "Yes" : "No"}, Low Immunity: ${f.lowImmunity ? "Yes" : "No"}, Medications: ${f.currentMedications || "None"}
TRAUMA: Bit cheek/lip: ${f.bitCheekLip ? "Yes" : "No"}, Sharp tooth: ${f.sharpToothRubbing ? "Yes" : "No"}, Denture: ${f.dentureContact ? "Yes" : "No"}, Braces: ${f.bracesIrritation ? "Yes" : "No"}, Hot burn: ${f.burnFromHotFood ? "Yes" : "No"}, Chemical: ${f.chemicalContact ? "Yes" : "No"}, Pain eating: ${f.painWhileEating ? "Yes" : "No"}, Rubbing teeth: ${f.soreRubbingTeeth ? "Yes" : "No"}
ULCER HISTORY: Duration: ${f.duration}, Recurring: ${f.firstTimeOrRecurring}, Number: ${f.numberOfSores}
APPEARANCE: Size: ${f.size}, Shape: ${f.shape}, Color: ${f.color}, Border: ${f.border}, Bleeds: ${f.bleedsEasily ? "Yes" : "No"}
LOCATION: ${f.soreLocation}, Bite line: ${f.alongBiteLine ? "Yes" : "No"}
SYMPTOMS: Pain: ${f.painLevel}/10, Difficulty eating: ${f.difficultyEating ? "Yes" : "No"}, Fever/swelling: ${f.feverSwellingTiredness ? "Yes" : "No"}
RED FLAGS: >2 weeks: ${f.lastingMoreThan2Weeks ? "YES" : "No"}, Getting bigger: ${f.gettingBigger ? "YES" : "No"}, Hard edges: ${f.hardRaisedEdges ? "YES" : "No"}
NOTES: ${f.imageNote || "None"}
HAS ATTACHED PHOTO: ${f.image ? "YES" : "No"}
    `.trim();
  };

  const submitDiagnosis = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = {
        messages: [{ role: "user", content: `Analyze this patient data:\n\n${buildPrompt()}` }],
        systemPrompt: SYSTEM_PROMPT,
        symptoms: formData,
        patientName: formData.patientName || "Anonymous",
        image: formData.image || null,
      };
      
      const response = await api('/api/ulcer/analyze', 'POST', payload, token);
      
      navigation.navigate('Result', { resultText: response.result || 'No diagnosis provided.', formData });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit diagnosis');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    const f = formData;
    switch (currentStep) {
      case 1: return !!f.patientName && !!f.age && !!f.gender;
      case 2: return !!f.tobaccoUse && !!f.alcoholUse && !!f.betelNutUse;
      case 3: return f.diabetes !== null && f.vitaminDeficiency !== null && f.lowImmunity !== null;
      case 4: return f.bitCheekLip !== null && f.sharpToothRubbing !== null && f.dentureContact !== null && f.bracesIrritation !== null && f.burnFromHotFood !== null && f.chemicalContact !== null && f.painWhileEating !== null && f.soreRubbingTeeth !== null;
      case 5: return !!f.duration && !!f.firstTimeOrRecurring && !!f.numberOfSores;
      case 6: return !!f.size && !!f.shape && !!f.color && !!f.border && f.bleedsEasily !== null;
      case 7: return !!f.soreLocation && f.alongBiteLine !== null;
      case 8: return f.difficultyEating !== null && f.feverSwellingTiredness !== null;
      case 9: return f.lastingMoreThan2Weeks !== null && f.gettingBigger !== null && f.hardRaisedEdges !== null;
      case 10: return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (!isStepValid()) {
      setShowError(true);
      return;
    }
    setShowError(false);
    if (currentStep < STEPS.length) {
      setCurrentStep(curr => curr + 1);
    } else {
      submitDiagnosis();
    }
  };

  const handlePrev = () => {
    setShowError(false);
    if (currentStep > 1) {
      setCurrentStep(curr => curr - 1);
    } else {
      navigation.goBack();
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    
    if (!result.canceled) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      updateField('image', base64Img);
    }
  };

  // --- UI Components ---
  const renderInputField = (field) => (
      <View style={styles.inputContainer} key={field.id}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{field.label} {field.required && '*'}</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
          placeholder={field.placeholder || ''}
          placeholderTextColor={colors.textSecondary}
          value={formData[field.id] || ''}
          onChangeText={(text) => updateField(field.id, text)}
          keyboardType={field.keyboardType || 'default'}
        />
      </View>
    );

  const renderRadioField = (field) => (
      <View style={styles.inputContainer} key={field.id}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{field.label} {field.required && '*'}</Text>
        <View style={styles.radioGroup}>
          {field.options.map(option => {
            const isActive = formData[field.id] === option;
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.radioPill,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  isActive && styles.radioPillActive
                ]}
                onPress={() => updateField(field.id, option)}
              >
                <Text style={[
                  styles.radioPillText,
                  { color: colors.textSecondary },
                  isActive && styles.radioPillTextActive
                ]}>{option}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    );

  const renderYesNoField = (field) => (
      <View style={[styles.yesNoContainer, { borderBottomColor: colors.border }]} key={field.id}>
        <Text style={[styles.yesNoLabel, { color: colors.textPrimary }]}>{field.label}</Text>
        <View style={styles.yesNoBtns}>
          <TouchableOpacity 
            style={[
              styles.radioPillSm, 
              { borderColor: colors.border, backgroundColor: colors.background },
              formData[field.id] === true && styles.radioPillActive
            ]}
            onPress={() => updateField(field.id, true)}
          >
            <Text style={[styles.radioPillText, { color: colors.textSecondary }, formData[field.id] === true && styles.radioPillTextActive]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.radioPillSm, 
              { borderColor: colors.border, backgroundColor: colors.background },
              formData[field.id] === false && styles.radioPillActive
            ]}
            onPress={() => updateField(field.id, false)}
          >
            <Text style={[styles.radioPillText, { color: colors.textSecondary }, formData[field.id] === false && styles.radioPillTextActive]}>No</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <>
            {renderInputField({ id: 'patientName', label: 'Full Name', required: true, placeholder: 'Enter patient name' })}
            {renderInputField({ id: 'age', label: 'Age', required: true, placeholder: 'Age', keyboardType: 'numeric' })}
            {renderRadioField({ id: 'gender', label: 'Gender', required: true, options: ["Male", "Female", "Other"] })}
          </>
        );
      case 2:
        return (
          <>
            {renderRadioField({ id: 'tobaccoUse', label: 'Tobacco Use', required: true, options: ["Never", "Occasionally", "Daily", "Quit recently"] })}
            {renderRadioField({ id: 'alcoholUse', label: 'Alcohol Consumption', required: true, options: ["Never", "Occasionally", "Weekly", "Daily"] })}
            {renderRadioField({ id: 'betelNutUse', label: 'Betel Nut / Pan Chewing', required: true, options: ["Never", "Occasionally", "Daily", "Multiple times a day"] })}
          </>
        );
      case 3:
        return (
          <>
            {renderYesNoField({ id: 'diabetes', label: 'Diabetes?' })}
            {renderYesNoField({ id: 'vitaminDeficiency', label: 'Vitamin Deficiency / Anemia?' })}
            {renderYesNoField({ id: 'lowImmunity', label: 'Low Immunity / Long-term Illness?' })}
          </>
        );
      case 4:
        return (
          <>
            {renderYesNoField({ id: 'bitCheekLip', label: 'Bit cheek, lip, or tongue recently?' })}
            {renderYesNoField({ id: 'sharpToothRubbing', label: 'Sharp tooth rubbing the sore?' })}
            {renderYesNoField({ id: 'dentureContact', label: 'Denture touching the sore?' })}
            {renderYesNoField({ id: 'bracesIrritation', label: 'Braces / wire irritation?' })}
            {renderYesNoField({ id: 'burnFromHotFood', label: 'Burn from hot food or drink?' })}
            {renderYesNoField({ id: 'chemicalContact', label: 'Strong chemical contact?' })}
            {renderYesNoField({ id: 'painWhileEating', label: 'Pain worse while eating?' })}
            {renderYesNoField({ id: 'soreRubbingTeeth', label: 'Sore rubbing against teeth?' })}
          </>
        );
      case 5:
        return (
          <>
            {renderRadioField({ id: 'duration', label: 'When did it start?', required: true, options: ["< 3 days", "3–7 days", "1–2 weeks", "2–4 weeks", "> 1 month"] })}
            {renderRadioField({ id: 'firstTimeOrRecurring', label: 'First time or recurring?', required: true, options: ["First time", "Recurring", "Chronic"] })}
            {renderRadioField({ id: 'numberOfSores', label: 'Number of sores', required: true, options: ["1", "2–3", "4–5", "> 5"] })}
          </>
        );
      case 6:
        return (
          <>
            {renderRadioField({ id: 'size', label: 'Size of sore', required: true, options: ["Pinpoint", "Small", "Medium", "Large", "Very large"] })}
            {renderRadioField({ id: 'shape', label: 'Shape', required: true, options: ["Round", "Oval", "Irregular"] })}
            {renderRadioField({ id: 'color', label: 'Color', required: true, options: ["White/Grey", "Yellow", "Red", "Mixed", "Black/Dark"] })}
            {renderRadioField({ id: 'border', label: 'Border', required: true, options: ["Smooth", "Raised", "Irregular"] })}
            {renderYesNoField({ id: 'bleedsEasily', label: 'Does it bleed easily?' })}
          </>
        );
      case 7:
        return (
          <>
            {renderRadioField({ id: 'soreLocation', label: 'Select sore location', required: true, options: ["Inner lip", "Inner cheek", "Tongue (top)", "Tongue (side/bottom)", "Gum", "Roof of mouth", "Floor of mouth"] })}
            {renderYesNoField({ id: 'alongBiteLine', label: 'Is it along bite line / denture area?' })}
          </>
        );
      case 8:
        return (
          <>
            {renderRadioField({ id: 'painLevel', label: 'Pain Level (0-10)', required: true, options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] })}
            {renderYesNoField({ id: 'difficultyEating', label: 'Difficulty eating or swallowing?' })}
            {renderYesNoField({ id: 'feverSwellingTiredness', label: 'Fever, swelling, or tiredness?' })}
          </>
        );
      case 9:
        return (
          <>
            {renderYesNoField({ id: 'lastingMoreThan2Weeks', label: 'Lasting more than 2 weeks?' })}
            {renderYesNoField({ id: 'gettingBigger', label: 'Getting bigger or not healing?' })}
            {renderYesNoField({ id: 'hardRaisedEdges', label: 'Hard / raised edges or lump?' })}
          </>
        );
      case 10:
        return (
          <>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Upload Photo of Oral Ulcer (Optional)</Text>
              {!formData.image ? (
                <TouchableOpacity style={[styles.photoUploadZone, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={pickImage}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>📸</Text>
                  <Text style={[styles.photoText, { color: colors.textPrimary }]}>Tap to upload a photo</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.photoPreviewBox}>
                  <Image source={{ uri: formData.image }} style={styles.photoPreviewImg} />
                  <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => updateField('image', '')}>
                    <Text style={[styles.photoRemoveBtnText]}>✕ Remove Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Additional Notes</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary, height: 100 }]}
                value={formData.imageNote}
                onChangeText={v => updateField('imageNote', v)}
                placeholder="Describe appearance, texture, or any other details..."
                placeholderTextColor={colors.textSecondary}
                multiline={true}
                textAlignVertical="top"
              />
            </View>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <LinearGradient 
          colors={['#4f46e5', '#8b5cf6']} 
          start={{x: 0, y: 0}} end={{x: 1, y: 0}}
          style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={handlePrev}>
              <Text style={[styles.backButtonText, { fontSize: fs(32) }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { fontSize: fs(22) }]}>Diagnosis Setup</Text>
            <View style={{ width: 44 }} />
          </View>
          <Text style={[styles.subtitle, { fontSize: fs(14) }]}>Step {currentStep} of {STEPS.length}</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary, fontSize: fs(20), borderBottomColor: colors.border }]}>{STEPS[currentStep-1].icon}  {STEPS[currentStep-1].title}</Text>
            
            <View style={styles.formContainer}>
              {renderStepContent()}
            </View>

            {showError && <Text style={[styles.errorText, { fontSize: fs(14) }]}>⚠️ Please fill in all required fields.</Text>}
          </View>
        </ScrollView>

        <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 24), backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)' }]}>

          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={handleNext} disabled={loading} style={styles.buttonWrapper}>
              <LinearGradient 
                colors={['#4f46e5', '#8b5cf6']} 
                start={{x: 0, y: 0}} end={{x: 1, y: 0}} 
                style={styles.primaryButton}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={[styles.primaryButtonText, { fontSize: fs(18) }]}>
                    {currentStep === STEPS.length ? 'Submit & Analyze' : 'Continue'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backButton: { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { color: '#ffffff', fontWeight: '400', marginTop: -4 },
  title: { fontWeight: '700', color: '#ffffff', textAlign: 'center', flex: 1, letterSpacing: 0.5 },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontWeight: '500', textAlign: 'center', letterSpacing: 0.5 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  card: { borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4, marginBottom: 24, backgroundColor: '#ffffff' },
  stepTitle: { fontWeight: '800', marginBottom: 24, borderBottomWidth: 1, paddingBottom: 16 },
  formContainer: { marginTop: 8 },
  inputContainer: { marginBottom: 28 },
  label: { fontWeight: '700', marginBottom: 10, marginLeft: 2, letterSpacing: 0.2 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, fontWeight: '500', fontSize: 16 },
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  radioPill: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  radioPillActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5', shadowColor: '#4f46e5', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  radioPillText: { fontWeight: '600' },
  radioPillTextActive: { color: '#fff', fontWeight: '700' },
  yesNoContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, marginBottom: 10 },
  yesNoLabel: { flex: 1, fontWeight: '600', paddingRight: 16, lineHeight: 22 },
  yesNoBtns: { flexDirection: 'row', gap: 12 },
  radioPillSm: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 16 },
  buttonWrapper: { flex: 1 },
  primaryButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
  photoUploadZone: { height: 150, borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  photoText: { fontWeight: '600', textAlign: 'center' },
  photoPreviewBox: { marginTop: 10, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  photoPreviewImg: { width: '100%', height: 200, resizeMode: 'cover' },
  photoRemoveBtn: { backgroundColor: '#f43f5e', padding: 12, alignItems: 'center' },
  photoRemoveBtnText: { color: '#fff', fontWeight: '700' },
  errorText: { color: '#e11d48', marginTop: 10, fontWeight: '600', textAlign: 'center' }
});
