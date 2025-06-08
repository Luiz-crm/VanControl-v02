import { useNavigation, useRoute } from "@react-navigation/native";
import { getDatabase, onValue, ref, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AssentosScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { rotaSelecionada, usuarioId } = route.params as any;

  const [assentos, setAssentos] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const db = getDatabase();
    const assentosRef = ref(db, `rotas/${rotaSelecionada.id}/assentos`);

    const unsubscribe = onValue(assentosRef, (snapshot) => {
      const data = snapshot.val() || {};
      setAssentos(data);
    });

    return () => unsubscribe();
  }, [rotaSelecionada.id]);

  const selecionarAssento = async (index: number) => {
    const db = getDatabase();
    const assentoRef = ref(db, `rotas/${rotaSelecionada.id}/assentos/${index}`);

    if (assentos[index]?.ocupado) {
      Alert.alert("Assento Ocupado", "Este assento já está ocupado.");
      return;
    }

    const updates = {
      [`rotas/${rotaSelecionada.id}/assentos/${index}`]: {
        ocupado: true,
        usuarioId,
      },
    };

    try {
      await update(ref(db), updates);
      navigation.navigate("ver_rota_motorista", {
        rotaSelecionada,
        assentoSelecionado: index,
        usuarioId,
      });
    } catch (error) {
      console.error("Erro ao salvar assento:", error);
      Alert.alert("Erro", "Não foi possível selecionar o assento.");
    }
  };

  const renderAssento = ({ item, index }: { item: any; index: number }) => {
    const ocupado = assentos[index]?.ocupado;
    return (
      <TouchableOpacity
        style={[styles.assento, ocupado ? styles.ocupado : styles.livre]}
        onPress={() => selecionarAssento(index)}
        disabled={ocupado}
      >
        <Text style={styles.assentoTexto}>{index + 1}</Text>
      </TouchableOpacity>
    );
  };

  const totalAssentos = 12; // defina o total desejado

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Selecione um Assento</Text>
      <FlatList
        data={Array.from({ length: totalAssentos })}
        renderItem={({ _, index }) => renderAssento({ item: null, index })}
        keyExtractor={(_, index) => index.toString()}
        numColumns={4}
        contentContainerStyle={styles.lista}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  titulo: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  lista: { alignItems: "center" },
  assento: {
    width: 60,
    height: 60,
    margin: 8,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  livre: { backgroundColor: "#4caf50" },
  ocupado: { backgroundColor: "#f44336" },
  assentoTexto: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
