import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import DefaultHeader from '@/components/default-header';
import {
  supabaseCompanyService,
  Company,
} from '@/services/supabase-company.service';
import RNPickerSelect from 'react-native-picker-select';
import { PropertyResponse } from '@/types/api';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CompanyListItem extends Company {
  isAssigned: boolean;
}

export default function AssignProvidersScreen() {
  const [properties, setProperties] = useState<
    Pick<PropertyResponse, 'id' | 'name'>[]
  >([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [assignedCompanies, setAssignedCompanies] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  // Fetch initial data (properties and companies)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [props, comps] = await Promise.all([
          supabaseCompanyService.listProperties(),
          supabaseCompanyService.listCompanies(),
        ]);
        setProperties(props);
        setCompanies(comps);
      } catch {
        Alert.alert('Error', 'No se pudieron cargar los datos iniciales.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch assignments when a property is selected
  useEffect(() => {
    if (!selectedProperty) {
      setAssignedCompanies(new Set());
      return;
    }

    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const assignedIds =
          await supabaseCompanyService.getAssignmentsForProperty(
            selectedProperty,
          );
        setAssignedCompanies(new Set(assignedIds));
      } catch {
        Alert.alert(
          'Error',
          'No se pudieron cargar las asignaciones para este inmueble.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [selectedProperty]);

  const handleToggleAssignment = async (
    companyId: string,
    isCurrentlyAssigned: boolean,
  ) => {
    if (!selectedProperty || isSwitching) return;

    setIsSwitching(true);
    const originalAssignments = new Set(assignedCompanies);

    try {
      if (isCurrentlyAssigned) {
        // Optimistic update: remove from UI
        setAssignedCompanies(prev => {
          const next = new Set(prev);
          next.delete(companyId);
          return next;
        });
        await supabaseCompanyService.unassignCompanyFromProperty(
          companyId,
          selectedProperty,
        );
      } else {
        // Optimistic update: add to UI
        setAssignedCompanies(prev => new Set(prev).add(companyId));
        await supabaseCompanyService.assignCompanyToProperty(
          companyId,
          selectedProperty,
        );
      }
    } catch {
      // Revert on error
      setAssignedCompanies(originalAssignments);
      Alert.alert('Error', 'No se pudo actualizar la asignación.');
    } finally {
      setIsSwitching(false);
    }
  };

  const propertyPickerItems = properties.map(p => ({
    label: p.name,
    value: p.id,
  }));

  const companyList: CompanyListItem[] = companies.map(c => ({
    ...c,
    isAssigned: assignedCompanies.has(c.id),
  }));

  return (
    <SafeAreaView style={styles.container}>
      <DefaultHeader title="Asignar Proveedores" />
      <View style={styles.pickerContainer}>
        <RNPickerSelect
          onValueChange={value => setSelectedProperty(value)}
          items={propertyPickerItems}
          placeholder={{ label: 'Seleccione un inmueble...', value: null }}
          style={pickerSelectStyles}
        />
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} size="large" />}

      {!loading && selectedProperty && (
        <FlatList
          data={companyList}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.nombre}</Text>
              <Switch
                trackColor={{ false: '#E5E7EB', true: '#0891B2' }}
                thumbColor={'#fff'}
                onValueChange={() =>
                  handleToggleAssignment(item.id, item.isAssigned)
                }
                value={item.isAssigned}
                disabled={isSwitching}
              />
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {!loading && !selectedProperty && (
        <View style={styles.centered}>
          <Text>
            Por favor, seleccione un inmueble para ver los proveedores.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  pickerContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    color: 'black',
    backgroundColor: 'white',
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    color: 'black',
    backgroundColor: 'white',
  },
});
