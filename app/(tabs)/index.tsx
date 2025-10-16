import { Alert, Text, TouchableOpacity, View } from "react-native";

import OptionCard from "@/components/option-card";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Ionicons } from '@expo/vector-icons';
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Octicons from '@expo/vector-icons/Octicons';
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const iconColor = useThemeColor({}, 'icon');
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const options = [{
    icon: <Octicons name="checklist" size={24} color={iconColor} />,
    title: 'Check Lists',
  }, {
    icon: <MaterialIcons name="home-repair-service" size={24} color={iconColor} />,
    title: 'Mantenimiento Preventivo',
  },
  {
    icon: <MaterialIcons name="home-repair-service" size={24} color={iconColor} />,
    title: 'Mantenimiento Correctivo',
  },
  {
    icon: <Feather name="file-text" size={24} color={iconColor} />,
    title: 'Ficha Técnica',
  }];

  return (
      <View className='flex-1 bg-white dark:bg-gray-900'>
        {/* Header with user info */}
        <View className='items-center justify-between flex-row px-4 mb-2 pb-3 border-b-2 border-gray-200 dark:border-gray-700 h-16'>
          <View>
            <Text className='text-sm text-gray-500 dark:text-gray-400'>Bienvenido,</Text>
            <Text className='text-lg font-bold text-text dark:text-white'>{user?.username}</Text>
          </View>
          <TouchableOpacity 
            onPress={handleLogout}
            className="bg-red-500 px-4 py-2 rounded-lg flex-row items-center"
          >
            <Ionicons name="log-out-outline" size={18} color="white" />
            <Text className="text-white ml-2 font-semibold">Salir</Text>
          </TouchableOpacity>
        </View>

        <View className='items-center justify-center mb-4'>
          <Text className='text-2xl font-bold text-text dark:text-white'>¿Qué necesita hacer?</Text>
        </View>

        <View className='flex-1 items-center mt-4'>
          {options.map((option, index) => (
            <OptionCard key={index} icon={option.icon} title={option.title} description="" link="#" />
          ))}
        </View>

          <View className='absolute inset-x-0 bottom-0 pb-2'>
            <Text className='text-center text-gray-400 dark:text-gray-500 text-xs mb-1'>
              Rol: {user?.role} • v1.0.0
            </Text>
          </View>
      </View>
  );
}
