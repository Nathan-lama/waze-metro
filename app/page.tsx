'use client';

import { useEffect, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

type MarkerData = {
  id: number;
  lat: number;
  lng: number;
  timestamp: string;
};

export default function Home() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [markersCount, setMarkersCount] = useState<number>(0);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const markersLayerRef = useRef<any>(null);

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
    }
  }, []);

  useEffect(() => {
    if (mapInstance && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        mapInstance.setView([latitude, longitude], 15);

        const L = require('leaflet');
        const userIcon = L.icon({
          iconUrl: "https://leafletjs.com/examples/custom-icons/leaf-green.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        });

        L.marker([latitude, longitude], { icon: userIcon })
          .addTo(mapInstance)
          .bindPopup("Vous êtes ici")
          .openPopup();
      }, () => {
        alert("Impossible de récupérer votre position.");
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

    const markerIcon = L.icon({
      iconUrl: "https://leafletjs.com/examples/custom-icons/leaf-red.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });

    data.forEach(m => {
      const date = new Date(m.timestamp);
      const timeString = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      L.marker([m.lat, m.lng], { icon: markerIcon })
        .addTo(markersLayerRef.current)
        .bindPopup("Signalement à " + timeString);
    });
  };

  useEffect(() => {
    loadMarkers();
  }, [mapInstance]);

  const sendSignalement = async () => {
    if (!userLocation) {
      alert("Position utilisateur inconnue");
      return;
    }

    const res = await fetch('/api/markers', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: userLocation[0], lng: userLocation[1] })
    });

    if (!res.ok) {
      alert("Erreur lors de l'envoi du signalement");
      return;
    }

    alert("Signalement envoyé !");
    await loadMarkers();
  };

  return (
    <div className="relative w-screen h-screen">
      {/* La carte avec z-0 pour être en arrière-plan */}
      <div id="mapid" className="w-full h-full z-0" />

      {/* Barre supérieure, au-dessus de la carte */}
      <div className="absolute top-0 left-0 w-full px-4 py-3 bg-white/80 backdrop-blur-sm flex items-center justify-between z-50">
        <h1 className="text-sm font-bold text-gray-800">Contrôleurs TCL</h1>
        <div className="text-sm font-medium text-gray-700">Signalements : {markersCount}</div>
      </div>

      {/* Bouton principal flottant (Signaler), toujours au-dessus de la carte */}
      <button
        onClick={sendSignalement}
        disabled={!userLocation}
        className={`absolute bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-50 ${
          userLocation ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
        } text-white text-2xl font-bold transition pointer-events-auto`}
      >
        +
      </button>

      {/* Bouton secondaire flottant (Recharger), juste au-dessus du principal */}
      <button
        onClick={loadMarkers}
        className="absolute bottom-[6rem] right-7 w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-green-600 hover:bg-green-700 text-white text-base font-bold z-50 transition pointer-events-auto"
      >
        ↻
      </button>
    </div>
  );
}
