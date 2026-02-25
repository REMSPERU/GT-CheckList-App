# Plan: Optimizacion de Performance y Estabilidad - Electrical Panel Configuration

## Contexto
El formulario multi-paso de configuracion de paneles electricos en `app/maintenance/electrical-panels/` experimenta lag significativo y riesgo de crashes. Se identificaron 13 problemas de rendimiento y estabilidad.

## Archivos a Modificar
1. `hooks/use-electrical-panel-configuration.ts` - Hook principal (opt 1, 2, 7, 12)
2. `app/maintenance/electrical-panels/configuration.tsx` - Pantalla principal (opt 4, 5, 6)
3. `app/maintenance/electrical-panels/_config-steps/ITGConfigStep.tsx` - Step 2 (opt 3, 6, 8)
4. `app/maintenance/electrical-panels/_config-steps/CircuitsConfigStep.tsx` - Step 3 (opt 6, 11)
5. `app/maintenance/electrical-panels/_config-steps/CircuitItem.tsx` - Circuit cards (opt 6, 8)
6. `app/maintenance/electrical-panels/_config-steps/ExtraComponentsStep.tsx` - Step 4 (opt 7, 9)
7. `app/maintenance/electrical-panels/_config-steps/ExtraConditionsStep.tsx` - Step 5 (opt 13)
8. `app/maintenance/electrical-panels/_config-steps/ReviewStep.tsx` - Step 6 (opt 10)
9. `app/maintenance/electrical-panels/_config-steps/BasicInfoStep.tsx` - Step 1 (opt 13)

---

## Optimizacion 1: Cambiar mode: 'onChange' a 'onBlur' (CRITICO)

**Archivo:** `hooks/use-electrical-panel-configuration.ts:137`

**Cambio:** Reemplazar `mode: 'onChange'` por `mode: 'onBlur'`

**Por que:** Con `onChange`, CADA keystroke ejecuta la validacion Zod completa del schema entero (PanelConfigurationSchema), que incluye arrays anidados con superRefine. Esto es el mayor causante de lag. Con `onBlur`, la validacion solo ocurre cuando un campo pierde el foco. La validacion por paso ya se maneja en `validateCurrentStep()`.

```diff
- mode: 'onChange',
+ // 'onBlur' prevents full Zod schema validation on every keystroke.
+ // Step-level validation is handled explicitly in validateCurrentStep().
+ mode: 'onBlur',
```

---

## Optimizacion 2: Reemplazar watch() global por draft save manual (CRITICO)

**Archivo:** `hooks/use-electrical-panel-configuration.ts:184-232`

**Cambio:** Eliminar la suscripcion `watch()` global y reemplazar por guardado de draft manual en los momentos clave (transicion de paso, goBack, y al desmontar el componente).

**Por que:** `watch(formValues => ...)` suscribe a TODOS los cambios del formulario. Cada keystroke, cada toggle, cada picker change dispara esta callback. Aunque tiene debounce de 3s, la suscripcion en si misma causa que react-hook-form notifique al hook de cada cambio, lo cual tiene overhead. Ademas, `InteractionManager.runAfterInteractions` dentro del setTimeout es un antipatron que puede causar race conditions.

```diff
  const { trigger, getValues, reset, watch } = form;
+ // No longer destructure `watch` — avoid global subscription.

- // Debounce ref for auto-save
- const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

- // Auto-save draft when form values change (with debounce)
- useEffect(() => {
-   const subscription = watch(formValues => {
-     if (isLoadingDraft) return;
-     const storageKey = getStorageKey();
-     if (!storageKey) return;
-     if (saveTimeoutRef.current) {
-       clearTimeout(saveTimeoutRef.current);
-     }
-     saveTimeoutRef.current = setTimeout(() => {
-       InteractionManager.runAfterInteractions(async () => {
-         try {
-           const draft = { formValues, currentStepId, lastUpdated: new Date().toISOString() };
-           let serialized: string;
-           try { serialized = JSON.stringify(draft); } catch { return; }
-           await AsyncStorage.setItem(storageKey, serialized);
-         } catch (error) { console.error('Error saving draft:', error); }
-       });
-     }, 3000);
-   });
-   return () => {
-     subscription.unsubscribe();
-     if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
-   };
- }, [watch, getStorageKey, currentStepId, isLoadingDraft, initialPanel?.id]);

+ // Save draft explicitly — called on step transitions and unmount
+ const saveDraft = useCallback(async () => {
+   if (isLoadingDraft) return;
+   const storageKey = getStorageKey();
+   if (!storageKey) return;
+   try {
+     const draft = {
+       formValues: getValues(),
+       currentStepId,
+       lastUpdated: new Date().toISOString(),
+     };
+     let serialized: string;
+     try { serialized = JSON.stringify(draft); } catch { return; }
+     await AsyncStorage.setItem(storageKey, serialized);
+     if (__DEV__) console.log('Draft saved for panel:', initialPanel?.id);
+   } catch (error) {
+     if (__DEV__) console.error('Error saving draft:', error);
+   }
+ }, [getStorageKey, getValues, currentStepId, isLoadingDraft, initialPanel?.id]);

+ // Save draft on unmount (cleanup)
+ useEffect(() => {
+   return () => { saveDraft(); };
+ }, [saveDraft]);
```

