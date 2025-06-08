import { db } from "@/firebaseConfig";
import { useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [inputEmail, setInputEmail] = useState("");
  const [inputSenha, setInputSenha] = useState("");

  async function login() {
    try {
      const refUsuario = ref(db, "usuarios");
      const getUsuario = await get(refUsuario);

      if (getUsuario.exists()) {
        const usuarioEncontrado = Object.values(getUsuario.val()).find(
          (usuario: any) => usuario.email === inputEmail && usuario.senha === inputSenha
        );

        if (usuarioEncontrado) {
          usuarioEncontrado.ocupacao === "1"
            ? router.push("/(tabs)/passageiros/rota_passageiro")
            : router.push("/(tabs)/motorista/assentos");
        } else {
          alert("Email ou senha inválidos");
        }
      } else {
        alert("Usuário não encontrado");
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" onChangeText={setInputEmail} />
      <TextInput style={styles.input} placeholder="Senha" secureTextEntry onChangeText={setInputSenha} />
      <TouchableOpacity style={styles.button} onPress={login}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: { width: "80%", padding: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 5, marginBottom: 10 },
  button: { backgroundColor: "#007AFF", padding: 10, borderRadius: 5 },
  buttonText: { color: "#fff", fontSize: 18 },
});
