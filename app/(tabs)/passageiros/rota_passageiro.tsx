import { db } from "@/firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import {
  Accuracy,
  LocationObject,
  requestForegroundPermissionsAsync,
  watchPositionAsync,
} from "expo-location";
import { onValue, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function SelecionarRotaScreen() {
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [mapPosition, setMapPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routes, setRoutes] = useState<Array<{ id: string; nome: string; latitude: number; longitude: number }>>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [rotaSelecionada, setRotaSelecionada] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const navigation = useNavigation();

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
      const formattedRoutes = Object.entries(data).map(([key, value]: any) => ({
        id: key,
        nome: value.nome,
        latitude: value.latitude,
        longitude: value.longitude,
      }));
      setRoutes(formattedRoutes);

      // Se não tiver rota selecionada ainda, seleciona a primeira rota cadastrada
      if (formattedRoutes.length > 0 && !rotaSelecionada) {
        setRotaSelecionada(formattedRoutes[0].nome);
        moverParaRota(formattedRoutes[0].nome);
      }
    });
  }, []);

  function moverParaRota(nomeRota: string) {
    const rota = routes.find((r) => r.nome === nomeRota);
    if (rota) {
      const region = {
        latitude: rota.latitude,
        longitude: rota.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setMapPosition({ latitude: rota.latitude, longitude: rota.longitude });
      if (mapRef.current) {
        mapRef.current.animateToRegion(region, 1000);
      }
    } else if (location) {
      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setMapPosition(location.coords);
      if (mapRef.current) {
        mapRef.current.animateToRegion(region, 1000);
      }
    } else {
      Alert.alert("Localização não disponível.");
    }
  }

  function confirmarRota() {
    if (!rotaSelecionada) {
      Alert.alert("Nenhuma rota selecionada.");
      return;
    }
    const rota = routes.find((r) => r.nome === rotaSelecionada);
    if (!rota) {
      Alert.alert("A rota selecionada não está cadastrada.");
      return;
    }
    navigation.navigate("AssentosScreen", { rotaSelecionada: rota });
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
        <Marker coordinate={mapPosition} title="Destino da Rota" />
      </MapView>

      <View style={styles.bottomContainer}>
        <View style={styles.rotaSelector}>
          {routes.map(({ nome }) => (
            <TouchableOpacity
              key={nome}
              onPress={() => {
                setRotaSelecionada(nome);
                moverParaRota(nome);
              }}
              style={[
                styles.rotaButton,
                rotaSelecionada === nome && { backgroundColor: "#28a745" },
              ]}
            >
              <Text style={{ color: "white", fontSize: 14 }}>{nome}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={confirmarRota}
          style={[
            styles.confirmButton,
            !rotaSelecionada && { backgroundColor: "#6c757d" },
          ]}
          disabled={!rotaSelecionada}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            Confirmar {rotaSelecionada ?? ""}
          </Text>
        </TouchableOpacity>
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
  },
  rotaSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  rotaButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: "#007bff",
    marginHorizontal: 4,
  },
  confirmButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  tryAgainButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#007bff",
    borderRadius: 8,
  },
});
