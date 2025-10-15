import Feather from "@expo/vector-icons/Feather";
import { JSX } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";

type Props = {
  icon: JSX.Element;
  title: string;
  description: string;
  link: string;
};

export default function OptionCard({ icon, title, description, link }: Props) {
  return (
    <View className="flex-row items-start col-span-2 bg-white dark:bg-white/90 rounded-lg shadow-md p-4 mb-4 w-11/12">
      <View className="flex-1 pr-4">
        <View className="flex-row items-center mb-2">
          {icon}
          <Text className="text-lg font-bold ml-2">{title}</Text>
        </View>
        <Text className="text-gray-600">{description}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(link)} className="mt-2">
          <Text className="text-blue-500">Learn more</Text>
        </TouchableOpacity>
      </View>

      <View className="justify-center items-center">
        <Feather name="chevron-right" size={24} color="black" />
      </View>
    </View>
  );
}