Luego, en `goNext` y `goBack`, llamar `saveDraft()` antes de cambiar de paso:

```diff
  const goNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;
    const currentIndex = getStepIndex(currentStepId);
    if (isLastStep(currentStepId)) {
      // ... save logic
    }
+   await saveDraft(); // Save before step transition
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStepId(STEP_ORDER[currentIndex + 1]);
    }
  };

  const goBack = () => {
+   saveDraft(); // Fire-and-forget save before navigating back
    const currentIndex = getStepIndex(currentStepId);
    // ...
  };
```

Tambien eliminar el useEffect de `saveStepChange` (lineas 234-256) ya que ahora `saveDraft()` guarda el step completo.

Exportar `saveDraft` en el return del hook para que `configuration.tsx` pueda usarlo.

---

## Optimizacion 3: Corregir key inestable en ITGConfigStep (CRITICO)

**Archivo:** `_config-steps/ITGConfigStep.tsx:231`

**Cambio:**
```diff
- const stableKey = `itg-${idx}-${description || 'empty'}`;
+ const stableKey = `itg-${idx}`;
```

**Por que:** La key incluye el valor de `description`, que cambia con cada keystroke. React interpreta un cambio de key como "este es un componente diferente", lo que destruye todo el componente (incluyendo TextInputs con foco) y lo recrea desde cero. Esto causa:
- Perdida de foco del input activo
- Re-mount de todos los Controllers del ITG card
- Flash visual perceptible
- Ejecucion innecesaria de efectos de montaje

---

## Optimizacion 4: ErrorBoundary + Validacion de drafts (ESTABILIDAD)

### 4a. Crear ErrorBoundary
**Archivo nuevo:** `components/ErrorBoundary.tsx`

```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error, info);
    }
    // In production, this would report to Sentry automatically
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Algo salio mal</Text>
          <Text style={styles.message}>
            {this.props.fallbackMessage || 'Ocurrio un error inesperado.'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F3F4F6' },
  title: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  message: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#0891B2', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
```

### 4b. Envolver configuration screen
**Archivo:** `configuration.tsx`

Envolver el return en `<ErrorBoundary>`:

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

// In the render:
return (
  <ErrorBoundary
    fallbackMessage="Ocurrio un error en la configuracion. Sus datos se guardaron como borrador."
    onReset={() => router.back()}
  >
    <SafeAreaView style={styles.container}>
      {/* ... existing content */}
    </SafeAreaView>
  </ErrorBoundary>
);
```

### 4c. Validar draft antes de restaurar
**Archivo:** `hooks/use-electrical-panel-configuration.ts` (dentro de loadDraft)

```diff
  if (parsed.formValues) {
-   reset(parsed.formValues);
+   // Validate draft structure matches current schema before restoring.
+   // A version mismatch (e.g., schema changed between app updates) could
+   // inject invalid data that crashes render components.
+   const result = PanelConfigurationSchema.safeParse(parsed.formValues);
+   if (result.success) {
+     reset(parsed.formValues);
+   } else {
+     if (__DEV__) console.warn('Draft schema mismatch, discarding:', result.error);
+     // Don't restore — use defaults. Optionally clear the stale draft.
+     await AsyncStorage.removeItem(storageKey);
+   }
  }
