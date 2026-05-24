import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
}

interface MapProps {
  markers?: MapMarker[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  style?: ViewStyle;
  showsUserLocation?: boolean;
}

export const Map = ({
  markers = [],
  initialRegion = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  style,
}: MapProps) => {
  const srcDoc = useMemo(() => {
    const markersJson = JSON.stringify(markers);
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>body{margin:0;padding:0}#map{height:100vh;width:100vw}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${initialRegion.latitude},${initialRegion.longitude}],13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
    ${markersJson}.forEach(function(m){
      var mk=L.marker([m.latitude,m.longitude]).addTo(map);
      if(m.title||m.description) mk.bindPopup('<b>'+(m.title||'')+'</b><br>'+(m.description||''));
    });
  </script>
</body>
</html>`;
  }, [markers, initialRegion]);

  return (
    <View style={[styles.container, style]}>
      <iframe
        srcDoc={srcDoc}
        title="Map"
        style={{ border: 'none', width: '100%', height: '100%', minHeight: 200 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
    width: '100%',
    minHeight: 200,
  },
});
