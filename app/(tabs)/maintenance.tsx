import BuildingCard from '@/components/building-card';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DefaultHeader from '@/components/default-header';

const buildings = [
        { id: '1', initial: 'C', name: 'Centro Empresarial Leuro' },
        { id: '2', initial: 'E', name: 'Edificio Larco' },
        { id: '3', initial: 'E', name: 'Edificio Aliaga 360' },
        { id: '4', initial: 'T', name: 'Torre América' },
];

const styles = StyleSheet.create({
        container: {
                flex: 1,
                backgroundColor: '#F3F4F6',
        },
        headerWrapper: {
                backgroundColor: '#fff',
                paddingBottom: 0,
        },
        listWrapper: {
                paddingHorizontal: 24,
                paddingTop: 24,
                paddingBottom: 24,
        },
        cardMargin: {
                marginBottom: 12,
        },
});



export default function MaintenanceScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const maintenanceType = params.type as string;

    function handleBuildingSelect({building, maintenanceType} : {building: typeof buildings[0], maintenanceType: string}) {
        console.log('Selected:', building.name);
        router.push({
            pathname: '/maintenance/select-device',
            params: {
                type: maintenanceType,
                building: building.name,
                buildingId: building.id
            }
        });
    }
    
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                {/* Header */}
                <View style={styles.headerWrapper}>
                    <DefaultHeader
                        title="¿Qué inmueble deseas gestionar?"
                        searchPlaceholder="Buscar inmuebles"
                        shouldShowBackButton={false}
                    />
                </View>

                {/* Lista de inmuebles */}
                <View style={styles.listWrapper}>
                    {buildings.map((building) => (
                        <View key={building.id} style={styles.cardMargin}>
                            <BuildingCard
                                initial={building.initial}
                                name={building.name}
                                onPress={() => handleBuildingSelect({building, maintenanceType})}
                            />
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
