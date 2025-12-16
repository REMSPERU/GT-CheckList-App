import { View, Text, TextInput } from 'react-native';
import { ITGConfigStepProps } from './_types';
import { styles } from './_styles';

export default function ITGConfigStep({
    panel,
    itgCount,
    setItgCount,
    itgDescriptions,
    setItgDescriptions,
}: ITGConfigStepProps) {
    return (
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
}
