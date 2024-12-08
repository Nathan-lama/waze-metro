'use client';

import { useEffect, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import metroData from '../public/lyon_metro.json';
import stationsData from '../public/stations_metro.json'; // Importer les données des stations

type MarkerData = {
  id: number;
  lat: number;
  lng: number;
  type: string;
  timestamp: string;
};

type SignalementType = {
  id: string;
  emoji: string;
  label: string;
};

type StationChoice = {
  name: string;
  distance: number;
  position: [number, number];
};

type LineDirection = {
  name: string;
  stations: string[];
};

export default function Home() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [markersCount, setMarkersCount] = useState<number>(0);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('prompt');
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showStationDialog, setShowStationDialog] = useState(false);
  const [nearbyStations, setNearbyStations] = useState<StationChoice[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationChoice | null>(null);
  const signalementTypes: SignalementType[] = [
    { id: 'controleur', emoji: '👮', label: 'Contrôleur' },
    { id: 'poule', emoji: '🐔', label: 'Poule égarée sur les rails' },
  ];

  const [userCircle, setUserCircle] = useState<any>(null);
  const userMarkerRef = useRef<any>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [showDirectionDialog, setShowDirectionDialog] = useState(false);

  const updateUserLocation = (latitude: number, longitude: number, map: any) => {
    setUserLocation([latitude, longitude]);

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([latitude, longitude]);
    } else {
      const L = require('leaflet');
      userMarkerRef.current = L.marker([latitude, longitude], {
        icon: L.icon({
          iconUrl: "https://leafletjs.com/examples/custom-icons/leaf-green.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })
      })
      .addTo(map)
      .bindPopup("Vous êtes ici");
    }

    if (userCircle) {
      userCircle.setLatLng([latitude, longitude]);
    } else {
      const newCircle = L.circle([latitude, longitude], {
        radius: 200, // Rayon réduit à 200 mètres
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.1,
        weight: 1
      }).addTo(map);
      setUserCircle(newCircle);
    }

    map.setView([latitude, longitude], 17); // Changé de 15 à 17
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      const map = L.map('mapid', {
        tap: false,
        attributionControl: false
      }).setView([45.764043, 4.835659], 18); // Changé de 17 à 18

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      setMapInstance(map);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Position obtenue:", position);
          const { latitude, longitude } = position.coords;
          updateUserLocation(latitude, longitude, map);
          map.setView([latitude, longitude], 18); // Changé de 17 à 18
        },
        (error) => {
          console.log("Erreur de géolocalisation détaillée:", {
            code: error.code,
            message: error.message
          });
          
          let errorMessage = "Impossible d'obtenir votre position. ";
          switch (error.code) {
            case 1:
              errorMessage += "Veuillez autoriser la géolocalisation.";
              break;
            case 2:
              errorMessage += "Position indisponible.";
              break;
            case 3:
              errorMessage += "Délai d'attente dépassé.";
              break;
          }
          alert(errorMessage);
          setPermissionStatus('denied');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }, []);

  useEffect(() => {
    if (mapInstance) {
      const L = require('leaflet');

      const lineColors: { [key: string]: string } = {
        'A': 'red',
        'B': 'blue',
        'C': 'orange',
        'D': 'green',
      };

      const style = (feature: any) => {
        const lineCode = feature.properties.ligne;
        return {
          color: lineColors[lineCode] || 'black',
          weight: 4,
        };
      };

      L.geoJSON(metroData, { style }).addTo(mapInstance);

      const stationIcon = L.icon({
        iconUrl: '/station-icon.png',
        iconSize: [24, 24], // Augmenté de 16x16 à 24x24
        iconAnchor: [12, 12], // Ajusté pour le nouveau centre
        popupAnchor: [0, -12]
      });

      // Créer un groupe de stations avec leurs entrées
      const stationGroups: { [key: string]: { 
        center: { lat: number, lng: number },
        name: string,
        entrances: Array<[number, number]>
      } } = {};

      // Regrouper les stations par nom
      stationsData.features.forEach((station: any) => {
        if (station.geometry && station.geometry.coordinates) {
          const [lng, lat] = station.geometry.coordinates[0];
          const name = station.properties.nom;
          
          // Créer une clé unique pour chaque station (en utilisant le nom sans les détails)
          const baseStationName = name.split(' - ')[0];
          
          if (!stationGroups[baseStationName]) {
            stationGroups[baseStationName] = {
              center: { lat, lng }, // Premier point comme centre
              name: baseStationName,
              entrances: [[lng, lat]]
            };
          } else {
            stationGroups[baseStationName].entrances.push([lng, lat]);
            // Calculer le centre moyen de toutes les entrées
            const entrances = stationGroups[baseStationName].entrances;
            const center = entrances.reduce(
              (acc, [lng, lat]) => ({ lat: acc.lat + lat/entrances.length, lng: acc.lng + lng/entrances.length }), 
              { lat: 0, lng: 0 }
            );
            stationGroups[baseStationName].center = center;
          }
        }
      });

      // Afficher les stations
      Object.values(stationGroups).forEach(station => {
        // Ajouter le label central
        L.marker([station.center.lat, station.center.lng], {
          icon: L.divIcon({
            className: 'station-label',
            html: `<div>${station.name}</div>`,
            iconSize: [120, 20],
            iconAnchor: [60, 10]
          })
        }).addTo(mapInstance);

        // Ajouter les icônes pour chaque entrée
        station.entrances.forEach(([lng, lat]) => {
          L.marker([lat, lng], { 
            icon: stationIcon,
            zIndexOffset: 1000
          }).addTo(mapInstance);
        });
      });
    }
  }, [mapInstance]);

  const loadMarkers = async () => {
    if (!mapInstance || !markersLayerRef.current) return;
    const L = require('leaflet');

    const res = await fetch('/api/markers');
    if (!res.ok) {
      alert("Erreur lors du chargement des signalements.");
      return;
    }
    const data: MarkerData[] = await res.json();

    markersLayerRef.current.clearLayers();
    setMarkersCount(data.length);

    data.forEach(m => {
      const date = new Date(m.timestamp);
      const timeString = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const signalementType = signalementTypes.find(t => t.id === m.type) || signalementTypes[0];
      
      const iconHtml = `
        <div class="emoji-marker" style="
          font-size: 24px;
          background: white;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          border: 2px solid ${getMarkerColor(m.type)};
        ">
          ${signalementType.emoji}
        </div>
      `;
      
      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'emoji-marker-container',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      L.marker([m.lat, m.lng], { icon: customIcon })
        .addTo(markersLayerRef.current)
        .bindPopup(`
          <div style="text-align: center;">
            <span style="font-size: 1.5em;">${signalementType.emoji}</span>
            <br>
            <strong>${signalementType.label}</strong>
            <br>
            <small>Signalé à ${timeString}</small>
          </div>
        `);
    });
  };

  const getMarkerColor = (type: string): string => {
    switch (type) {
      case 'controleur':
        return '#ff4444';
      case 'poule':
        return '#ffaa00';
      case 'danseur':
        return '#ff44ff';
      case 'musicien':
        return '#44ff44';
      case 'retard':
        return '#ff0000';
      case 'ventriloque':
        return '#4444ff';
      case 'magicien':
        return '#aa44ff';
      default:
        return '#888888';
    }
  };

  useEffect(() => {
    loadMarkers();
  }, [mapInstance]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Rayon de la terre en mètres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const findNearbyStations = () => {
    if (!userLocation) return [];

    const stations = Object.values(stationsData.features)
      .map(station => {
        const [lng, lat] = station.geometry.coordinates[0];
        const distance = calculateDistance(userLocation[0], userLocation[1], lat, lng);
        return {
          name: station.properties.nom, // Utiliser le nom complet au lieu de le diviser
          distance,
          position: [lat, lng] as [number, number]
        };
      })
      .filter(station => station.distance <= 150)
      .sort((a, b) => a.distance - b.distance);

    return stations.length > 0 ? [stations[0]] : [];
  };

  const findLineDirections = (stationName: string): LineDirection[] => {
    console.log("Recherche des directions pour:", stationName);
    const metroLines = require('../public/metro_lines_lyon.json');
    const directions: LineDirection[] = [];

    Object.entries(metroLines).forEach(([lineName, stations]: [string, string[]]) => {
      console.log(`Recherche dans ${lineName}:`, stations);
      
      // Trouver la station qui contient le début du nom (plus flexible)
      const stationIndex = stations.findIndex(s => 
        s.toLowerCase().startsWith(stationName.toLowerCase().split(' ').slice(0, 3).join(' '))
      );
      
      if (stationIndex !== -1) {
        const lineNumber = lineName.split(' ')[1];
        
        directions.push(
          {
            name: `Ligne ${lineNumber} → ${stations[stations.length - 1]}`,
            stations: stations.slice(stationIndex)
          },
          {
            name: `Ligne ${lineNumber} → ${stations[0]}`,
            stations: stations.slice(0, stationIndex + 1).reverse()
          }
        );
      }
    });

    console.log("Directions trouvées:", directions);
    return directions;
  };

  const handleAddSignalement = () => {
    const stations = findNearbyStations();
    if (stations.length === 0) {
      alert("Aucune station à proximité (90m maximum)");
      return;
    }
    setNearbyStations(stations);
    setShowStationDialog(true);
  };

  const selectStation = (station: StationChoice) => {
    setSelectedStation(station);
    setShowStationDialog(false);
    setShowDirectionDialog(true);
  };

  const selectDirection = () => {
    setShowDirectionDialog(false);
    setShowTypeDialog(true);
  };

  const sendSignalement = async (type: string) => {
    if (!selectedStation) {
      alert("Aucune station sélectionnée");
      return;
    }

    const res = await fetch('/api/markers', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        lat: selectedStation.position[0],
        lng: selectedStation.position[1],
        type: type 
      })
    });

    if (!res.ok) {
      alert("Erreur lors de l'envoi du signalement");
      return;
    }

    setShowTypeDialog(false);
    setSelectedStation(null);
    alert("Signalement envoyé !");
    await loadMarkers();
  };

  const centerOnUser = () => {
    if (userLocation && mapInstance) {
      mapInstance.setView(userLocation, 17); // Changé de 15 à 17
    }
  };

  return (
    <div className="relative w-screen h-screen">
      <div id="mapid" className="w-full h-full z-0" />

      <div className="absolute top-0 left-0 w-full px-4 py-3 bg-white/80 backdrop-blur-sm flex items-center justify-between z-50">
        <h1 className="text-sm font-bold text-gray-800">Contrôleurs TCL</h1>
        <div className="text-sm font-medium text-gray-700">Signalements : {markersCount}</div>
      </div>

      <button
        onClick={handleAddSignalement}
        disabled={!userLocation}
        className={`absolute bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-50 ${
          userLocation ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
        } text-white text-2xl font-bold transition pointer-events-auto`}
      >
        +
      </button>

      <button
        onClick={loadMarkers}
        className="absolute bottom-[6rem] right-7 w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-green-600 hover:bg-green-700 text-white text-base font-bold z-50 transition pointer-events-auto"
      >
        ↻
      </button>

      <button
        onClick={centerOnUser}
        disabled={!userLocation}
        className={`absolute bottom-[6rem] left-7 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
          userLocation ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
        } text-white text-xl font-bold z-50 transition pointer-events-auto`}
      >
        📍
      </button>

      {/* Dialog de sélection de station */}
      {showStationDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold mb-4">Choisir une station</h2>
            <div className="flex flex-col gap-2">
              {nearbyStations.map((station) => (
                <button
                  key={station.name}
                  onClick={() => selectStation(station)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition"
                >
                  <span className="text-sm font-medium">{station.name}</span>
                  <span className="text-xs text-gray-500">{Math.round(station.distance)}m</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowStationDialog(false)}
              className="mt-4 w-full py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {showDirectionDialog && selectedStation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold mb-4">Choisir une direction</h2>
            <div className="flex flex-col gap-2">
              {findLineDirections(selectedStation.name).map((direction, index) => (
                <button
                  key={index}
                  onClick={selectDirection}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition"
                >
                  <span className="text-sm font-medium">{direction.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDirectionDialog(false)}
              className="mt-4 w-full py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {showTypeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold mb-4">Que souhaitez-vous signaler ?</h2>
            <div className="grid grid-cols-2 gap-3">
              {signalementTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => sendSignalement(type.id)}
                  className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition"
                >
                  <span className="text-2xl">{type.emoji}</span>
                  <span className="text-sm">{type.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTypeDialog(false)}
              className="mt-4 w-full py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {permissionStatus === 'denied' && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg shadow-md text-center">
          <p className="text-sm">Veuillez autoriser l'accès à votre position</p>
          <p class="text-xs mt-1">Paramètres > Confidentialité > Services de localisation</p>
        </div>
      )}
    </div>
  );
}
