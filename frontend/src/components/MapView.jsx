import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const busIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const MapView = ({ busPosition, stopPosition }) => {
  const center = busPosition || stopPosition || { lat: 17.385, lng: 78.4867 };

  return (
    <MapContainer center={center} zoom={14} style={{ height: '320px', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {busPosition && (
        <Marker position={busPosition} icon={busIcon}>
          <Popup>Bus live location</Popup>
        </Marker>
      )}
      {stopPosition && (
        <Marker position={stopPosition}>
          <Popup>Your stop</Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default MapView;