```

---

## Optimizacion 5: Extraer NavigationFooter y eliminar duplicacion JSX

**Archivo:** `configuration.tsx`

Crear un componente `NavigationFooter` memoizado fuera del componente principal:

```tsx
interface NavigationFooterProps {
  currentStepId: string;
  onNext: () => void;
  onBack: () => void;
}

const NavigationFooter = memo(function NavigationFooter({
  currentStepId,
  onNext,
  onBack,
}: NavigationFooterProps) {
  return (
    <View style={styles.footer}>
      <TouchableOpacity style={styles.primaryBtn} onPress={onNext}>
        <Text style={styles.primaryBtnText}>
          {isLastStep(currentStepId as any) ? 'Guardar' : 'Siguiente'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
        <Text style={styles.secondaryBtnText}>
          {isFirstStep(currentStepId as any) ? 'Cancel' : 'Atras'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});
```

Luego refactorizar el render para eliminar las 3 duplicaciones del footer y simplificar la logica condicional:

```tsx
return (
  <ErrorBoundary ...>
    <SafeAreaView style={styles.container}>
      <FormProvider {...form}>
        {currentStepId === STEP_IDS.CIRCUITS ? (
          Platform.OS === 'ios' ? (
            <KeyboardAvoidingView style={flexOneStyle} behavior="padding" keyboardVerticalOffset={10}>
              <View style={flexOneStyle}>
                <DefaultHeader title="Configuracion del equipo" searchPlaceholder="" />
                <View style={flexOneStyle}>{renderStep()}</View>
                <NavigationFooter currentStepId={currentStepId} onNext={handleGoNext} onBack={handleGoBack} />
              </View>
            </KeyboardAvoidingView>
          ) : (
            <View style={flexOneStyle}>
              <DefaultHeader title="Configuracion del equipo" searchPlaceholder="" />
              <View style={flexOneStyle}>{renderStep()}</View>
              <NavigationFooter currentStepId={currentStepId} onNext={handleGoNext} onBack={handleGoBack} />
            </View>
          )
        ) : (
          <ScrollView>
            <DefaultHeader title="Configuracion del equipo" searchPlaceholder="" />
            {renderStep()}
            <NavigationFooter currentStepId={currentStepId} onNext={handleGoNext} onBack={handleGoBack} />
          </ScrollView>
        )}
      </FormProvider>
    </SafeAreaView>
  </ErrorBoundary>
);

// Outside component:
const flexOneStyle = { flex: 1 } as const;
```

---

## Optimizacion 6: Mover inline styles a constantes

### configuration.tsx
Reemplazar `style={{ flex: 1 }}` con la constante `flexOneStyle` (ver opt 5 arriba).

### CircuitItem.tsx
```diff
- <View style={{ marginTop: 12 }}>
+ <View style={expandedStyles.marginTop12}>

// Add to collapsedStyles or create expandedStyles:
+ marginTop12: { marginTop: 12 },
+ marginTop12Container: { marginTop: 12 },
```

### ITGConfigStep.tsx
```diff
- <View style={{ marginTop: 12 }}>
+ <View style={localStyles.itgListContainer}>

// Add:
const localStyles = StyleSheet.create({
  itgListContainer: { marginTop: 12 },
});
```

### ExtraComponentsStep.tsx
```diff
- <View style={{ flexDirection: 'row', alignItems: 'center' }}>
+ <View style={localStyles.iconRow}>

- <View style={{ marginTop: 12 }}>
+ <View style={localStyles.itemContainer}>

const localStyles = StyleSheet.create({
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  itemContainer: { marginTop: 12 },
});
```

---

## Optimizacion 7: Envolver console.log en __DEV__ guards

**Archivos:** `use-electrical-panel-configuration.ts`, `ExtraComponentsStep.tsx`

### use-electrical-panel-configuration.ts
Envolver TODOS los console.log/console.error en `if (__DEV__)`:

```diff
- console.log('📂 [CONFIG] Loaded draft for panel:', initialPanel?.id);
+ if (__DEV__) console.log('[CONFIG] Loaded draft for panel:', initialPanel?.id);

- console.error('❌ [CONFIG] Error loading draft:', error);
+ if (__DEV__) console.error('[CONFIG] Error loading draft:', error);

- console.log('🔵 [SAVE] Starting panel configuration save...');
+ if (__DEV__) console.log('[SAVE] Starting panel configuration save...');

// Linea 349-354: Eliminar JSON.stringify completo (o solo en __DEV__)
- if (__DEV__) {
-   console.log('🔵 [SAVE] Form values:', JSON.stringify(values, null, 2));
- }
+ // Already guarded by __DEV__ - keep as is but remove emojis for cleaner logs
```

Aplicar el mismo patron a TODAS las instancias de console.log en este archivo.

### ExtraComponentsStep.tsx
```diff
- console.log(`🔄 Toggle ${type}: currently ${isEnabled ? 'enabled' : 'disabled'}`);
- console.log(`  ➡️ Disabling. New enabledComponents:`, newEnabled);
- console.log(`  ➡️ Enabling. New enabledComponents:`, newEnabled);
- console.log(`  ➡️ Initializing ${type} with 1 item`);
+ // Remove all console.log calls from production code
+ // These were debug logs that should not be in production
```

---

## Optimizacion 8: Extraer Icon components como constantes

**Archivos:** `CircuitItem.tsx`, `ITGConfigStep.tsx`

Crear constantes fuera del componente:

```tsx
// At the top of CircuitItem.tsx, outside any component:
const PickerChevronIcon = () => (
  <Ionicons name="chevron-down" size={20} color="#6B7280" />
);

const PickerChevronErrorIcon = () => (
  <Ionicons name="chevron-down" size={20} color="#EF4444" />
);
```

Luego reemplazar todas las instancias de `Icon={() => <Ionicons ...>}` con la referencia:

```diff
- Icon={() => <Ionicons name="chevron-down" size={20} color="#6B7280" />}
+ Icon={PickerChevronIcon}

- Icon={() => <Ionicons name="chevron-down" size={20} color={itgErrors?.cableTypeITG ? '#EF4444' : '#6B7280'} />}
+ Icon={itgErrors?.cableTypeITG ? PickerChevronErrorIcon : PickerChevronIcon}
```

Mismo patron en `ITGConfigStep.tsx`.

---

## Optimizacion 9: Memoizar ExtraComponentsStep por tipo

**Archivo:** `ExtraComponentsStep.tsx`

Extraer cada tipo de componente como un sub-componente memoizado:

```tsx
interface ComponentCardProps {
  type: ExtraComponentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isEnabled: boolean;
  componentList: { id: string; description: string }[];
  onToggle: () => void;
  onUpdateQuantity: (val: string) => void;
}

const ComponentCard = memo(function ComponentCard({
  type, label, icon, isEnabled, componentList, onToggle, onUpdateQuantity,
}: ComponentCardProps) {
  const { control } = useFormContext<PanelConfigurationFormValues>();

  return (
    <View style={styles.componentCard}>
      <View style={styles.componentCardHeader}>
        <View style={localStyles.iconRow}>
          <Ionicons name={icon} size={24} color="#6B7280" style={localStyles.iconMargin} />
          <Text style={styles.componentCardTitle}>{label}</Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={onToggle}
          trackColor={switchTrackColor}
          thumbColor="#FFFFFF"
        />
      </View>
      {isEnabled && (
        <View>
          <View style={styles.rowBetween}>
            <Text style={styles.countLabel}>Cuantos tienes?</Text>
            <TextInput
              style={styles.countInput}
              value={String(componentList.length)}
              onChangeText={onUpdateQuantity}
              keyboardType="numeric"
            />
          </View>
          {componentList.map((item, idx) => (
            <View key={`${type}-${idx}`} style={localStyles.itemContainer}>
              <Text style={localStyles.itemLabel}>{label.toUpperCase()} {idx + 1}</Text>
              <Text style={localStyles.itemSubtitle}>Que suministra electricamente?</Text>
              <Controller
                control={control}
                name={`extraComponents.${type}.${idx}.description`}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput style={styles.itgInput} value={value} onChangeText={onChange} onBlur={onBlur}
                    placeholder="Ingrese descripcion" placeholderTextColor="#9CA3AF" />
                )}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const switchTrackColor = { false: '#D1D5DB', true: '#0891B2' } as const;
```

Esto aisla los re-renders: cambiar un toggle o cantidad de "Contactores" no re-renderiza la card de "Relays".

---

## Optimizacion 10: useMemo en ReviewStep

**Archivo:** `ReviewStep.tsx`

```diff
  export default function ReviewStep({ panel }: ReviewStepProps) {
    const { getValues } = useFormContext<PanelConfigurationFormValues>();
-   const values = getValues();

-   const mappedDetail = {
+   // useMemo to avoid recalculating on parent re-renders.
+   // getValues() is stable and returns fresh data imperatively.
+   const mappedDetail = useMemo(() => {
+     const values = getValues();
+     return {
        rotulo: values.panelName || panel?.equipment_detail?.rotulo || '',
        // ... rest of the mapping stays the same
-   };
+     };
+   }, [getValues, panel]);
```

---

## Optimizacion 11: Deshabilitar removeClippedSubviews

**Archivo:** `CircuitsConfigStep.tsx:427`

```diff
- removeClippedSubviews={Platform.OS === 'ios'}
+ removeClippedSubviews={false}
```

**Por que:** `removeClippedSubviews` puede causar crashes con items complejos que contienen TextInputs, pickers, y vistas anidadas. En iOS, items que salen del viewport y vuelven a entrar pueden tener estado inconsistente. Para una lista de formularios donde la estabilidad es critica, es mejor desactivarlo.

---

## Optimizacion 12: Corregir tipo any en form return

**Archivo:** `hooks/use-electrical-panel-configuration.ts:81`

```diff
  export interface UsePanelConfigurationReturn {
    currentStepId: StepId;
-   form: UseFormReturn<any>;
+   form: UseFormReturn<PanelConfigurationFormValues>;
    goNext: () => Promise<void>;
    goBack: () => void;
+   saveDraft: () => Promise<void>;
  }
```

---

## Optimizacion 13: Memoizar BasicInfoStep y ExtraConditionsStep

### BasicInfoStep.tsx
```diff
+ import { memo } from 'react';

- export default function BasicInfoStep({ panel }: BasicInfoStepProps) {
+ export default memo(function BasicInfoStep({ panel }: BasicInfoStepProps) {
    // ... component body stays the same
- }
+ });
```

### ExtraConditionsStep.tsx
```diff
+ import { memo } from 'react';

- export default function ExtraConditionsStep({ panel }: ExtraConditionsStepProps) {
+ export default memo(function ExtraConditionsStep({ panel }: ExtraConditionsStepProps) {
    // ... component body stays the same
- }
+ });
```

**Por que:** Ambos componentes reciben `panel` como prop (que es estable entre renders). Sin memo, se re-renderizan cada vez que `configuration.tsx` re-renderiza (e.g., por cambio de step, por FormProvider changes). Con memo, solo se re-renderizan si `panel` realmente cambia.

---

## Orden de Implementacion

1. **Opt 1** - mode: 'onBlur' (1 linea, maximo impacto)
2. **Opt 2** - Eliminar watch() global, agregar saveDraft manual
3. **Opt 3** - Corregir key en ITGConfigStep (1 linea)
4. **Opt 4** - ErrorBoundary + validacion de drafts
5. **Opt 7** - __DEV__ guards (rapido, multiples archivos)
6. **Opt 11** - removeClippedSubviews=false (1 linea)
7. **Opt 5** - Extraer NavigationFooter
8. **Opt 6** - Inline styles a constantes
9. **Opt 8** - Extraer Icon components
10. **Opt 9** - Memoizar ExtraComponentsStep
11. **Opt 10** - useMemo en ReviewStep
12. **Opt 12** - Corregir tipo any
13. **Opt 13** - Memoizar BasicInfoStep y ExtraConditionsStep

## Verificacion
- Cada paso puede verificarse con un `npx expo start` y navegando al flujo de configuracion
- No hay tests unitarios existentes que correr
- La app usa React Compiler (`reactCompiler: true`), que automatiza algunos memos, pero las optimizaciones propuestas son complementarias y necesarias porque:
  - React Compiler NO optimiza `mode: 'onChange'` (es un argumento de configuracion, no un patron de render)
  - React Compiler NO puede eliminar suscripciones innecesarias como `watch()`
  - React Compiler NO puede corregir keys inestables
  - React Compiler NO puede agregar ErrorBoundary
