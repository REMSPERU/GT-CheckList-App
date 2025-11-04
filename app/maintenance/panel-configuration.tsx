import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DefaultHeader from '@/components/default-header';

type PanelType = 'adosado' | 'empotrado';
type PhaseType = 'mono_2w' | 'tri_3w' | 'tri_4w';

export default function PanelConfigurationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [panel, setPanel] = useState<any>(null);
  const [step, setStep] = useState<number>(1);

  // Step 1 fields
  const [panelType, setPanelType] = useState<PanelType>('adosado');
  const [voltage, setVoltage] = useState<string>('220');
  const [phase, setPhase] = useState<PhaseType>('mono_2w');

  // Step 2 fields - IT-G
  const [itgCount, setItgCount] = useState<string>('3');
  const [itgDescriptions, setItgDescriptions] = useState<string[]>(Array(3).fill(''));

  // Step 3 fields - Circuitos de IT-G1
  const [cnPrefix, setCnPrefix] = useState<string>('CN');
  const [circuitsCount, setCircuitsCount] = useState<string>('5');
  type CircuitConfig = {
    phaseITM: PhaseType;
    amperajeITM: string;
    phaseID: PhaseType;
    amperajeID: string;
    supply: string;
  };
  const defaultCircuit: CircuitConfig = {
    phaseITM: 'mono_2w',
    amperajeITM: '',
    phaseID: 'mono_2w',
    amperajeID: '',
    supply: '',
  };
  const [circuits, setCircuits] = useState<CircuitConfig[]>(Array(5).fill(null).map(() => ({ ...defaultCircuit })));

  useEffect(() => {
    if (params.panel) {
      try {
        setPanel(JSON.parse(params.panel as string));
      } catch {
        setPanel({ name: 'Equipo', id: 'N/A' });
      }
    }
  }, [params.panel]);

  // Keep IT-G descriptions in sync with count
  useEffect(() => {
    const n = Math.max(0, parseInt(itgCount || '0', 10));
    setItgDescriptions((prev) => {
      const next = [...prev];
      if (n > next.length) {
        for (let i = next.length; i < n; i++) next.push('');
      } else if (n < next.length) {
        next.length = n;
      }
      return next;
    });
  }, [itgCount]);

  // Keep circuits list in sync with circuitsCount
  useEffect(() => {
    const n = Math.max(0, parseInt(circuitsCount || '0', 10));
    setCircuits((prev) => {
      const next = [...prev];
      if (n > next.length) {
        for (let i = next.length; i < n; i++) next.push({ ...defaultCircuit });
      } else if (n < next.length) {
        next.length = n;
      }
      return next;
    });
  }, [circuitsCount]);

  const goNext = () => {
    if (step === 1) {
      // Validations for step 1
      if (!voltage.trim()) {
        Alert.alert('Validación', 'Ingrese el voltaje.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      // Validations for step 2
      const n = parseInt(itgCount || '0', 10);
      if (isNaN(n) || n < 1) {
        Alert.alert('Validación', 'Indique al menos 1 IT-G.');
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      // Validations for step 3
      const c = parseInt(circuitsCount || '0', 10);
      if (!cnPrefix.trim()) {
        Alert.alert('Validación', 'Ingrese el prefijo (por ejemplo, CN o SA).');
        return;
      }
      if (isNaN(c) || c < 1) {
        Alert.alert('Validación', 'Indique al menos 1 circuito.');
        return;
      }
      setStep(4);
      return;
    }
    if (step === 4) {
      // Simulate save and go back
      Alert.alert('Configuración guardada', 'El equipo ha sido configurado correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  };

  const renderStepOne = () => (
    <View style={styles.contentWrapper}>
      {/* Equipo */}
      <Text style={styles.equipmentLabel}>Equipo {panel?.name || panel?.id || ''}</Text>

      {/* Tipo de tablero */}
      <Text style={styles.sectionTitle}>Seleccione el tipo de tablero</Text>
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segment, panelType === 'adosado' && styles.segmentActive]}
          onPress={() => setPanelType('adosado')}
        >
          <Text style={[styles.segmentText, panelType === 'adosado' && styles.segmentTextActive]}>Adosado</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, panelType === 'empotrado' && styles.segmentActive]}
          onPress={() => setPanelType('empotrado')}
        >
          <Text style={[styles.segmentText, panelType === 'empotrado' && styles.segmentTextActive]}>Empotrado</Text>
        </TouchableOpacity>
      </View>

      {/* Voltaje */}
      <Text style={styles.sectionTitle}>Voltaje:</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={voltage}
          onChangeText={setVoltage}
          keyboardType="numeric"
          placeholder="220"
          placeholderTextColor="#9CA3AF"
        />
        <View style={styles.unitWrapper}><Text style={styles.unitText}>V</Text></View>
      </View>

      {/* Fases */}
      <Text style={styles.sectionTitle}>Fases:</Text>
      <View style={styles.listButtons}>
        <TouchableOpacity
          style={[styles.listButton, phase === 'mono_2w' && styles.listButtonActive]}
          onPress={() => setPhase('mono_2w')}
        >
          <Text style={[styles.listButtonText, phase === 'mono_2w' && styles.listButtonTextActive]}>Monofásico 2 hilos (2F - 1Φ 2W)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.listButton, phase === 'tri_3w' && styles.listButtonActive]}
          onPress={() => setPhase('tri_3w')}
        >
          <Text style={[styles.listButtonText, phase === 'tri_3w' && styles.listButtonTextActive]}>Trifásico 3 hilos (3F - 3Φ 3W)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.listButton, phase === 'tri_4w' && styles.listButtonActive]}
          onPress={() => setPhase('tri_4w')}
        >
          <Text style={[styles.listButtonText, phase === 'tri_4w' && styles.listButtonTextActive]}>Trifásico 4 hilos (3F + N - 3Φ 4W)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStepTwo = () => (
    <View style={styles.contentWrapper}>
      {/* Equipo */}
      <Text style={styles.equipmentLabel}>Equipo {panel?.name || panel?.id || ''}</Text>
      <Text style={styles.stepTitleStrong}>Interruptor Termomagnetico general (IT-G)</Text>

      {/* ¿Cuantos IT-G tienes? */}
      <View style={styles.rowBetween}>
        <Text style={styles.countLabel}>¿Cuantos IT-G tienes?</Text>
        <TextInput
          style={styles.countInput}
          value={itgCount}
          onChangeText={setItgCount}
          keyboardType="numeric"
          placeholder="1"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Lista IT-G */}
      <View style={{ marginTop: 12 }}>
        {itgDescriptions.map((desc, idx) => (
          <View key={`itg-${idx}`} style={styles.itgCard}>
            <Text style={styles.itgTitle}>IT–G{idx + 1}</Text>
            <Text style={styles.itgSubtitle}>¿Qué suministra eléctricamente el IT-G?</Text>
            <TextInput
              style={styles.itgInput}
              value={desc}
              onChangeText={(text) => {
                setItgDescriptions((prev) => {
                  const next = [...prev];
                  next[idx] = text;
                  return next;
                });
              }}
              placeholder="Ingrese texto"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        ))}
      </View>
    </View>
  );

  const renderStepThree = () => (
    <View style={styles.contentWrapper}>
      {/* Equipo */}
      <Text style={styles.equipmentLabel}>Equipo {panel?.name || panel?.id || ''}</Text>

      {/* IT-G1 title */}
      <Text style={styles.stepTitleStrong}>IT-G1</Text>

      {/* Prefijo */}
      <View style={{ marginBottom: 8 }}>
        <View style={styles.labelWithIconRow}>
          <Text style={styles.countLabel}>Ingrese el prefijo</Text>
          <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
        </View>
        <TextInput
          style={styles.input}
          value={cnPrefix}
          onChangeText={setCnPrefix}
          placeholder="CN, SA"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* ¿Cuántos circuitos tienes? */}
      <View style={styles.rowBetween}>
        <Text style={styles.countLabel}>¿Cuántos circuitos tienes?</Text>
        <TextInput
          style={styles.countInput}
          value={circuitsCount}
          onChangeText={setCircuitsCount}
          keyboardType="numeric"
          placeholder="1"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Lista de circuitos CN-1..N */}
      <View style={{ marginTop: 12 }}>
        {circuits.map((circuit, idx) => (
          <View key={`cn-${idx}`} style={styles.cnCard}>
            <Text style={styles.cnTitle}>{cnPrefix}-{idx + 1}</Text>

            {/* ITM */}
            <Text style={styles.cnSectionTitle}>Interruptor termomagnetico (ITM)</Text>
            <Text style={styles.cnLabel}>FASES</Text>
            <View style={styles.chipGroup}>
              {[
                { key: 'mono_2w' as PhaseType, label: '1Φ 2W' },
                { key: 'tri_3w' as PhaseType, label: '3Φ 3W' },
                { key: 'tri_4w' as PhaseType, label: '3Φ 4W' },
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={`itm-${idx}-${key}`}
                  style={[styles.chip, circuit.phaseITM === key && styles.chipActive]}
                  onPress={() => {
                    setCircuits((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], phaseITM: key };
                      return next;
                    });
                  }}
                >
                  <Text style={[styles.chipText, circuit.phaseITM === key && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.cnLabel}>AMPARAJE:</Text>
            <TextInput
              style={styles.itgInput}
              value={circuit.amperajeITM}
              onChangeText={(text) => {
                setCircuits((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], amperajeITM: text };
                  return next;
                });
              }}
              placeholder="Ingrese amperaje"
              placeholderTextColor="#9CA3AF"
            />

            {/* ID */}
            <Text style={[styles.cnSectionTitle, { marginTop: 12 }]}>Interruptor diferencial (ID)</Text>
            <Text style={styles.cnLabel}>FASES</Text>
            <View style={styles.chipGroup}>
              {[
                { key: 'mono_2w' as PhaseType, label: '1Φ 2W' },
                { key: 'tri_3w' as PhaseType, label: '3Φ 3W' },
                { key: 'tri_4w' as PhaseType, label: '3Φ 4W' },
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={`id-${idx}-${key}`}
                  style={[styles.chip, circuit.phaseID === key && styles.chipActive]}
                  onPress={() => {
                    setCircuits((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], phaseID: key };
                      return next;
                    });
                  }}
                >
                  <Text style={[styles.chipText, circuit.phaseID === key && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.cnLabel}>AMPARAJE:</Text>
            <TextInput
              style={styles.itgInput}
              value={circuit.amperajeID}
              onChangeText={(text) => {
                setCircuits((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], amperajeID: text };
                  return next;
                });
              }}
              placeholder="Ingrese amperaje"
              placeholderTextColor="#9CA3AF"
            />

            {/* Suministro */}
            <Text style={[styles.cnLabel, { marginTop: 12 }]}>¿Qué suministra eléctricamente el Circuito {cnPrefix}-{idx + 1}?</Text>
            <TextInput
              style={styles.itgInput}
              value={circuit.supply}
              onChangeText={(text) => {
                setCircuits((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], supply: text };
                  return next;
                });
              }}
              placeholder="Ingrese texto"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        ))}
      </View>
    </View>
  );

  const renderStepFour = () => (
    <View style={styles.contentWrapper}>
      <Text style={styles.sectionTitle}>Resumen</Text>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Equipo:</Text><Text style={styles.summaryValue}>{panel?.name || panel?.id}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Tipo:</Text><Text style={styles.summaryValue}>{panelType === 'adosado' ? 'Adosado' : 'Empotrado'}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Voltaje:</Text><Text style={styles.summaryValue}>{voltage} V</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Fases:</Text><Text style={styles.summaryValue}>{phase === 'mono_2w' ? 'Monofásico 2 hilos' : phase === 'tri_3w' ? 'Trifásico 3 hilos' : 'Trifásico 4 hilos'}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>IT-G:</Text><Text style={styles.summaryValue}>{itgDescriptions.length}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Prefijo circuitos:</Text><Text style={styles.summaryValue}>{cnPrefix}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Cantidad circuitos:</Text><Text style={styles.summaryValue}>{circuits.length}</Text></View>
      <View style={{ marginTop: 8 }}>
        {circuits.map((c, i) => (
          <View key={`sum-cn-${i}`} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{cnPrefix}-{i + 1}:</Text>
            <Text style={styles.summaryValue}>{c.supply || '—'}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <DefaultHeader title="Configuración del equipo" searchPlaceholder="" />

        {/* Content */}
        {step === 1 ? renderStepOne() : step === 2 ? renderStepTwo() : step === 3 ? renderStepThree() : renderStepFour()}

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
            <Text style={styles.primaryBtnText}>{step === 4 ? 'Guardar' : 'Siguiente'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={goBack}>
            <Text style={styles.secondaryBtnText}>{step === 1 ? 'Cancel' : 'Atrás'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  contentWrapper: { paddingHorizontal: 24, paddingTop: 16 },
  equipmentLabel: { textAlign: 'center', color: '#6B7280', marginBottom: 12 },
  stepTitleStrong: { textAlign: 'center', color: '#11181C', marginBottom: 12, fontWeight: '700', fontSize: 18 },
  sectionTitle: { textAlign: 'center', color: '#1F2937', marginBottom: 8, fontWeight: '600' },
  segmentContainer: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 16 },
  segment: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  segmentActive: { backgroundColor: '#E0F2FE', borderColor: '#0891B2' },
  segmentText: { color: '#11181C' },
  segmentTextActive: { color: '#0891B2', fontWeight: '600' },
  inputWrapper: { position: 'relative', marginBottom: 16 },
  input: { height: 46, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, color: '#11181C' },
  unitWrapper: { position: 'absolute', right: 12, top: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  unitText: { color: '#6B7280' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  countLabel: { color: '#1F2937' },
  countInput: { width: 80, height: 40, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, color: '#11181C' },
  itgCard: { borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12, marginBottom: 12 },
  itgTitle: { fontWeight: '700', color: '#11181C', marginBottom: 8 },
  itgSubtitle: { color: '#6B7280', marginBottom: 8 },
  itgInput: { height: 40, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 2, borderColor: '#7DD3FC', paddingHorizontal: 12, color: '#11181C' },
  listButtons: { gap: 12 },
  listButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  listButtonActive: { borderColor: '#0891B2', backgroundColor: '#E0F2FE' },
  listButtonText: { color: '#11181C' },
  listButtonTextActive: { color: '#0891B2', fontWeight: '600' },
  footer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  primaryBtn: { backgroundColor: '#0891B2', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  secondaryBtnText: { color: '#11181C', fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
  summaryLabel: { color: '#6B7280' },
  summaryValue: { color: '#11181C', fontWeight: '600' },
  // Fase 3 (Circuitos)
  labelWithIconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cnCard: { borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12, marginBottom: 12 },
  cnTitle: { fontWeight: '700', color: '#11181C', marginBottom: 6 },
  cnSectionTitle: { color: '#11181C', fontWeight: '600', marginBottom: 6 },
  cnLabel: { color: '#6B7280', marginBottom: 6 },
  chipGroup: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  chipActive: { borderColor: '#0891B2', backgroundColor: '#E0F2FE' },
  chipText: { color: '#11181C' },
  chipTextActive: { color: '#0891B2', fontWeight: '600' },
});