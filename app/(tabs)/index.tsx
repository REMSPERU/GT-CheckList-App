import { Text, View } from "react-native";

import OptionCard from "@/components/option-card";
import { useThemeColor } from "@/hooks/use-theme-color";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Octicons from '@expo/vector-icons/Octicons';

export default function HomeScreen() {
  const iconColor = useThemeColor({}, 'icon');

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
        <View className='items-center justify-center mb-6 bottom-1 border-b-2 border-gray-200 dark:border-gray-700 h-11'>
          <Text className='text-2xl font-bold text-text dark:text-white'>¿Qué necesita hacer?</Text>
        </View>
        <View className='flex-1 items-center mt-8'>
          {options.map((option, index) => (
            <OptionCard key={index} icon={option.icon} title={option.title} description="" link="#" />
          ))}
        </View>
      </View>
  );
}
