import {
    Accuracy,
    LocationObject,
    requestForegroundPermissionsAsync,
    watchPositionAsync,
} from "expo-location";
import { getDatabase, onValue, ref } from "firebase/database";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Button,
    StyleSheet,
    Text,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

type Rota = {
  id: string;
  nome?: string;
  latitude: number;
  longitude: number;
};

export default function TelaMapaRotasMotorista() {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [loadingRotas, setLoadingRotas] = useState(true);

  const [location, setLocation] = useState<LocationObject | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [viagemIniciada, setViagemIniciada] = useState(false);

  const mapRef = useRef<MapView>(null);

  async function startLocationTracking() {
    const { granted } = await requestForegroundPermissionsAsync();

    if (!granted) {
      setPermissionDenied(true);
      Alert.alert(
        "Permissão negada",
        "Permissão de localização foi negada. Por favor, ative nas configurações."
      );
      return;
    }

    setPermissionDenied(false);

    await watchPositionAsync(
      {
        accuracy: Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      (newLocation) => {
        setLocation(newLocation);

        if (viagemIniciada) {
          const { latitude, longitude } = newLocation.coords;

          mapRef.current?.animateToRegion(
            {
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            1000
          );
        }
      }
    );
  }

  useEffect(() => {
    const db = getDatabase();
    const rotasRef = ref(db, "rotas");

    const unsubscribe = onValue(
      rotasRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const listaRotas: Rota[] = Object.entries(data)
          .map(([key, value]: [string, any]) => ({
            id: key,
            nome: value.nome || "Rota sem nome",
            latitude: Number(value.latitude),
            longitude: Number(value.longitude),
          }))
          .filter(
            (rota) => !isNaN(rota.latitude) && !isNaN(rota.longitude)
          );

        setRotas(listaRotas);
        setLoadingRotas(false);
      },
      (error) => {
        setLoadingRotas(false);
        Alert.alert("Erro", "Falha ao carregar rotas: " + error.message);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    startLocationTracking();
  }, []);

  function handleIniciarViagem() {
    if (!location) {
      Alert.alert(
        "Localização não disponível",
        "Não foi possível obter sua localização atual."
      );
      return;
    }

    setViagemIniciada(true);
    const { latitude, longitude } = location.coords;

    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000
    );

    Alert.alert("Viagem iniciada", "O mapa será atualizado em tempo real conforme você se movimentar.");
  }

  if (permissionDenied) {
    return (
      <View style={styles.loading}>
        <Text style={{ textAlign: "center", margin: 16 }}>
          Permissão de localização foi negada. Por favor, ative nas configurações do sistema.
        </Text>
      </View>
    );
  }

  if (loadingRotas) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Carregando rotas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation={false}
        initialRegion={{
          latitude: -23.55052,
          longitude: -46.633308,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {rotas.map((rota) => (
          <Marker
            key={rota.id}
            coordinate={{ latitude: rota.latitude, longitude: rota.longitude }}
            title={rota.nome}
            description={`ID: ${rota.id}`}
            pinColor="#007AFF"
          />
        ))}

        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Minha localização"
            pinColor="red"
          />
        )}
      </MapView>

      {!viagemIniciada && (
        <View style={styles.botaoContainer}>
          <Button title="Iniciar Viagem" onPress={handleIniciarViagem} color="#007AFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  botaoContainer: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
  },
});
