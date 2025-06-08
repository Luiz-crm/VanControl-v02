import { useLocalSearchParams, useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import "../../firebaseConfig"; // ajuste se estiver em outro caminho

export default function AssentosScreen() {
  const router = useRouter();
  const { rotaID } = useLocalSearchParams(); // obtém o id da rota da URL
  const [assentoSelecionado, setAssentoSelecionado] = useState<number | null>(null);

  const totalAssentos = 12;

  const handlePress = (index: number) => {
    setAssentoSelecionado(assentoSelecionado === index ? null : index);
  };

  const salvarLocalizacao = async () => {
    if (assentoSelecionado === null) {
      Alert.alert("Atenção", "Selecione um assento antes de confirmar.");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    try {
      const db = getDatabase();
      const referencia = ref(db, `localizacoesUsuarios/${user.uid}/${rotaID}`);

      await set(referencia, {
        assento: assentoSelecionado,
      });

      Alert.alert("Sucesso", "Assento registrado com sucesso!");

      router.push("/"); // ou outra tela após confirmação
    } catch (error) {
      console.error("Erro ao salvar assento:", error);
      Alert.alert("Erro", "Não foi possível salvar o assento.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>ControlVan</Text>
      </View>

      <View style={styles.titulo}>
        <Text style={styles.tituloText}>Frente</Text>
      </View>

      <View style={styles.formatoVan}>
        {Array.from({ length: 6 }).map((_, linha) => (
          <View key={linha} style={styles.linhaBancos}>
            {[0, 1].map((coluna) => {
              const index = linha * 2 + coluna;
              const selecionado = assentoSelecionado === index;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.assentos,
                    { backgroundColor: selecionado ? "#FF3B30" : "#90ee90" },
                  ]}
                  onPress={() => handlePress(index)}
                >
                  <Text>{selecionado ? "Ocupado" : "Vago"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.botaoContainer}>
        <Button title="Confirmar Assento" onPress={salvarLocalizacao} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    justifyContent: "center",
    alignItems: "center",
    height: 100,
    backgroundColor: "gray",
  },
  headerText: { fontSize: 24, color: "white" },
  titulo: {
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
  },
  tituloText: { fontSize: 18 },
  formatoVan: {
    flex: 1,
    backgroundColor: "#483d8b",
    margin: 20,
    padding: 10,
    borderRadius: 10,
  },
  linhaBancos: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  assentos: {
    height: 50,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 25,
  },
  botaoContainer: { padding: 20 },
});
