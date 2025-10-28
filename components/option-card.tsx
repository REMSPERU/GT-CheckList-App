import Feather from "@expo/vector-icons/Feather";
import { JSX } from "react";
import { Linking, Text, TouchableOpacity, View, StyleSheet } from "react-native";

type Props = {
  icon: JSX.Element;
  title: string;
  description: string;
  link: string;
};

export default function OptionCard({ icon, title, description, link }: Props) {
  return (
    <View>
      <View style={styles.content}
      >
        <View style={styles.row}>
          {icon}
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.description}>{description}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(link)} style={styles.learnMoreWrap}>
          <Text style={styles.learnMore}>Learn more</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chevronWrap}>
        <Feather name="chevron-right" size={24} color="black" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingRight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  description: { color: '#4B5563' },
  learnMoreWrap: { marginTop: 8 },
  learnMore: { color: '#3B82F6' },
  chevronWrap: { justifyContent: 'center', alignItems: 'center' },
});
