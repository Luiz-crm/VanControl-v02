import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

import MapView, { Marker, Polyline } from "react-native-maps";

import {
    Accuracy,
    LocationObject,
    requestForegroundPermissionsAsync,
    watchPositionAsync,
} from "expo-location";

import { db } from "@/firebaseConfig"; // seu config do Firebase

import {
    onValue,
    orderByChild,
    push,
    query,
    ref,
    remove,
} from "firebase/database";

export default function Layout() {
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [rotas, setRotas] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"cadastro" | "motorista">("cadastro");
  const mapRef = useRef<MapView>(null);

  // Pede permissão e começa rastrear localização
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
        (newLocation) => setLocation(newLocation)
      );
      return () => subscriber.remove();
    } else {
      setPermissionDenied(true);
      Alert.alert(
        "Permissão negada",
        "Ative a permissão de localização nas configurações do sistema."
      );
    }
  }

  // Carregar rotas do Firebase (ordenando pelo timestamp)
  useEffect(() => {
    const routesRef = query(ref(db, "rotas"), orderByChild("timestamp"));
    const unsubscribe = onValue(routesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, value]: any) => ({
        id,
        ...value,
      }));
      setRotas(list);
    });
    startLocationTracking();
    return () => {
      unsubscribe();
    };
  }, []);

  // Salvar a localização atual no Firebase como nova rota
  function salvarRota() {
    if (!location) {
      Alert.alert("Erro", "Localização não disponível.");
      return;
    }
    const rotasRef = ref(db, "rotas");
    push(rotasRef, {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: Date.now(),
    });
  }

  // Excluir rota pelo id
  function excluirRota(id: string) {
    Alert.alert("Confirmação", "Deseja excluir esta rota?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          remove(ref(db, `rotas/${id}`));
          if (selectedIndex !== null) setSelectedIndex(null);
        },
      },
    ]);
  }

  // Quando clicar numa rota na lista, centralizar no mapa e mover marcador
  function selecionarRota(index: number) {
    setSelectedIndex(index);
    if (!mapRef.current) return;
    const rota = rotas[index];
    mapRef.current.animateToRegion(
      {
        latitude: rota.latitude,
        longitude: rota.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      500
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.centered}>
        <Text style={{ margin: 16, textAlign: "center" }}>
          Permissão de localização negada. Ative nas configurações do sistema.
        </Text>
        <TouchableOpacity onPress={startLocationTracking} style={styles.button}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Carregando localização...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Botões para alternar entre modos */}
      <View style={styles.modeButtons}>
        <TouchableOpacity
          onPress={() => setViewMode("cadastro")}
          style={[
            styles.modeButton,
            viewMode === "cadastro" && styles.modeButtonSelected,
          ]}
        >
          <Text
            style={[
              styles.modeButtonText,
              viewMode === "cadastro" && styles.modeButtonTextSelected,
            ]}
          >
            Cadastrar Rota
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode("motorista")}
          style={[
            styles.modeButton,
            viewMode === "motorista" && styles.modeButtonSelected,
          ]}
        >
          <Text
            style={[
              styles.modeButtonText,
              viewMode === "motorista" && styles.modeButtonTextSelected,
            ]}
          >
            Visão Motorista
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === "cadastro" && (
        <>
          {/* Botão para salvar rota */}
          <TouchableOpacity style={styles.saveButton} onPress={salvarRota}>
            <Text style={styles.saveButtonText}>Salvar Minha Localização</Text>
          </TouchableOpacity>

          {/* Lista de rotas cadastradas */}
          <FlatList
            data={rotas}
            keyExtractor={(item) => item.id}
            style={styles.routeList}
            renderItem={({ item, index }) => {
              const isSelected = selectedIndex === index;
              return (
                <TouchableOpacity
                  style={[
                    styles.routeItem,
                    isSelected && styles.routeItemSelected,
                  ]}
                  onPress={() => selecionarRota(index)}
                >
                  <View>
                    <Text style={styles.routeText}>
                      Latitude: {item.latitude.toFixed(6)}
                    </Text>
                    <Text style={styles.routeText}>
                      Longitude: {item.longitude.toFixed(6)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => excluirRota(item.id)}
                  >
                    <Text style={styles.deleteButtonText}>Excluir</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />

          {/* Mapa mostrando localização e rota selecionada */}
          <MapView
            ref={mapRef}
            style={styles.map}
            region={
              selectedIndex !== null
                ? {
                    latitude: rotas[selectedIndex].latitude,
                    longitude: rotas[selectedIndex].longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }
                : {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }
            }
          >
            {/* Marcador da localização atual (ou selecionada) */}
            <Marker
              coordinate={
                selectedIndex !== null
                  ? {
                      latitude: rotas[selectedIndex].latitude,
                      longitude: rotas[selectedIndex].longitude,
                    }
                  : {
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                    }
              }
              title={
                selectedIndex !== null
                  ? `Rota Selecionada`
                  : `Minha Localização`
              }
              pinColor={selectedIndex !== null ? "#FF3B30" : "#007bff"}
            />
          </MapView>
        </>
      )}

      {viewMode === "motorista" && (
        <MapView
          style={styles.map}
          initialRegion={
            rotas.length > 0
              ? {
                  latitude: rotas[0].latitude,
                  longitude: rotas[0].longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }
              : {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }
          }
        >
          {/* Marcadores para todas rotas */}
          {rotas.map((rota, index) => (
            <Marker
              key={rota.id}
              coordinate={{
                latitude: rota.latitude,
                longitude: rota.longitude,
              }}
              title={`Ponto ${index + 1}`}
              description={`Lat: ${rota.latitude.toFixed(
                6
              )}, Lon: ${rota.longitude.toFixed(6)}`}
            />
          ))}

          {/* Linha conectando todos pontos */}
          <Polyline
            coordinates={rotas.map((r) => ({
              latitude: r.latitude,
              longitude: r.longitude,
            }))}
            strokeColor="#007bff"
            strokeWidth={4}
          />
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modeButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 8,
  },
  modeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#ddd",
    marginHorizontal: 8,
  },
  modeButtonSelected: {
    backgroundColor: "#007bff",
  },
  modeButtonText: {
    color: "#000",
    fontWeight: "bold",
  },
   modeButtonTextSelected: {
    color: "#fff",
  },
  saveButton: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  routeList: {
    maxHeight: 200,
    marginHorizontal: 16,
  },
  routeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    marginVertical: 4,
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
  },
  routeItemSelected: {
    backgroundColor: "#cce5ff",
  },
  routeText: {
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  map: {
    flex: 1,
    marginTop: 10,
  },
});

