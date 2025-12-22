import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, ArrowDown, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.pm';
import 'leaflet.pm/dist/leaflet.pm.css';
import '../styles/MapEditor.css';
import { lineToGeoJSON, markerToStop, reorderStopsAlongLine, reindexStops } from '../utils/mapUtils';
import { ELURU_CENTER, TILE_LAYER_ATTRIBUTION, TILE_LAYER_URL } from '../constants/geo';

const DEFAULT_CENTER = [ELURU_CENTER.lat, ELURU_CENTER.lng];

const stopIcon = new L.Icon({
  iconUrl: '/markers/stop.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

const SortableStopRow = ({ stop, index, updateStopName, removeStop, moveStop }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
    position: 'relative'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition hover:border-indigo-300"
    >
      <div {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing">
        <GripVertical size={16} />
      </div>

      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600">
        {index + 1}
      </span>

      <input
        className="flex-1 bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
        value={stop.name}
        onChange={(e) => updateStopName(stop.id, e.target.value)}
        placeholder="Name stop..."
      />

      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
          onClick={() => removeStop(stop.id)}
          title="Remove stop"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const MapEditor = ({ initialRoute = null, initialStops = [], onSave, panelContainerRef }) => {
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
    const marker = L.marker([stop.lat, stop.lng], { draggable: true, icon: stopIcon });
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
    layer.setIcon(stopIcon);
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setStops((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newStops = arrayMove(items, oldIndex, newIndex);

        // Redraw Polyline to match new order
        if (polylineLayer.current) {
          polylineLayer.current.remove();
        }
        const latlngs = newStops.map((s) => [s.lat, s.lng]);
        if (latlngs.length > 1) {
          const newPolyline = L.polyline(latlngs, {
            color: '#2563eb',
            weight: 4
          }).addTo(mapInstance.current);
          newPolyline.pm.enable();
          polylineLayer.current = newPolyline;
          setRouteGeom(lineToGeoJSON(newPolyline));
        }

        return reindexStops(newStops, { sort: false });
      });
    }
  };

  const panelContent = (
    <div className="map-editor__panel-content space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Stops ({sortedStops.length})</h3>
        <div className="space-x-2 text-xs">
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
            onClick={handleSave}
            disabled={sortedStops.length < 2}
          >
            Save Route
          </button>
          <button
            type="button"
            className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100 disabled:opacity-50"
            onClick={() => {
              setStops((prev) => {
                const manualReindex = prev.slice().reverse().map((s, i) => ({ ...s, seq: i }));
                // Trigger polyline update
                if (polylineLayer.current) polylineLayer.current.remove();
                if (manualReindex.length > 1) {
                  const latlngs = manualReindex.map((s) => [s.lat, s.lng]);
                  const newPolyline = L.polyline(latlngs, { color: '#2563eb', weight: 4 }).addTo(mapInstance.current);
                  newPolyline.pm.enable();
                  polylineLayer.current = newPolyline;
                  setRouteGeom(lineToGeoJSON(newPolyline));
                }
                return manualReindex;
              });
            }}
            disabled={sortedStops.length < 2}
          >
            Reverse Stops
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Drag <GripVertical size={12} className="inline" /> to reorder. Click line to add stops.
      </p>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}

      <div className="space-y-2">
        {sortedStops.length === 0 && <div className="py-8 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-sm font-medium text-slate-500">No stops yet</p>
          <p className="text-xs text-slate-400">Click on the route line to add stops</p>
        </div>}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedStops}
            strategy={verticalListSortingStrategy}
          >
            {sortedStops.map((stop, index) => (
              <SortableStopRow
                key={stop.id}
                stop={stop}
                index={index}
                updateStopName={updateStopName}
                removeStop={removeStop}
              // Name map logic handled inside component via props
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div >
  );

  return (
    <div className="map-editor relative h-full w-full rounded-2xl overflow-hidden">
      <div className="map-editor__canvas h-full w-full" ref={mapNode} aria-label="Route map editor" />
      {/* If a panel ref is provided, portal the content there. Otherwise fallback to overlay (or hide) */}
      {panelContainerRef && panelContainerRef.current
        ? createPortal(panelContent, panelContainerRef.current)
        : null}
    </div>
  );
};

export default MapEditor;
