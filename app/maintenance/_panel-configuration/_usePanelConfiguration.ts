import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  PanelType,
  PhaseType,
  CircuitConfig,
  PanelData,
  ExtraComponentType,
  ExtraComponent,
} from "./_types";

const DEFAULT_CIRCUIT: CircuitConfig = {
  phaseITM: "mono_2w",
  amperajeITM: "",
  diameter: "",
  cableType: undefined,
  hasID: false,
  supply: "",
};

export function usePanelConfiguration(initialPanel: PanelData | null) {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);

  // Step 1 fields
  const [panelType, setPanelType] = useState<PanelType>("adosado");
  const [voltage, setVoltage] = useState<string>("220");
  const [phase, setPhase] = useState<PhaseType>("mono_2w");

  // Step 2 fields - IT-G
  const [itgCount, setItgCount] = useState<string>("3");
  const [itgDescriptions, setItgDescriptions] = useState<string[]>(
    Array(3).fill("")
  );

  // Step 3 fields - Circuitos de IT-G1
  const [cnPrefix, setCnPrefix] = useState<string>("CN");
  const [circuitsCount, setCircuitsCount] = useState<string>("1");
  const [circuits, setCircuits] = useState<CircuitConfig[]>(
    Array(5)
      .fill(null)
      .map(() => ({ ...DEFAULT_CIRCUIT }))
  );

  // Step 4 fields - Extra components
  const [enabledComponents, setEnabledComponents] = useState<
    ExtraComponentType[]
  >([]);
  const [extraComponents, setExtraComponents] = useState<
    Record<ExtraComponentType, ExtraComponent[]>
  >({
    contactores: [],
    relays: [],
    ventiladores: [],
    termostato: [],
    medidores: [],
    timers: [],
  });

  // Keep IT-G descriptions in sync with count
  useEffect(() => {
    const n = Math.max(0, parseInt(itgCount || "0", 10));
    setItgDescriptions((prev) => {
      const next = [...prev];
      if (n > next.length) {
        for (let i = next.length; i < n; i++) next.push("");
      } else if (n < next.length) {
        next.length = n;
      }
      return next;
    });
  }, [itgCount]);

  // Keep circuits list in sync with circuitsCount
  useEffect(() => {
    const n = Math.max(0, parseInt(circuitsCount || "0", 10));
    setCircuits((prev) => {
      const next = [...prev];
      if (n > next.length) {
        for (let i = next.length; i < n; i++) next.push({ ...DEFAULT_CIRCUIT });
      } else if (n < next.length) {
        next.length = n;
      }
      return next;
    });
  }, [circuitsCount]);

  const validateStepOne = (): boolean => {
    if (!voltage.trim()) {
      Alert.alert("Validación", "Ingrese el voltaje.");
      return false;
    }
    return true;
  };

  const validateStepTwo = (): boolean => {
    const n = parseInt(itgCount || "0", 10);
    if (isNaN(n) || n < 1) {
      Alert.alert("Validación", "Indique al menos 1 IT-G.");
      return false;
    }
    return true;
  };

  const validateStepThree = (): boolean => {
    const c = parseInt(circuitsCount || "0", 10);
    if (!cnPrefix.trim()) {
      Alert.alert("Validación", "Ingrese el prefijo (por ejemplo, CN o SA).");
      return false;
    }
    if (isNaN(c) || c < 1) {
      Alert.alert("Validación", "Indique al menos 1 circuito.");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 1) {
      if (!validateStepOne()) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!validateStepTwo()) return;
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!validateStepThree()) return;
      setStep(4);
      return;
    }
    if (step === 4) {
      setStep(5);
      return;
    }
    if (step === 5) {
      // Simulate save and go back
      Alert.alert(
        "Configuración guardada",
        "El equipo ha sido configurado correctamente.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  };

  return {
    step,
    panelType,
    setPanelType,
    voltage,
    setVoltage,
    phase,
    setPhase,
    itgCount,
    setItgCount,
    itgDescriptions,
    setItgDescriptions,
    cnPrefix,
    setCnPrefix,
    circuitsCount,
    setCircuitsCount,
    circuits,
    setCircuits,
    enabledComponents,
    setEnabledComponents,
    extraComponents,
    setExtraComponents,
    goNext,
    goBack,
  };
}
