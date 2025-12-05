import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.pm';
import 'leaflet.pm/dist/leaflet.pm.css';
import '../styles/MapEditor.css';
import { lineToGeoJSON, markerToStop, reorderStopsAlongLine, reindexStops } from '../utils/mapUtils';
import { ELURU_CENTER, TILE_LAYER_ATTRIBUTION, TILE_LAYER_URL } from '../constants/geo';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

const DEFAULT_CENTER = [ELURU_CENTER.lat, ELURU_CENTER.lng];

const MapEditor = ({ initialRoute = null, initialStops = [], onSave }) => {
  const mapNode = useRef(null);
  const mapInstance = useRef(null);
  const polylineLayer = useRef(null);
  const stopMarkers = useRef(new Map());
  const [routeGeom, setRouteGeom] = useState(initialRoute);
  const [stops, setStops] = useState(reindexStops(initialStops));
  const [nameEdits, setNameEdits] = useState({});
  const [error, setError] = useState('');

  const sortedStops = useMemo(() => reindexStops(stops), [stops]);

  const attachMarkerHandlers = (marker, stopId) => {
    marker.on('pm:dragend', () => {
      const { lat, lng } = marker.getLatLng();
      setStops((prev) =>
        reindexStops(
          prev.map((stop) => (stop.id === stopId ? { ...stop, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) } : stop))
        )
      );
    });

    marker.on('pm:remove', () => removeStop(stopId));

    marker.on('click', () => {
      setStops((prev) => {
        const current = prev.find((stop) => stop.id === stopId);
        const nextName = window.prompt('Stop name', current?.name || '') || current?.name;
        if (!nextName) return prev;
        const updated = prev.map((stop) => (stop.id === stopId ? { ...stop, name: nextName } : stop));
        marker.bindPopup(`<strong>${nextName}</strong>`);
        setNameEdits((prevNames) => ({ ...prevNames, [stopId]: nextName }));
        return updated;
      });
    });
  };

  const removeStop = (stopId) => {
    const marker = stopMarkers.current.get(stopId);
    if (marker) {
      marker.removeFrom(mapInstance.current);
      stopMarkers.current.delete(stopId);
    }
    setStops((prev) => reindexStops(prev.filter((stop) => stop.id !== stopId)));
  };

  const updateStopName = (stopId, name) => {
    setStops((prev) => prev.map((stop) => (stop.id === stopId ? { ...stop, name } : stop)));
    setNameEdits((prev) => ({ ...prev, [stopId]: name }));
    const marker = stopMarkers.current.get(stopId);
    if (marker) {
      marker.bindPopup(`<strong>${name}</strong>`);
    }
  };

  const addMarkerLayer = (stop) => {
    const marker = L.marker([stop.lat, stop.lng], { draggable: true });
    marker.bindPopup(`<strong>${stop.name}</strong>`);
    marker.addTo(mapInstance.current);
    stopMarkers.current.set(stop.id, marker);
    attachMarkerHandlers(marker, stop.id);
  };

  const handlePolylineUpdate = (layer) => {
    if (polylineLayer.current) {
      mapInstance.current.removeLayer(polylineLayer.current);
    }
    polylineLayer.current = layer;
    if (!polylineLayer.current.pm.enabled()) {
      polylineLayer.current.pm.enable();
    }
    setRouteGeom(lineToGeoJSON(layer));
    setStops((prev) => reorderStopsAlongLine(lineToGeoJSON(layer), prev));
  };

  const handleMarkerCreate = (layer) => {
    const name = window.prompt('Stop name', `Stop ${stops.length + 1}`) || `Stop ${stops.length + 1}`;
    const stop = markerToStop(layer, stops.length, name);
    layer.__stopId = stop.id;
    stopMarkers.current.set(stop.id, layer);
    attachMarkerHandlers(layer, stop.id);
    setStops((prev) => reorderStopsAlongLine(routeGeom, [...prev, stop]));
  };

  const initExistingData = () => {
    if (initialRoute && mapInstance.current) {
      const layer = L.polyline(initialRoute.coordinates.map(([lng, lat]) => [lat, lng]), {
        color: '#2563eb',
        weight: 4
      }).addTo(mapInstance.current);
      layer.pm.enable();
      handlePolylineUpdate(layer);
      mapInstance.current.fitBounds(layer.getBounds(), { padding: [24, 24] });
    }

    if (initialStops.length) {
      const normalizedStops = initialStops.map((stop, index) => ({
        ...stop,
        id: stop.id || stop._id || `stop-${index}-${stop.seq ?? ''}`
      }));
      normalizedStops.forEach(addMarkerLayer);
      setStops(reindexStops(normalizedStops));
    }
  };

  useEffect(() => {
    if (!mapNode.current || mapInstance.current) return;
    mapInstance.current = L.map(mapNode.current).setView(DEFAULT_CENTER, 14);

    L.tileLayer(TILE_LAYER_URL, {
      attribution: TILE_LAYER_ATTRIBUTION
    }).addTo(mapInstance.current);

    mapInstance.current.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawCircleMarker: false,
      drawMarker: true,
      drawRectangle: false,
      drawPolygon: false,
      drawPolyline: true,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true
    });

    mapInstance.current.on('pm:create', (event) => {
      if (event.shape === 'Line') {
        handlePolylineUpdate(event.layer);
      }
      if (event.shape === 'Marker') {
        handleMarkerCreate(event.layer);
      }
    });

    mapInstance.current.on('pm:remove', (event) => {
      const { layer } = event;
      if (layer === polylineLayer.current) {
        polylineLayer.current = null;
        setRouteGeom(null);
      } else if (layer.__stopId) {
        removeStop(layer.__stopId);
      }
    });

    initExistingData();

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
      stopMarkers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    setError('');
    if (!routeGeom || !routeGeom.coordinates || routeGeom.coordinates.length < 2) {
      setError('Draw a route polyline with at least two points.');
      return;
    }
    if (sortedStops.length < 2) {
      setError('Add at least two stops to save the route.');
      return;
    }
    const payloadStops = sortedStops.map((stop, index) => ({
      name: stop.name?.trim() || `Stop ${index + 1}`,
      lat: stop.lat,
      lng: stop.lng,
      seq: index
    }));
    onSave(routeGeom, payloadStops);
  };

  const handleClear = () => {
    if (polylineLayer.current) {
      polylineLayer.current.remove();
      polylineLayer.current = null;
    }
    stopMarkers.current.forEach((marker) => marker.remove());
    stopMarkers.current.clear();
    setRouteGeom(null);
    setStops([]);
    setError('');
  };

  const moveStop = (idx, direction) => {
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= sortedStops.length) {
      return;
    }
    const reordered = [...sortedStops];
    const [removed] = reordered.splice(idx, 1);
    reordered.splice(nextIdx, 0, removed);
    setStops(reindexStops(reordered, { sort: false }));
  };

  return (
    <div className="map-editor">
      <div className="map-editor__canvas" ref={mapNode} aria-label="Route map editor" />
      <aside className="map-editor__panel">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Stops ({sortedStops.length})</h3>
          <div className="space-x-2 text-xs text-slate-500">
            <button type="button" className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={handleClear}>
              Clear
            </button>
            <button type="button" className="rounded bg-brand px-3 py-1 text-xs text-white" onClick={handleSave}>
              Save Route
            </button>
          </div>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Use the polyline tool to draw the route, then drop markers for stops. Tap markers to rename or drag to
          reposition. Use the list to fine tune order & names before saving.
        </p>
        {error && <p className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>}
        <div className="map-editor__stop-list">
          {sortedStops.length === 0 && <p className="text-sm text-slate-500">Add stop markers to begin.</p>}
          {sortedStops.map((stop, index) => {
            const key = stop.id || stop._id || `stop-${index}`;
            return (
              <div key={key} className="map-editor__stop-row">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-orange-100">{index + 1}</span>
                  <input
                    className="flex-1 rounded border border-white/20 bg-slate-900/50 px-2 py-1 text-sm text-white"
                    value={nameEdits[stop.id] ?? stop.name}
                    onChange={(e) => updateStopName(stop.id, e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>
                    {Number.isFinite(stop.lat) ? Number(stop.lat).toFixed(4) : '—'}, {Number.isFinite(stop.lng) ? Number(stop.lng).toFixed(4) : '—'}
                  </span>
                  <div className="space-x-2">
                    <button
                      type="button"
                      className="text-brand"
                      onClick={() => moveStop(index, -1)}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-brand"
                      onClick={() => moveStop(index, 1)}
                      disabled={index === sortedStops.length - 1}
                    >
                      ↓
                    </button>
                    <button type="button" className="text-red-500" onClick={() => removeStop(stop.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
};

export default MapEditor;
