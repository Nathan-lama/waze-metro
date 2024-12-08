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

export default function Home() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [markersCount, setMarkersCount] = useState<number>(0);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('prompt');
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const signalementTypes: SignalementType[] = [
    { id: 'controleur', emoji: '👮', label: 'Contrôleur' },
    { id: 'poule', emoji: '🐔', label: 'Poule égarée sur les rails' },
    { id: 'danseur', emoji: '💃', label: 'Danseur de breakdance' },
    { id: 'musicien', emoji: '🎸', label: 'Musicien du métro' },
    { id: 'retard', emoji: '⏰', label: 'Retard inhabituel' },
    { id: 'ventriloque', emoji: '🗣️', label: 'Ventriloque avec sa marionnette' },
    { id: 'magicien', emoji: '🎩', label: 'Magicien qui fait des tours' },
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      const map = L.map('mapid', {
        tap: false,
        attributionControl: false
      }).setView([45.764043, 4.835659], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      setMapInstance(map);

      // Demander la géolocalisation immédiatement après l'initialisation de la carte
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Position obtenue:", position);
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          map.setView([latitude, longitude], 15);

          const userMarker = L.marker([latitude, longitude], {
            icon: L.icon({
              iconUrl: "https://leafletjs.com/examples/custom-icons/leaf-green.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            })
          })
          .addTo(map)
          .bindPopup("Vous êtes ici")
          .openPopup();
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
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8]
      });

      stationsData.features.forEach((station: any) => {
        if (station.geometry && station.geometry.coordinates) {
          const [lng, lat] = station.geometry.coordinates[0];
          const name = station.properties.nom;

          L.marker([lat, lng], { 
            icon: stationIcon,
            zIndexOffset: 1000
          })
          .addTo(mapInstance)
          .bindTooltip(name, {
            permanent: true,
            direction: 'top',
            offset: [0, -8],
            className: 'station-label'
          });
        }
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
      
      // Trouver le type de signalement correspondant
      const signalementType = signalementTypes.find(t => t.id === m.type) || signalementTypes[0];
      
      // Créer un div pour l'icône personnalisée
      const iconHtml = `<div class="emoji-marker">${signalementType.emoji}</div>`;
      
      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'emoji-marker-container',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([m.lat, m.lng], { icon: customIcon })
        .addTo(markersLayerRef.current)
        .bindPopup(`${signalementType.emoji} ${signalementType.label}<br>Signalé à ${timeString}`);
    });
  };

  useEffect(() => {
    loadMarkers();
  }, [mapInstance]);

  const sendSignalement = async (type: string) => {
    if (!userLocation) {
      alert("Position utilisateur inconnue");
      return;
    }

    const res = await fetch('/api/markers', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        lat: userLocation[0], 
        lng: userLocation[1],
        type: type 
      })
    });

    if (!res.ok) {
      alert("Erreur lors de l'envoi du signalement");
      return;
    }

    setShowTypeDialog(false);
    alert("Signalement envoyé !");
    await loadMarkers();
  };

  return (
    <div className="relative w-screen h-screen">
      <div id="mapid" className="w-full h-full z-0" />

      <div className="absolute top-0 left-0 w-full px-4 py-3 bg-white/80 backdrop-blur-sm flex items-center justify-between z-50">
        <h1 className="text-sm font-bold text-gray-800">Contrôleurs TCL</h1>
        <div className="text-sm font-medium text-gray-700">Signalements : {markersCount}</div>
      </div>

      <button
        onClick={() => setShowTypeDialog(true)}
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
          <p className="text-xs mt-1">Paramètres > Confidentialité > Services de localisation</p>
        </div>
      )}
    </div>
  );
}
