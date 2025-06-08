import { db } from "@/firebaseConfig";
import { onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function ListarDadosScreen() {
  const [dados, setDados] = useState<any>({});

  useEffect(() => {
    const rootRef = ref(db, "/"); // Acessa o nó raiz
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      setDados(data || {});
    });

    return () => unsubscribe();
  }, []);

  const renderDados = (obj: any, nivel = 0) => {
    if (typeof obj !== "object" || obj === null) {
      return (
        <Text style={[styles.valor, { marginLeft: nivel * 10 }]}>
          {String(obj)}
        </Text>
      );
    }

    return Object.entries(obj).map(([chave, valor], index) => (
      <View key={`${chave}-${index}`} style={{ marginLeft: nivel * 10 }}>
        <Text style={styles.chave}>📁 {chave}</Text>
        {renderDados(valor, nivel + 1)}
      </View>
    ));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>📂 Dados do Firebase</Text>
      {Object.keys(dados).length === 0 ? (
        <Text style={styles.vazio}>Nenhum dado encontrado no banco.</Text>
      ) : (
        renderDados(dados)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  titulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  chave: {
    fontWeight: "600",
    color: "#1d3557",
    fontSize: 14,
  },
  valor: {
    color: "#343a40",
    fontSize: 13,
    marginBottom: 4,
  },
  vazio: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
    color: "#888",
  },
});
