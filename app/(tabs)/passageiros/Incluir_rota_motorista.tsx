import { db } from "@/firebaseConfig";
import {
    Accuracy,
    LocationObject,
    requestForegroundPermissionsAsync,
    watchPositionAsync,
} from "expo-location";
import { onValue, push, ref, remove } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function App() {
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [mapPosition, setMapPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routes, setRoutes] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [rotaSelecionada, setRotaSelecionada] = useState<string>("Rota 1");
  const mapRef = useRef(null);

  async function startLocationTracking() {
    const { granted } = await requestForegroundPermissionsAsync();

    if (granted) {
      setPermissionDenied(false);
      const subscriber = await watchPositionAsync(
        {
          accuracy: Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocation(newLocation);
          if (!mapPosition) {
            setMapPosition(newLocation.coords);
          }
        }
      );
      return () => subscriber.remove();
    } else {
      setPermissionDenied(true);
    }
  }

  useEffect(() => {
    const unsub = startLocationTracking();
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  useEffect(() => {
    const routesRef = ref(db, "rotas/");
    return onValue(routesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const formattedRoutes = Object.entries(data).map(([key, value]) => ({
        id: key,
        ...value,
      }));
      setRoutes(formattedRoutes);
    });
  }, []);

  function salvarRota() {
    if (!location) {
      Alert.alert("Localização não disponível para salvar a rota.");
      return;
    }

    const rotaExistente = routes.find((rota) => rota.nome === rotaSelecionada);
    if (rotaExistente) {
      Alert.alert("Erro", `A ${rotaSelecionada} já possui uma localização salva.`);
      return;
    }

    const rotasRef = ref(db, "rotas");
    const novaRota = {
      nome: rotaSelecionada,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: Date.now(),
    };

    push(rotasRef, novaRota)
      .then(() => Alert.alert("Rota salva com sucesso!"))
      .catch((err) => Alert.alert("Erro ao salvar rota:", err.message));
  }

  function excluirRota(id) {
    Alert.alert("Confirmação", "Deseja excluir esta rota?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          const rotaRef = ref(db, `rotas/${id}`);
          remove(rotaRef).catch((err) =>
            Alert.alert("Erro ao excluir rota:", err.message)
          );
        },
      },
    ]);
  }

  function moverParaRota(rota) {
    const region = {
      latitude: rota.latitude,
      longitude: rota.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };

    setMapPosition({
      latitude: rota.latitude,
      longitude: rota.longitude,
    });

    if (mapRef.current) {
      mapRef.current.animateToRegion(region, 1000);
    }
  }

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center", margin: 16 }}>
          Permissão de localização foi negada. Por favor, ative nas configurações do sistema.
        </Text>
        <TouchableOpacity onPress={startLocationTracking} style={styles.tryAgainButton}>
          <Text style={{ color: "white" }}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!location || !mapPosition) {
    return (
      <View style={styles.container}>
        <Text>Carregando localização...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={{
          latitude: mapPosition.latitude,
          longitude: mapPosition.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      >
        <Marker coordinate={mapPosition} title="Local Selecionado" />
      </MapView>

      <View style={styles.bottomContainer}>
        <View style={styles.rotaSelector}>
          {["Rota 1", "Rota 2", "Rota 3", "Rota 4", "Rota 5"].map((nome) => {
            const rotaExiste = routes.some((r) => r.nome === nome);
            const isSelecionada = rotaSelecionada === nome;

            let backgroundColor = "#007bff"; // azul padrão
            if (rotaExiste) backgroundColor = "#ffc107"; // amarelo = rota cadastrada
            if (isSelecionada) backgroundColor = "#28a745"; // verde = selecionada

            return (
              <TouchableOpacity
                key={nome}
                onPress={() => {
                  setRotaSelecionada(nome);
                  const rota = routes.find((r) => r.nome === nome);
                  if (rota) {
                    moverParaRota(rota);
                  } else if (location) {
                    moverParaRota({
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                    });
                  }
                }}
                style={[styles.rotaButton, { backgroundColor }]}
              >
                <Text style={{ color: "white", fontSize: 12 }}>{nome}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={salvarRota} style={styles.saveButton}>
          <Text style={{ color: "white", fontWeight: "bold" }}>
            Salvar {rotaSelecionada}
          </Text>
        </TouchableOpacity>

        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          style={styles.routeList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.routeItem}
              onPress={() => moverParaRota(item)}
            >
              <Text>
                {item.nome ? `${item.nome} - ` : ""}
                Lat: {item.latitude.toFixed(6)}, Lon: {item.longitude.toFixed(6)}
              </Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => excluirRota(item.id)}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>X</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <Text style={{ textAlign: "center", marginTop: 10 }}>
              Nenhuma rota cadastrada.
            </Text>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: {
    flex: 1,
  },
  bottomContainer: {
    backgroundColor: "white",
    padding: 10,
    maxHeight: 350,
  },
  saveButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  routeList: {
    maxHeight: 250,
  },
  routeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomColor: "#ddd",
    borderBottomWidth: 1,
  },
  deleteButton: {
    backgroundColor: "#ff3b30",
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  tryAgainButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#007bff",
    borderRadius: 8,
  },
  rotaSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  rotaButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#007bff",
  },
});
